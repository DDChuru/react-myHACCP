import { useState, useCallback, useEffect } from 'react';
import { 
  syncSelfInspectionData, 
  syncCollection, 
  ensureDevData,
  clearSyncCache,
  SyncResult,
  SyncStatus 
} from '../services/syncService';
import { useAuth } from './useAuth';

interface UseSyncReturn {
  syncing: boolean;
  lastSync: Date | null;
  syncStatus: SyncStatus[];
  syncAll: () => Promise<void>;
  syncCollection: (collectionName: string) => Promise<void>;
  clearCache: () => Promise<void>;
  ensureData: () => Promise<void>;
}

export function useSync(): UseSyncReturn {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus[]>([]);
  
  // Get company ID from user context or use default for dev
  const companyId = user?.companyId || '2XTSaqxU41zCTBIVJeXb';

  // Sync all collections for self-inspection
  const syncAll = useCallback(async () => {
    if (syncing) return;
    
    try {
      setSyncing(true);
      console.log('Starting full sync...');
      
      const result: SyncResult = await syncSelfInspectionData(companyId);
      
      setSyncStatus(result.collections);
      setLastSync(new Date());
      
      console.log(`Sync completed: ${result.totalRecords} records in ${result.duration}ms`);
      
      if (!result.success) {
        const failedCollections = result.collections
          .filter(c => c.status === 'error')
          .map(c => c.collection);
        console.warn('Some collections failed to sync:', failedCollections);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, [companyId, syncing]);

  // Sync a specific collection
  const syncSingleCollection = useCallback(async (collectionName: string) => {
    if (syncing) return;
    
    try {
      setSyncing(true);
      console.log(`Syncing ${collectionName}...`);
      
      const status = await syncCollection(companyId, collectionName);
      
      // Update status for this collection
      setSyncStatus(prev => {
        const updated = [...prev];
        const index = updated.findIndex(s => s.collection === collectionName);
        if (index >= 0) {
          updated[index] = status;
        } else {
          updated.push(status);
        }
        return updated;
      });
      
      if (status.status === 'success') {
        console.log(`✅ ${collectionName} synced: ${status.count} records`);
      } else {
        console.error(`❌ ${collectionName} sync failed:`, status.error);
      }
    } catch (error) {
      console.error(`Failed to sync ${collectionName}:`, error);
    } finally {
      setSyncing(false);
    }
  }, [companyId, syncing]);

  // Ensure development data exists
  const ensureData = useCallback(async () => {
    try {
      setSyncing(true);
      console.log('Ensuring development data...');
      await ensureDevData(companyId);
      console.log('Development data ready');
    } catch (error) {
      console.error('Failed to ensure dev data:', error);
    } finally {
      setSyncing(false);
    }
  }, [companyId]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await clearSyncCache();
      setSyncStatus([]);
      setLastSync(null);
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  // Auto-sync on mount in development
  useEffect(() => {
    if (__DEV__) {
      // Check if we need to ensure data exists
      ensureData().then(() => {
        // Then do an initial sync
        syncAll();
      });
    }
  }, []);

  return {
    syncing,
    lastSync,
    syncStatus,
    syncAll,
    syncCollection: syncSingleCollection,
    clearCache,
    ensureData
  };
}