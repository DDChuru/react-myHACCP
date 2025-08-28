/**
 * iCleanVerification Service
 * 
 * Handles local cache management, status tracking, color coding, and notifications
 * for the iCleanVerification feature.
 */

import Storage from '../utils/storage';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  InspectionModel,
  LocalVerificationProgress,
  ScheduleGroupProgress,
  AreaItemProgress,
  VerificationStatus,
  StatusColorScheme,
  STATUS_COLORS,
  OfflineVerification,
  IVerificationService,
  CACHE_KEYS,
  SYNC_CONFIG,
  ScheduleFrequency,
  GroupedNotification,
  NotificationItem
} from '../types/iCleanVerification';

/**
 * Local Cache Status Tracking System
 * 
 * This service manages the progressive status tracking using Storage
 * and provides real-time status updates with color coding for the UI.
 */
export class VerificationService implements IVerificationService {
  private companyId: string;
  private userId: string;
  
  // Cache maps for full objects
  private scheduleCache: Map<string, any> = new Map();
  private areaCache: Map<string, any> = new Map();
  private inspectionHistoryCache: Map<string, boolean> = new Map();

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
    
    // Initialize caches on service creation
    this.initializeCaches();
  }

  // ============================================================================
  // CACHE INITIALIZATION
  // ============================================================================

  /**
   * Initialize all caches on service startup
   */
  private async initializeCaches(): Promise<void> {
    await Promise.all([
      this.initializeScheduleCache(),
      this.initializeAreaCache()
    ]);
  }

  /**
   * Initialize schedule cache from Storage or create defaults
   */
  private async initializeScheduleCache(): Promise<void> {
    try {
      // Check if schedules are already cached in Storage
      const cachedSchedules = await Storage.getItem(CACHE_KEYS.SCHEDULES);
      
      if (cachedSchedules) {
        const schedules = JSON.parse(cachedSchedules);
        Object.entries(schedules).forEach(([key, value]) => {
          this.scheduleCache.set(key, value);
        });
      } else {
        // Create default schedule objects matching ACS structure
        const defaultSchedules = {
          'daily': {
            id: 'daily',
            name: 'Daily',
            days: 1,
            hours: 24,
            cycleId: 1
          },
          'weekly': {
            id: 'weekly',
            name: 'Weekly',
            days: 7,
            hours: 168,
            cycleId: 2
          },
          'monthly': {
            id: 'monthly',
            name: 'Monthly',
            days: 30,
            hours: 720,
            cycleId: 3
          },
          'quarterly': {
            id: 'quarterly',
            name: 'Quarterly',
            days: 90,
            hours: 2160,
            cycleId: 4
          },
          'annually': {
            id: 'annually',
            name: 'Annually',
            days: 365,
            hours: 8760,
            cycleId: 5
          }
        };
        
        // Save to cache and Storage
        Object.entries(defaultSchedules).forEach(([key, value]) => {
          this.scheduleCache.set(key, value);
        });
        
        await Storage.setItem(CACHE_KEYS.SCHEDULES, JSON.stringify(defaultSchedules));
      }
    } catch (error) {
      console.error('[VerificationService] Error initializing schedule cache:', error);
    }
  }

  /**
   * Initialize area cache from Storage
   */
  private async initializeAreaCache(): Promise<void> {
    try {
      // Areas are cached per areaId
      const keys = await Storage.getAllKeys();
      const areaKeys = keys.filter(k => k.startsWith(CACHE_KEYS.AREAS));
      
      for (const key of areaKeys) {
        const areaData = await Storage.getItem(key);
        if (areaData) {
          const areaId = key.replace(CACHE_KEYS.AREAS, '');
          this.areaCache.set(areaId, JSON.parse(areaData));
        }
      }
    } catch (error) {
      console.error('[VerificationService] Error initializing area cache:', error);
    }
  }

  /**
   * Get full schedule object from cache
   */
  private getSchedule(scheduleId: string): any {
    return this.scheduleCache.get(scheduleId.toLowerCase()) || {
      id: scheduleId,
      name: scheduleId.charAt(0).toUpperCase() + scheduleId.slice(1),
      days: 1,
      hours: 24,
      cycleId: 1
    };
  }

  /**
   * Get full area object from cache or fetch it
   */
  private async getArea(areaId: string): Promise<any> {
    // Check cache first
    if (this.areaCache.has(areaId)) {
      return this.areaCache.get(areaId);
    }
    
    try {
      // Fetch from Firestore
      const areaDoc = await getDocs(
        query(
          collection(db, `companies/${this.companyId}/areas`),
          where('id', '==', areaId)
        )
      );
      
      if (!areaDoc.empty) {
        const areaData = areaDoc.docs[0].data();
        
        // Cache the area
        this.areaCache.set(areaId, areaData);
        await Storage.setItem(`${CACHE_KEYS.AREAS}${areaId}`, JSON.stringify(areaData));
        
        return areaData;
      }
    } catch (error) {
      console.error('[VerificationService] Error fetching area:', error);
    }
    
    // Return minimal area object if not found
    return { id: areaId };
  }

  /**
   * Check if this is the first inspection for an item
   */
  private async isFirstInspection(areaItemId: string): Promise<boolean> {
    // Check cache first
    if (this.inspectionHistoryCache.has(areaItemId)) {
      return !this.inspectionHistoryCache.get(areaItemId);
    }
    
    try {
      // Check Storage for history
      const historyKey = `${CACHE_KEYS.INSPECTION_HISTORY}${areaItemId}`;
      const hasHistory = await Storage.getItem(historyKey);
      
      if (hasHistory) {
        this.inspectionHistoryCache.set(areaItemId, true);
        return false;
      }
      
      // Check Firestore for any previous inspections
      const inspectionQuery = query(
        collection(db, `companies/${this.companyId}/inspections`),
        where('areaItemId', '==', areaItemId)
      );
      
      const snapshot = await getDocs(inspectionQuery);
      const hasInspections = !snapshot.empty;
      
      // Cache the result
      this.inspectionHistoryCache.set(areaItemId, hasInspections);
      if (hasInspections) {
        await Storage.setItem(historyKey, 'true');
      }
      
      return !hasInspections;
    } catch (error) {
      console.error('[VerificationService] Error checking first inspection:', error);
      return false;
    }
  }

  // ============================================================================
  // LOCAL CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get local verification progress from Storage
   * This is the primary source for UI status display
   */
  async getLocalProgress(areaId: string, forceRefresh: boolean = false): Promise<LocalVerificationProgress | null> {
    try {
      const key = `${CACHE_KEYS.PROGRESS}${areaId}`;
      
      // If force refresh, always fetch fresh data
      if (forceRefresh) {
        console.log('[iCleanService] Force refreshing data for area:', areaId);
        return this.initializeProgress(areaId);
      }
      
      const data = await Storage.getItem(key);
      
      if (!data) {
        // Initialize new progress if none exists
        return this.initializeProgress(areaId);
      }
      
      const progress = JSON.parse(data) as LocalVerificationProgress;
      
      // Check if data is from today
      const today = new Date().toISOString().split('T')[0];
      if (progress.date !== today) {
        // Reset for new day but preserve offline queue
        const offlineQueue = progress.offlineQueue || [];
        return this.initializeProgress(areaId, offlineQueue);
      }
      
      return progress;
    } catch (error) {
      console.error('Error getting local progress:', error);
      return null;
    }
  }

  /**
   * Force sync with Firestore to get latest data
   */
  async syncWithFirestore(areaId: string): Promise<LocalVerificationProgress | null> {
    try {
      console.log('[iCleanService] Syncing with Firestore for area:', areaId);
      
      // Force fetch fresh data from Firestore
      const progress = await this.initializeProgress(areaId);
      
      if (progress) {
        progress.syncStatus = 'synced';
        progress.lastModified = Date.now();
        await this.updateLocalProgress(areaId, progress);
      }
      
      return progress;
    } catch (error) {
      console.error('[iCleanService] Sync error:', error);
      return null;
    }
  }

  /**
   * Initialize progress structure for an area
   */
  private async initializeProgress(
    areaId: string, 
    existingQueue: OfflineVerification[] = []
  ): Promise<LocalVerificationProgress> {
    const areaItems = await this.fetchAreaItems(areaId);
    const grouped = this.groupItemsBySchedule(areaItems);
    
    // Cache the area data when initializing
    const areaData = await this.getArea(areaId);
    
    // Determine siteId - it may be different from areaId
    // Try to get it from the area data or use areaId as fallback
    const siteId = areaData?.siteId || areaData?.site?.id || areaId;
    
    const progress: LocalVerificationProgress = {
      areaId,
      siteId,  // Add siteId to progress
      date: new Date().toISOString().split('T')[0],
      scheduleGroups: {
        daily: this.createScheduleGroup(grouped.daily),
        weekly: this.createScheduleGroup(grouped.weekly),
        monthly: this.createScheduleGroup(grouped.monthly),
      },
      lastModified: Date.now(),
      syncStatus: 'pending',
      offlineQueue: existingQueue
    };
    
    await this.updateLocalProgress(areaId, progress);
    return progress;
  }

  /**
   * Update local progress in Storage
   */
  async updateLocalProgress(areaId: string, progress: LocalVerificationProgress): Promise<void> {
    try {
      const key = `${CACHE_KEYS.PROGRESS}${areaId}`;
      progress.lastModified = Date.now();
      await Storage.setItem(key, JSON.stringify(progress));
      
      // Trigger UI update through event emitter or state management
      this.notifyUIUpdate(areaId, progress);
    } catch (error) {
      console.error('Error updating local progress:', error);
      throw error;
    }
  }

  // ============================================================================
  // STATUS CALCULATION & COLOR CODING
  // ============================================================================

  /**
   * Calculate item status based on schedule and verification history
   * This determines the color coding in the UI
   */
  calculateItemStatus(item: AreaItemProgress): VerificationStatus {
    // If already verified today
    if (item.status === 'pass' || item.status === 'fail') {
      return item.status;
    }
    
    // Check if overdue
    if (item.isOverdue) {
      return 'overdue';
    }
    
    // Check if due today
    if (item.isDue) {
      return 'pending';
    }
    
    // Not due yet
    return 'pending';
  }

  /**
   * Get color scheme for status
   * Ensures high contrast for accessibility
   */
  getColorScheme(status: VerificationStatus): StatusColorScheme {
    return STATUS_COLORS[status];
  }

  /**
   * Calculate due status based on schedule frequency
   */
  calculateDueStatus(
    schedule: ScheduleFrequency, 
    lastVerified?: Date
  ): { isDue: boolean; isOverdue: boolean; dueDate: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // If never verified, it's due
    if (!lastVerified) {
      return {
        isDue: true,
        isOverdue: true,
        dueDate: today.toISOString().split('T')[0]
      };
    }
    
    const lastVerifiedDate = new Date(lastVerified);
    const daysSinceVerified = Math.floor(
      (today.getTime() - lastVerifiedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    let daysUntilDue = 0;
    
    switch (schedule) {
      case 'daily':
        daysUntilDue = 1;
        break;
      case 'weekly':
        daysUntilDue = 7;
        break;
      case 'monthly':
        daysUntilDue = 30;
        break;
      case 'quarterly':
        daysUntilDue = 90;
        break;
      case 'annually':
        daysUntilDue = 365;
        break;
    }
    
    const isDue = daysSinceVerified >= daysUntilDue;
    const isOverdue = daysSinceVerified > daysUntilDue;
    
    const dueDate = new Date(lastVerifiedDate);
    dueDate.setDate(dueDate.getDate() + daysUntilDue);
    
    return {
      isDue,
      isOverdue,
      dueDate: dueDate.toISOString().split('T')[0]
    };
  }

  // ============================================================================
  // VERIFICATION OPERATIONS
  // ============================================================================

  /**
   * Verify a single item
   */
  async verifyItem(
    itemId: string, 
    status: 'pass' | 'fail', 
    details?: Partial<InspectionModel>
  ): Promise<void> {
    const areaId = details?.areaId || ''; // Get from context (fixed: was using siteId incorrectly)
    const progress = await this.getLocalProgress(areaId);
    
    if (!progress) return;
    
    // Find the item to get its details
    let foundItem: AreaItemProgress | null = null;
    let scheduleId: string = '';
    
    // Update item status in local cache
    const updateItemInGroup = (group: ScheduleGroupProgress, schedule: string) => {
      const item = group.items.find(i => i.areaItemId === itemId);
      if (item) {
        foundItem = item;
        scheduleId = schedule;
        item.status = status;
        item.verifiedAt = Date.now();
        item.isAutoCompleted = false;
        
        if (status === 'fail' && details?.notes) {
          item.failureReason = details.notes;
        }
        
        // Update group counts
        group.completedCount = group.items.filter(i => 
          i.status === 'pass' || i.status === 'fail'
        ).length;
        group.failedCount = group.items.filter(i => i.status === 'fail').length;
        group.completionPercentage = (group.completedCount / group.totalCount) * 100;
        group.lastVerifiedAt = Date.now();
        
        return true;
      }
      return false;
    };
    
    // Update in appropriate schedule group
    if (!updateItemInGroup(progress.scheduleGroups.daily, 'daily')) {
      if (!updateItemInGroup(progress.scheduleGroups.weekly, 'weekly')) {
        updateItemInGroup(progress.scheduleGroups.monthly, 'monthly');
      }
    }
    
    // Get cached schedule and area objects
    const schedule = details?.schedule || this.getSchedule(scheduleId || details?.scheduleId || 'daily');
    const area = details?.area || await this.getArea(areaId);
    
    // Check if this is the first inspection
    const firstInspection = details?.firstInspection !== undefined 
      ? details.firstInspection 
      : await this.isFirstInspection(itemId);
    
    // Create inspection record for offline queue (matching ACS structure)
    const inspection: Partial<InspectionModel> = {
      // Critical: id field is the areaItemId for reporting
      id: itemId,
      areaItemId: itemId,  // Keep for backwards compatibility
      
      // Location references with full objects
      areaId: areaId,
      siteId: details?.siteId || progress?.siteId || areaId,  // Site might be different from area
      area: area,  // Use cached/fetched full area object
      
      // Item details
      itemDescription: details?.itemDescription || foundItem?.itemName,
      
      // Status fields (match ACS format)
      status,  // 'pass' or 'fail' (lowercase)
      lastStatus: status === 'pass' ? 'Pass' : 'Fail',  // Capitalized
      scheduleStatus: status === 'pass' ? 'Pass' : 'Fail',
      
      // User information
      verifiedBy: this.userId,
      user: details?.user,  // Include full user object if provided
      
      // Timestamps
      date: new Date().toISOString(),
      verifiedAt: Timestamp.now(),
      
      // Failure details
      reasonForFailure: status === 'fail' ? (details?.notes || details?.reasonForFailure) : undefined,
      actionTaken: details?.actionTaken,
      notes: details?.notes,
      
      // Schedule information with full object
      schedule: schedule,  // Use cached/provided full schedule object
      scheduleId: scheduleId || details?.scheduleId,
      
      // Metadata
      companyId: this.companyId,
      createdBy: this.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      
      // Flags (with proper firstInspection check)
      firstInspection: firstInspection,
      deleted: false,
      serverInspection: true,
      
      // Score
      scoreWeight: details?.scoreWeight ?? 1,
      
      // Mobile sync
      iCleanerSyncId: this.generateLocalId(),
      syncedAt: undefined,  // Will be set when synced
      deviceId: 'mobile-app',
      
      // Don't spread all details to avoid overwriting our carefully set values
      signatures: details?.signature,
      supervisorApproval: details?.supervisorApproval,
      photos: details?.photos,
      issues: details?.issues,
      correctiveActions: details?.correctiveActions
    };
    
    // Add to offline queue
    const offlineVerification: OfflineVerification = {
      id: this.generateLocalId(),
      inspection,
      createdAt: Date.now(),
      retryCount: 0,
      photos: []
    };
    
    progress.offlineQueue.push(offlineVerification);
    progress.syncStatus = 'pending';
    
    // Save updated progress
    await this.updateLocalProgress(areaId, progress);
    
    // Attempt to sync if online
    if (await this.isOnline()) {
      this.syncOfflineVerifications();
    }
  }

  /**
   * Complete inspection with auto-pass for daily items
   */
  async completeInspection(areaId: string, autoPassDailyItems: boolean): Promise<void> {
    const progress = await this.getLocalProgress(areaId);
    if (!progress) return;
    
    const batch = writeBatch(db);
    const autoPassedIds: string[] = [];
    const manuallyVerifiedIds: string[] = [];
    
    // Get cached area and schedule objects
    const area = await this.getArea(areaId);
    const dailySchedule = this.getSchedule('daily');
    
    // Process daily items for auto-completion
    if (autoPassDailyItems) {
      for (const item of progress.scheduleGroups.daily.items) {
        if (item.status === 'pending' && item.isDue) {
          // Check if this is the first inspection for this item
          const isFirst = await this.isFirstInspection(item.areaItemId);
          
          // Auto-pass this item
          item.status = 'pass';
          item.verifiedAt = Date.now();
          item.isAutoCompleted = true;
          autoPassedIds.push(item.areaItemId);
          
          // Mark as inspected in cache
          this.inspectionHistoryCache.set(item.areaItemId, true);
          await Storage.setItem(`${CACHE_KEYS.INSPECTION_HISTORY}${item.areaItemId}`, 'true');
          
          // Create inspection record (matching ACS structure)
          const inspectionRef = doc(collection(db, `companies/${this.companyId}/inspections`));
          batch.set(inspectionRef, {
            // Critical: id is the areaItemId for reporting
            id: item.areaItemId,
            areaItemId: item.areaItemId,  // Keep for backwards compatibility
            
            // Location references with full objects
            areaId: areaId,
            siteId: progress.siteId || areaId,
            area: area,  // Full area object
            
            // Item details
            itemDescription: item.itemName,
            
            // Status fields (ACS format)
            status: 'pass',
            lastStatus: 'Pass',
            scheduleStatus: 'Pass',
            
            // User information
            verifiedBy: this.userId,
            
            // Timestamps
            date: new Date().toISOString(),
            verifiedAt: Timestamp.now(),
            
            // Schedule information with full object
            scheduleId: 'daily',  // Auto-pass is for daily items
            schedule: dailySchedule,  // Full schedule object
            
            // Metadata
            companyId: this.companyId,
            createdBy: this.userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            
            // Flags (with proper first inspection check)
            firstInspection: isFirst,
            deleted: false,
            serverInspection: true,
            
            // Score
            scoreWeight: 1,
            
            // Mobile sync
            iCleanerSyncId: this.generateLocalId(),
            deviceId: 'mobile-app',
            
            // Auto-completion tracking
            autoCompletionDetails: {
              dailyItemsAutoPassed: [item.areaItemId],
              manuallyVerified: [],
              completedAt: Timestamp.now()
            }
          });
        } else if (item.status === 'pass' || item.status === 'fail') {
          manuallyVerifiedIds.push(item.areaItemId);
        }
      }
    }
    
    // Update progress counts
    this.recalculateGroupCounts(progress.scheduleGroups.daily);
    
    // Save to local cache
    await this.updateLocalProgress(areaId, progress);
    
    // Commit batch to Firestore
    try {
      await batch.commit();
      progress.syncStatus = 'synced';
      await this.updateLocalProgress(areaId, progress);
    } catch (error) {
      console.error('Error completing inspection:', error);
      progress.syncStatus = 'error';
      await this.updateLocalProgress(areaId, progress);
    }
  }

  // ============================================================================
  // NOTIFICATION INTEGRATION
  // ============================================================================

  /**
   * Generate notifications based on current status
   */
  generateStatusNotifications(progress: LocalVerificationProgress): GroupedNotification {
    const items: NotificationItem[] = [];
    
    // Process all schedule groups
    const processGroup = (group: ScheduleGroupProgress, schedule: string) => {
      for (const item of group.items) {
        if (item.isDue || item.isOverdue) {
          items.push({
            areaItemId: item.areaItemId,
            itemName: item.itemName,
            areaName: progress.areaId, // Would need area name from context
            status: item.status,
            priority: item.isOverdue ? 'high' : 'medium',
            dueIn: this.calculateDueIn(item)
          });
        }
      }
    };
    
    processGroup(progress.scheduleGroups.daily, 'daily');
    processGroup(progress.scheduleGroups.weekly, 'weekly');
    processGroup(progress.scheduleGroups.monthly, 'monthly');
    
    return {
      id: this.generateLocalId(),
      siteId: '', // Would need from context
      areaId: progress.areaId,
      scheduledFor: new Date(),
      items,
      summary: {
        totalItems: items.length,
        pendingCount: items.filter(i => i.status === 'pending').length,
        overdueCount: items.filter(i => i.status === 'overdue').length,
        completedToday: this.countCompletedToday(progress),
        failuresRequiringAttention: this.countFailures(progress)
      },
      status: 'scheduled'
    };
  }

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================

  /**
   * Sync offline verifications to Firestore
   */
  async syncOfflineVerifications(): Promise<void> {
    const keys = await Storage.getAllKeys();
    const progressKeys = keys.filter(k => k.startsWith(CACHE_KEYS.PROGRESS));
    
    for (const key of progressKeys) {
      const progressData = await Storage.getItem(key);
      if (!progressData) continue;
      
      const progress = JSON.parse(progressData) as LocalVerificationProgress;
      
      if (progress.offlineQueue.length === 0) continue;
      
      progress.syncStatus = 'syncing';
      await Storage.setItem(key, JSON.stringify(progress));
      
      // Process queue in batches
      const batchSize = SYNC_CONFIG.BATCH_SIZE;
      const batches = this.chunkArray(progress.offlineQueue, batchSize);
      
      for (const batch of batches) {
        try {
          await this.syncBatch(batch);
          // Remove synced items from queue
          progress.offlineQueue = progress.offlineQueue.filter(
            item => !batch.find(b => b.id === item.id)
          );
        } catch (error) {
          console.error('Batch sync failed:', error);
          // Increment retry count for failed items
          batch.forEach(item => {
            const queueItem = progress.offlineQueue.find(q => q.id === item.id);
            if (queueItem) {
              queueItem.retryCount++;
              queueItem.lastError = error.message;
            }
          });
        }
      }
      
      progress.syncStatus = progress.offlineQueue.length === 0 ? 'synced' : 'error';
      await Storage.setItem(key, JSON.stringify(progress));
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async fetchAreaItems(areaId: string): Promise<any[]> {
    try {
      console.log('[iCleanService] Fetching areaItems for area:', areaId);
      
      // Fetch from Firestore (company-scoped collection)
      const q = query(
        collection(db, `companies/${this.companyId}/areaItems`),
        where('areaId', '==', areaId)
        // Removed isActive filter - may not exist in your data
      );
      
      console.log('[iCleanService] Query path:', `companies/${this.companyId}/areaItems where areaId == ${areaId}`);
      
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('[iCleanService] AreaItems loaded:', items.length);
      
      // Debug: Log first item structure to understand the data
      if (items.length > 0) {
        console.log('[iCleanService] Sample item structure:', JSON.stringify(items[0], null, 2));
        // Check what fields might indicate frequency
        const sampleItem = items[0];
        console.log('[iCleanService] Potential frequency fields:', {
          frequency: sampleItem.frequency,
          schedule: sampleItem.schedule,
          type: sampleItem.type,
          interval: sampleItem.interval,
          cleaningFrequency: sampleItem.cleaningFrequency,
          scheduleFrequency: sampleItem.scheduleFrequency
        });
      }
      
      // If no items found, check if there's any data in the collection
      if (items.length === 0) {
        console.log('[iCleanService] No items found for this area. Checking collection...');
        const allItemsSnapshot = await getDocs(collection(db, `companies/${this.companyId}/areaItems`));
        console.log('[iCleanService] Total items in collection:', allItemsSnapshot.size);
        if (allItemsSnapshot.size > 0) {
          console.log('[iCleanService] Sample item data:', allItemsSnapshot.docs[0].data());
          
          // TEMPORARY: Add mock data for testing UI
          console.log('[iCleanService] Adding mock data for UI testing...');
          return [
            { id: 'mock1', itemName: 'Floor Cleaning', frequency: 'daily', sciDocumentId: 'sci1' },
            { id: 'mock2', itemName: 'Equipment Sanitization', frequency: 'daily', sciDocumentId: 'sci2' },
            { id: 'mock3', itemName: 'Deep Clean Refrigeration', frequency: 'weekly', sciDocumentId: 'sci3' },
            { id: 'mock4', itemName: 'Ventilation System Check', frequency: 'monthly', sciDocumentId: 'sci4' },
          ];
        }
      }
      
      return items;
    } catch (error) {
      console.error('[iCleanService] Error fetching area items:', error);
      return [];
    }
  }

  private groupItemsBySchedule(items: any[]): {
    daily: any[];
    weekly: any[];
    monthly: any[];
  } {
    console.log('[iCleanService] Grouping items by schedule...');
    
    const grouped = {
      daily: items.filter(i => {
        const freq = (i.frequency || i.schedule || i.scheduleFrequency || '').toLowerCase();
        return freq === 'daily' || freq === 'day' || freq === 'd';
      }),
      weekly: items.filter(i => {
        const freq = (i.frequency || i.schedule || i.scheduleFrequency || '').toLowerCase();
        return freq === 'weekly' || freq === 'week' || freq === 'w';
      }),
      monthly: items.filter(i => {
        const freq = (i.frequency || i.schedule || i.scheduleFrequency || '').toLowerCase();
        return freq === 'monthly' || freq === 'month' || freq === 'm';
      })
    };
    
    // If no items matched any frequency, put them all in daily as default
    const totalGrouped = grouped.daily.length + grouped.weekly.length + grouped.monthly.length;
    if (totalGrouped === 0 && items.length > 0) {
      console.log('[iCleanService] No frequency field found, defaulting all items to daily');
      grouped.daily = items;
    }
    
    console.log('[iCleanService] Grouped items:', {
      daily: grouped.daily.length,
      weekly: grouped.weekly.length,
      monthly: grouped.monthly.length,
      total: items.length
    });
    
    return grouped;
  }

  private createScheduleGroup(items: any[]): ScheduleGroupProgress {
    const areaItems: AreaItemProgress[] = items.map(item => {
      const dueStatus = this.calculateDueStatus(
        item.frequency || item.schedule || item.scheduleFrequency, 
        item.lastInspectionDate || item.lastVerified
      );
      
      // Use itemDescription as the display name
      const name = item.itemDescription || item.description || item.itemName || item.name || item.title || 'Unnamed Item';
      
      return {
        areaItemId: item.id,
        itemName: name,
        sciReference: item.sciDocumentId || item.sciDocument || item.sciId,
        status: 'pending' as VerificationStatus,
        isAutoCompleted: false,
        photoCount: 0,
        isDue: dueStatus.isDue,
        isOverdue: dueStatus.isOverdue,
        dueDate: dueStatus.dueDate,
        frequency: item.frequency || item.schedule || item.scheduleFrequency || 'daily'
      };
    });
    
    return {
      items: areaItems,
      totalCount: areaItems.length,
      completedCount: 0,
      autoCompletedCount: 0,
      failedCount: 0,
      completionPercentage: 0
    };
  }

  private recalculateGroupCounts(group: ScheduleGroupProgress): void {
    group.completedCount = group.items.filter(i => 
      i.status === 'pass' || i.status === 'fail'
    ).length;
    group.autoCompletedCount = group.items.filter(i => i.isAutoCompleted).length;
    group.failedCount = group.items.filter(i => i.status === 'fail').length;
    group.completionPercentage = group.totalCount > 0 
      ? (group.completedCount / group.totalCount) * 100 
      : 0;
  }

  private notifyUIUpdate(areaId: string, progress: LocalVerificationProgress): void {
    // This would emit an event or update state management
    // Implementation depends on state management solution
    console.log('UI Update for area:', areaId, progress);
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async isOnline(): Promise<boolean> {
    // Check network connectivity
    // React Native: Use NetInfo
    return true; // Placeholder
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async syncBatch(batch: OfflineVerification[]): Promise<void> {
    const firestoreBatch = writeBatch(db);
    
    for (const item of batch) {
      const docRef = doc(collection(db, `companies/${this.companyId}/inspections`));
      firestoreBatch.set(docRef, item.inspection);
    }
    
    await firestoreBatch.commit();
  }

  private calculateDueIn(item: AreaItemProgress): string {
    const now = new Date();
    const dueDate = new Date(item.dueDate);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`;
    } else if (diffDays === 0) {
      return 'due today';
    } else {
      return `due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    }
  }

  private countCompletedToday(progress: LocalVerificationProgress): number {
    const todayStart = new Date().setHours(0, 0, 0, 0);
    let count = 0;
    
    const countInGroup = (group: ScheduleGroupProgress) => {
      count += group.items.filter(i => 
        i.verifiedAt && i.verifiedAt >= todayStart
      ).length;
    };
    
    countInGroup(progress.scheduleGroups.daily);
    countInGroup(progress.scheduleGroups.weekly);
    countInGroup(progress.scheduleGroups.monthly);
    
    return count;
  }

  private countFailures(progress: LocalVerificationProgress): number {
    let count = 0;
    count += progress.scheduleGroups.daily.failedCount;
    count += progress.scheduleGroups.weekly.failedCount;
    count += progress.scheduleGroups.monthly.failedCount;
    return count;
  }

  // Additional required methods from interface
  async loadAreaItems(siteId: string, areaId: string): Promise<AreaItemProgress[]> {
    const progress = await this.getLocalProgress(areaId);
    if (!progress) return [];
    
    const allItems: AreaItemProgress[] = [
      ...progress.scheduleGroups.daily.items,
      ...progress.scheduleGroups.weekly.items,
      ...progress.scheduleGroups.monthly.items
    ];
    
    return allItems;
  }

  async clearLocalProgress(areaId: string): Promise<void> {
    const key = `${CACHE_KEYS.PROGRESS}${areaId}`;
    await Storage.removeItem(key);
  }

  async getQueuedVerifications(): Promise<OfflineVerification[]> {
    const keys = await Storage.getAllKeys();
    const progressKeys = keys.filter(k => k.startsWith(CACHE_KEYS.PROGRESS));
    
    let allQueued: OfflineVerification[] = [];
    
    for (const key of progressKeys) {
      const data = await Storage.getItem(key);
      if (data) {
        const progress = JSON.parse(data) as LocalVerificationProgress;
        allQueued = [...allQueued, ...progress.offlineQueue];
      }
    }
    
    return allQueued;
  }

  async retryFailedSync(verificationId: string): Promise<void> {
    const queued = await this.getQueuedVerifications();
    const item = queued.find(q => q.id === verificationId);
    
    if (item && item.retryCount < SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
      await this.syncBatch([item]);
    }
  }
}