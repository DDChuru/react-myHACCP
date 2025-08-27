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

  constructor(companyId: string, userId: string) {
    this.companyId = companyId;
    this.userId = userId;
  }

  // ============================================================================
  // LOCAL CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get local verification progress from Storage
   * This is the primary source for UI status display
   */
  async getLocalProgress(areaId: string): Promise<LocalVerificationProgress | null> {
    try {
      const key = `${CACHE_KEYS.PROGRESS}${areaId}`;
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
   * Initialize progress structure for an area
   */
  private async initializeProgress(
    areaId: string, 
    existingQueue: OfflineVerification[] = []
  ): Promise<LocalVerificationProgress> {
    const areaItems = await this.fetchAreaItems(areaId);
    const grouped = this.groupItemsBySchedule(areaItems);
    
    const progress: LocalVerificationProgress = {
      areaId,
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
    const areaId = details?.siteId || ''; // Get from context
    const progress = await this.getLocalProgress(areaId);
    
    if (!progress) return;
    
    // Update item status in local cache
    const updateItemInGroup = (group: ScheduleGroupProgress) => {
      const item = group.items.find(i => i.areaItemId === itemId);
      if (item) {
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
      }
    };
    
    // Update in appropriate schedule group
    updateItemInGroup(progress.scheduleGroups.daily);
    updateItemInGroup(progress.scheduleGroups.weekly);
    updateItemInGroup(progress.scheduleGroups.monthly);
    
    // Create inspection record for offline queue
    const inspection: Partial<InspectionModel> = {
      areaItemId: itemId,
      siteId: areaId,
      status,
      verifiedBy: this.userId,
      verifiedAt: Timestamp.now(),
      companyId: this.companyId,
      createdBy: this.userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...details
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
    
    // Process daily items for auto-completion
    if (autoPassDailyItems) {
      for (const item of progress.scheduleGroups.daily.items) {
        if (item.status === 'pending' && item.isDue) {
          // Auto-pass this item
          item.status = 'pass';
          item.verifiedAt = Date.now();
          item.isAutoCompleted = true;
          autoPassedIds.push(item.areaItemId);
          
          // Create inspection record
          const inspectionRef = doc(collection(db, `companies/${this.companyId}/inspections`));
          batch.set(inspectionRef, {
            areaItemId: item.areaItemId,
            siteId: areaId,
            status: 'pass',
            verifiedBy: this.userId,
            verifiedAt: Timestamp.now(),
            companyId: this.companyId,
            createdBy: this.userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
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
    // Fetch from Firestore
    const q = query(
      collection(db, `companies/${this.companyId}/areaItems`),
      where('areaId', '==', areaId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private groupItemsBySchedule(items: any[]): {
    daily: any[];
    weekly: any[];
    monthly: any[];
  } {
    return {
      daily: items.filter(i => i.frequency === 'daily'),
      weekly: items.filter(i => i.frequency === 'weekly'),
      monthly: items.filter(i => i.frequency === 'monthly')
    };
  }

  private createScheduleGroup(items: any[]): ScheduleGroupProgress {
    const areaItems: AreaItemProgress[] = items.map(item => {
      const dueStatus = this.calculateDueStatus(item.frequency, item.lastInspectionDate);
      
      return {
        areaItemId: item.id,
        itemName: item.itemName,
        sciReference: item.sciDocumentId,
        status: 'pending' as VerificationStatus,
        isAutoCompleted: false,
        photoCount: 0,
        isDue: dueStatus.isDue,
        isOverdue: dueStatus.isOverdue,
        dueDate: dueStatus.dueDate
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