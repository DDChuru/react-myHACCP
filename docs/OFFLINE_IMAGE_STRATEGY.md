# Self-Inspection Offline Image & Data Strategy

## Overview
HACCP inspections often happen in areas with poor connectivity (freezers, basements, storage areas). We need robust offline-first architecture.

## Image Persistence Strategy

### 1. Capture & Local Storage
```typescript
// When image is captured
const captureImage = async () => {
  const result = await ImagePicker.launchCameraAsync();
  
  // Step 1: Save to local filesystem
  const localUri = await FileSystem.copyAsync({
    from: result.uri,
    to: `${FileSystem.documentDirectory}inspections/${inspectionId}/${imageId}.jpg`
  });
  
  // Step 2: Store metadata in AsyncStorage
  const imageMetadata = {
    id: imageId,
    localUri: localUri,
    remoteUri: null,  // Will be filled after upload
    capturedAt: new Date(),
    uploadStatus: 'pending',
    inspectionId: inspectionId,
    issueId: issueId,
    annotations: []
  };
  
  await AsyncStorage.setItem(
    `image_${imageId}`,
    JSON.stringify(imageMetadata)
  );
  
  // Step 3: Add to upload queue
  await addToUploadQueue(imageId);
};
```

### 2. Three-Tier Storage Architecture

```
┌─────────────────────────────────────┐
│         TIER 1: MEMORY              │
│   Current inspection images (<10)    │
│   Immediate access for annotation    │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│      TIER 2: LOCAL FILESYSTEM       │
│   All captured images (JPEG/PNG)     │
│   Expo FileSystem.documentDirectory  │
│   Survives app restarts              │
└─────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────┐
│      TIER 3: CLOUD STORAGE          │
│   Firebase Storage / S3             │
│   Permanent storage                 │
│   Accessible across devices         │
└─────────────────────────────────────┘
```

### 3. Upload Queue Management

```typescript
interface UploadQueue {
  queue: string[];  // Image IDs
  processing: boolean;
  retryCount: Map<string, number>;
  maxRetries: 3;
}

// Background upload process
const processUploadQueue = async () => {
  const queue = await getUploadQueue();
  
  for (const imageId of queue.items) {
    if (!isOnline()) break;
    
    try {
      // 1. Get local image
      const metadata = await AsyncStorage.getItem(`image_${imageId}`);
      const localUri = metadata.localUri;
      
      // 2. Upload to Firebase Storage
      const blob = await fetch(localUri).then(r => r.blob());
      const ref = storage.ref(`inspections/${inspectionId}/${imageId}.jpg`);
      await ref.put(blob);
      
      // 3. Get download URL
      const remoteUri = await ref.getDownloadURL();
      
      // 4. Update Firestore document
      await updateIssueImage(inspectionId, issueId, imageId, remoteUri);
      
      // 5. Update local metadata
      metadata.remoteUri = remoteUri;
      metadata.uploadStatus = 'completed';
      await AsyncStorage.setItem(`image_${imageId}`, JSON.stringify(metadata));
      
      // 6. Remove from queue
      await removeFromQueue(imageId);
      
    } catch (error) {
      await handleUploadError(imageId, error);
    }
  }
};
```

## Sync Strategy When Back Online

### 1. Connection State Detection
```typescript
// Using NetInfo
import NetInfo from '@react-native-community/netinfo';

NetInfo.addEventListener(state => {
  if (state.isConnected && state.isInternetReachable) {
    // Trigger sync
    syncOfflineData();
  }
});
```

### 2. Sync Priority Order
```
1. Critical Issues (Severity: Critical/Major)
   ↓
2. Completed Inspections with Signature
   ↓
3. Issue Images & Annotations
   ↓
4. Draft/In-Progress Inspections
   ↓
5. Historical Data Cleanup
```

### 3. Conflict Resolution
```typescript
// Server wins for:
- Status changes (completed > in_progress)
- Signature data
- Issue acknowledgments

// Client wins for:
- New issues added
- Image annotations
- Description updates

// Merge strategy for:
- Issue lists (union of both)
- Comments (append both with timestamps)
```

## Data Retention Policy

### Mobile Device Storage

