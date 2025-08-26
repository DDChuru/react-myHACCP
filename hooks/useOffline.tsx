import { useState, useEffect, useCallback } from 'react';
import { offlineService, SyncStatus } from '../services/offlineService';

export function useOffline() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    lastSync: null,
    pendingItems: 0,
    syncing: false,
    errors: []
  });

  useEffect(() => {
    // Get initial status
    offlineService.getSyncStatus().then(setSyncStatus);

    // Subscribe to changes
    const unsubscribe = offlineService.subscribe(setSyncStatus);

    return unsubscribe;
  }, []);

  const forceSync = useCallback(async () => {
    await offlineService.forceSync();
  }, []);

  const clearOfflineData = useCallback(async () => {
    await offlineService.clearOfflineData();
  }, []);

  const queueOperation = useCallback(async (
    type: 'inspection' | 'issue' | 'update',
    action: 'create' | 'update' | 'delete',
    data: any,
    companyId: string
  ) => {
    await offlineService.queueOfflineOperation({
      type,
      action,
      data,
      companyId
    });
  }, []);

  return {
    ...syncStatus,
    forceSync,
    clearOfflineData,
    queueOperation,
    isOffline: !syncStatus.isOnline,
    hasPendingChanges: syncStatus.pendingItems > 0
  };
}