import { Platform } from 'react-native';
import Storage from '../utils/storage';
import NetInfo from '@react-native-community/netinfo';
import { 
  enableNetwork, 
  disableNetwork, 
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { db } from '../firebase';
import { imageUploadQueue } from './imageUploadQueue';

// Keys for Storage
const OFFLINE_QUEUE_KEY = '@offline_queue';
const PENDING_INSPECTIONS_KEY = '@pending_inspections';
const PENDING_ISSUES_KEY = '@pending_issues';
const SYNC_STATUS_KEY = '@sync_status';

export interface OfflineQueueItem {
  id: string;
  type: 'inspection' | 'issue' | 'update';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
  companyId: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingItems: number;
  syncing: boolean;
  errors: string[];
}

class OfflineService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeOfflinePersistence();
    this.setupNetworkListener();
  }

  /**
   * Initialize Firebase offline persistence
   */
  private async initializeOfflinePersistence() {
    // Skip persistence on web SSR
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    
    try {
      // Enable offline persistence for Firestore
      await enableIndexedDbPersistence(db, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      });
      console.log('✅ Firebase offline persistence enabled');
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('⚠️ Offline persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support offline persistence
        console.warn('⚠️ Offline persistence not supported in this browser');
      } else {
        console.error('❌ Error enabling offline persistence:', err);
      }
    }
  }

  /**
   * Setup network connectivity listener
   */
  private setupNetworkListener() {
    // Skip NetInfo on web SSR
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      return;
    }
    
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      console.log(`📡 Network status: ${this.isOnline ? 'Online' : 'Offline'}`);

      // If we just came back online, trigger sync
      if (wasOffline && this.isOnline) {
        console.log('🔄 Network restored, starting sync...');
        this.syncOfflineData();
        // Also process pending image uploads
        imageUploadQueue.processPendingUploads();
      }

      // Update Firebase network state
      if (this.isOnline) {
        enableNetwork(db);
      } else {
        disableNetwork(db);
      }

      // Notify listeners
      this.notifyListeners();
    });
  }

  /**
   * Queue an operation for offline execution
   */
  async queueOfflineOperation(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const newItem: OfflineQueueItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        retryCount: 0
      };

      queue.push(newItem);
      await Storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      console.log(`📥 Queued offline operation: ${item.type}/${item.action}`);
      
      // Store the actual data based on type
      if (item.type === 'inspection') {
        await this.storePendingInspection(newItem);
      } else if (item.type === 'issue') {
        await this.storePendingIssue(newItem);
      }

      this.notifyListeners();

      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncOfflineData();
      }
    } catch (error) {
      console.error('❌ Error queuing offline operation:', error);
      throw error;
    }
  }

  /**
   * Store pending inspection locally
   */
  private async storePendingInspection(item: OfflineQueueItem) {
    try {
      const pendingInspections = await this.getPendingInspections();
      pendingInspections[item.id] = item.data;
      await Storage.setItem(PENDING_INSPECTIONS_KEY, JSON.stringify(pendingInspections));
    } catch (error) {
      console.error('Error storing pending inspection:', error);
    }
  }

  /**
   * Store pending issue locally
   */
  private async storePendingIssue(item: OfflineQueueItem) {
    try {
      const pendingIssues = await this.getPendingIssues();
      if (!pendingIssues[item.data.inspectionId]) {
        pendingIssues[item.data.inspectionId] = [];
      }
      pendingIssues[item.data.inspectionId].push(item.data);
      await Storage.setItem(PENDING_ISSUES_KEY, JSON.stringify(pendingIssues));
    } catch (error) {
      console.error('Error storing pending issue:', error);
    }
  }

  /**
   * Get offline queue
   */
  async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    try {
      const queueJson = await Storage.getItem(OFFLINE_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Get pending inspections
   */
  async getPendingInspections(): Promise<Record<string, any>> {
    try {
      const json = await Storage.getItem(PENDING_INSPECTIONS_KEY);
      return json ? JSON.parse(json) : {};
    } catch (error) {
      console.error('Error getting pending inspections:', error);
      return {};
    }
  }

  /**
   * Get pending issues for an inspection
   */
  async getPendingIssues(): Promise<Record<string, any[]>> {
    try {
      const json = await Storage.getItem(PENDING_ISSUES_KEY);
      return json ? JSON.parse(json) : {};
    } catch (error) {
      console.error('Error getting pending issues:', error);
      return {};
    }
  }

  /**
   * Sync offline data when connection is restored
   */
  async syncOfflineData(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) {
      return;
    }

    this.syncInProgress = true;
    this.notifyListeners();

    try {
      const queue = await this.getOfflineQueue();
      const errors: string[] = [];

      console.log(`🔄 Syncing ${queue.length} offline items...`);

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          // Remove successfully processed item
          await this.removeFromQueue(item.id);
        } catch (error: any) {
          console.error(`❌ Error syncing item ${item.id}:`, error);
          errors.push(`${item.type}/${item.action}: ${error.message}`);
          
          // Increment retry count
          item.retryCount++;
          
          // If max retries reached, move to dead letter queue
          if (item.retryCount >= 3) {
            await this.moveToDeadLetterQueue(item);
            await this.removeFromQueue(item.id);
          }
        }
      }

      // Update sync status
      await this.updateSyncStatus({
        lastSync: new Date(),
        errors
      });

      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  /**
   * Process a single queue item
   */
  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    // This will be implemented by each specific service
    // For now, we'll import and use the existing services
    const { createSelfInspection, updateSelfInspection, addIssueToInspection } = 
      await import('./selfInspectionService');

    switch (item.type) {
      case 'inspection':
        if (item.action === 'create') {
          await createSelfInspection(item.data, item.companyId);
        } else if (item.action === 'update') {
          await updateSelfInspection(item.data.id, item.data.updates, item.companyId);
        }
        break;
      
      case 'issue':
        if (item.action === 'create') {
          await addIssueToInspection(
            item.data.inspectionId, 
            item.data.issue, 
            item.companyId
          );
        }
        break;
    }
  }

  /**
   * Remove item from queue
   */
  private async removeFromQueue(itemId: string): Promise<void> {
    const queue = await this.getOfflineQueue();
    const filtered = queue.filter(item => item.id !== itemId);
    await Storage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  }

  /**
   * Move failed item to dead letter queue
   */
  private async moveToDeadLetterQueue(item: OfflineQueueItem): Promise<void> {
    const deadLetterKey = '@dead_letter_queue';
    try {
      const deadLetterJson = await Storage.getItem(deadLetterKey);
      const deadLetter = deadLetterJson ? JSON.parse(deadLetterJson) : [];
      deadLetter.push({
        ...item,
        movedAt: Date.now()
      });
      await Storage.setItem(deadLetterKey, JSON.stringify(deadLetter));
      console.warn(`⚠️ Moved item ${item.id} to dead letter queue after ${item.retryCount} retries`);
    } catch (error) {
      console.error('Error moving to dead letter queue:', error);
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(updates: Partial<SyncStatus>): Promise<void> {
    try {
      const current = await this.getSyncStatus();
      const updated = { ...current, ...updates };
      await Storage.setItem(SYNC_STATUS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const json = await Storage.getItem(SYNC_STATUS_KEY);
      const stored = json ? JSON.parse(json) : {};
      const queue = await this.getOfflineQueue();
      
      return {
        isOnline: this.isOnline,
        lastSync: stored.lastSync ? new Date(stored.lastSync) : null,
        pendingItems: queue.length,
        syncing: this.syncInProgress,
        errors: stored.errors || []
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isOnline: this.isOnline,
        lastSync: null,
        pendingItems: 0,
        syncing: false,
        errors: []
      };
    }
  }

  /**
   * Clear all offline data (use with caution!)
   */
  async clearOfflineData(): Promise<void> {
    try {
      await Storage.multiRemove([
        OFFLINE_QUEUE_KEY,
        PENDING_INSPECTIONS_KEY,
        PENDING_ISSUES_KEY,
        SYNC_STATUS_KEY,
        '@dead_letter_queue'
      ]);
      console.log('🗑️ Cleared all offline data');
      this.notifyListeners();
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of status change
   */
  private async notifyListeners() {
    const status = await this.getSyncStatus();
    this.listeners.forEach(listener => listener(status));
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Force a sync attempt
   */
  async forceSync(): Promise<void> {
    console.log('🔄 Force sync requested');
    await this.syncOfflineData();
  }

  /**
   * Get pending items count
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getOfflineQueue();
    const imageCount = await imageUploadQueue.getPendingCount();
    return queue.length + imageCount;
  }
}

// Export singleton instance
export const offlineService = new OfflineService();