```typescript
const RETENTION_POLICY = {
  // Active inspections - keep indefinitely while in progress
  activeInspections: {
    status: ['draft', 'pending', 'in_progress'],
    retention: Infinity,
    includeImages: true
  },
  
  // Recently completed - keep 30 days
  recentCompleted: {
    status: ['completed'],
    retention: 30 * 24 * 60 * 60 * 1000, // 30 days
    includeImages: true
  },
  
  // Archived - keep metadata only after 30 days
  archived: {
    status: ['completed'],
    age: '> 30 days',
    retention: 90 * 24 * 60 * 60 * 1000, // 90 days total
    includeImages: false, // Remove local images, keep URLs
  },
  
  // Purge - remove completely after 90 days
  purge: {
    age: '> 90 days',
    action: 'delete_local',
    keepRemote: true
  }
};
```

### Storage Management

```typescript
// Periodic cleanup job
const cleanupLocalStorage = async () => {
  const now = Date.now();
  
  // Get all inspections
  const inspections = await AsyncStorage.getAllKeys()
    .filter(key => key.startsWith('inspection_'));
  
  for (const key of inspections) {
    const inspection = JSON.parse(await AsyncStorage.getItem(key));
    const age = now - new Date(inspection.completedAt).getTime();
    
    if (inspection.status === 'completed') {
      if (age > 90 * DAY_MS) {
        // Remove completely
        await removeInspectionLocal(inspection.id);
      } else if (age > 30 * DAY_MS) {
        // Remove images, keep metadata
        await removeInspectionImages(inspection.id);
      }
    }
  }
  
  // Check total storage usage
  const usage = await FileSystem.getInfoAsync(
    FileSystem.documentDirectory,
    { size: true }
  );
  
  if (usage.size > 500 * 1024 * 1024) { // 500MB limit
    await triggerStorageWarning();
  }
};
```

## Offline Capabilities Timeline

### What Works Offline

| Feature | Offline Support | Sync Required |
|---------|----------------|---------------|
| Create Inspection | ✅ Full | On completion |
| Add Issues | ✅ Full | Within 24h |
| Capture Images | ✅ Full | When online |
| Image Annotations | ✅ Full | When online |
| View Past Inspections | ✅ 30 days | Background sync |
| Generate Reports | ⚠️ Limited | Needs sync |
| Assign Responsibilities | ✅ Local | On save |
| Signatures | ✅ Full | On completion |

### Sync Indicators

```typescript
// Visual feedback for sync status
const SyncStatus = {
  SYNCED: '✅ All data synced',
  PENDING: '⏳ Waiting to sync (3 items)',
  SYNCING: '🔄 Syncing...',
  OFFLINE: '📴 Offline mode',
  ERROR: '⚠️ Sync failed - tap to retry'
};
```

## Implementation Priority

### Phase 1: Basic Offline (Week 1)
- [ ] Local image storage with FileSystem
- [ ] AsyncStorage for inspection metadata
- [ ] Basic queue for uploads
- [ ] Manual sync trigger

### Phase 2: Smart Sync (Week 2)
- [ ] Auto-detect connection changes
- [ ] Priority-based sync queue
- [ ] Conflict resolution
- [ ] Progress indicators

### Phase 3: Storage Management (Week 3)
- [ ] Retention policy implementation
- [ ] Automatic cleanup
- [ ] Storage usage monitoring
- [ ] User storage settings

### Phase 4: Advanced Features (Week 4)
- [ ] Differential sync (only changes)
- [ ] Compression for images
- [ ] Batch upload optimization
- [ ] Offline report generation

## Key Decisions

1. **Image Format**: JPEG with 80% quality (balance size/quality)
2. **Max Offline Period**: 30 days for active data
3. **Storage Limit**: 500MB per device (configurable)
4. **Sync Frequency**: Every 5 minutes when online
5. **Upload Batch Size**: 5 images at a time
6. **Retry Policy**: 3 attempts with exponential backoff

## Error Handling

```typescript
const ERROR_STRATEGIES = {
  NO_SPACE: 'Prompt user to clean up old inspections',
  UPLOAD_FAILED: 'Retry with exponential backoff',
  CORRUPT_IMAGE: 'Skip and log, notify user',
  SYNC_CONFLICT: 'Show resolution dialog',
  QUOTA_EXCEEDED: 'Upgrade prompt or cleanup'
};
```

## Testing Checklist

- [ ] Airplane mode full inspection flow
- [ ] Image capture in offline mode
- [ ] Sync when returning online
- [ ] Storage cleanup after 30 days
- [ ] Conflict resolution scenarios
- [ ] Storage limit handling
- [ ] Batch upload performance
- [ ] Recovery from interrupted sync