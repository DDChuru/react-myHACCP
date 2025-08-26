# SCI Image Capture - Focused Implementation Plan

## Executive Summary
Implement image capture functionality for Standard Cleaning Instructions (SCI) documents, enabling field workers to replace placeholder text with actual facility photos during plant walkarounds.

## Implementation Strategy

### Phase 1: Foundation (Days 1-3)
**Goal**: Set up data structures and navigation

#### Day 1: Data Models & Firebase Setup
```typescript
// 1. Create types/sci.types.ts
interface SCIDocument {
  id: string;
  documentNumber: string;
  title: string;
  companyId: string;
  content: {
    sanitationSteps?: SanitationStep[];      // PRIORITY
    postCleaningInspections?: InspectionItem[]; // PRIORITY
    ppeRequirements?: PPERequirement[];
    safetyPrecautions?: SafetyPrecaution[];
    applicationEquipment?: Equipment[];
  };
  imageStats: {
    total: number;
    captured: number;
    pending: number;
  };
}
```

#### Day 2: Redux Store Setup
```typescript
// 2. Create store/sci/sciSlice.ts
const sciSlice = createSlice({
  name: 'sci',
  initialState: {
    documents: [],
    selectedDocument: null,
    imageQueue: [],
    syncStatus: 'idle'
  },
  reducers: {
    setDocuments,
    selectDocument,
    queueImage,
    updateImageStatus
  }
});
```

#### Day 3: Navigation Integration
- Add SCI module to drawer navigation
- Create stack navigator for SCI screens
- Add to dashboard quick access

### Phase 2: Core Screens (Days 4-7)
**Goal**: Build essential UI components

#### Day 4: Document List Screen
```jsx
// screens/SCI/DocumentListScreen.tsx
const DocumentListScreen = () => {
  return (
    <View>
      <Searchbar />
      <FlatList
        data={documents}
        renderItem={({ item }) => (
          <SCIDocumentCard
            document={item}
            imageProgress={item.imageStats}
            onPress={() => navigateToViewer(item)}
          />
        )}
      />
    </View>
  );
};
```

#### Day 5: Document Viewer Screen
```jsx
// screens/SCI/DocumentViewerScreen.tsx
const DocumentViewerScreen = ({ document }) => {
  const sections = [
    { 
      title: 'Sanitation Steps', 
      data: document.content.sanitationSteps,
      priority: true 
    },
    { 
      title: 'Post Cleaning Inspections',
      data: document.content.postCleaningInspections,
      priority: true
    }
  ];

  return (
    <SectionList
      sections={sections}
      renderItem={({ item, section }) => (
        <ImageFieldItem
          item={item}
          onCapturePress={() => openCamera(item, section)}
        />
      )}
    />
  );
};
```

#### Day 6: Image Capture Screen
```jsx
// screens/SCI/ImageCaptureScreen.tsx
const ImageCaptureScreen = ({ route }) => {
  const { fieldType, item, document } = route.params;
  
  const captureImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true
    });
    
    if (!result.canceled) {
      await processAndSaveImage(result.assets[0]);
    }
  };

  return (
    <View>
      <ContextHeader 
        document={document}
        field={fieldType}
        item={item}
      />
      <CameraView onCapture={captureImage} />
    </View>
  );
};
```

#### Day 7: Image Gallery Component
```jsx
// components/SCI/ImageGallery.tsx
const ImageGallery = ({ images, onAddImage, onDeleteImage }) => {
  return (
    <View style={styles.gallery}>
      {images.map(image => (
        <ImageThumbnail 
          key={image.id}
          image={image}
          onPress={() => viewFullScreen(image)}
          onDelete={() => onDeleteImage(image.id)}
        />
      ))}
      <AddImageButton onPress={onAddImage} />
    </View>
  );
};
```

### Phase 3: Image Services (Days 8-10)
**Goal**: Implement upload and sync functionality

#### Day 8: Image Upload Service
```typescript
// services/ImageUploadService.ts
class ImageUploadService {
  async uploadImage(companyId: string, documentId: string, fieldPath: string, imageUri: string) {
    // 1. Optimize image
    const optimized = await this.optimizeImage(imageUri);
    
    // 2. Generate storage path
    const path = `companies/${companyId}/sci/${documentId}/${fieldPath}/${Date.now()}.jpg`;
    
    // 3. Upload to Firebase
    const ref = storage().ref(path);
    await ref.putFile(optimized.uri);
    
    // 4. Get URL and update Firestore
    const url = await ref.getDownloadURL();
    await this.updateDocumentField(documentId, fieldPath, url);
    
    return url;
  }

  private async optimizeImage(uri: string) {
    return await ImageResizer.createResizedImage(
      uri, 1920, 1080, 'JPEG', 85, 0
    );
  }
}
```

#### Day 9: Offline Sync Manager
```typescript
// services/SyncManager.ts
class SyncManager {
  async queueForSync(action: SyncAction) {
    const queue = await this.getQueue();
    queue.push(action);
    await AsyncStorage.setItem('sci_sync_queue', JSON.stringify(queue));
  }

  async processSyncQueue() {
    const queue = await this.getQueue();
    
    for (const action of queue) {
      try {
        await this.processAction(action);
        await this.removeFromQueue(action.id);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}
```

#### Day 10: Image Cache Manager
```typescript
// services/ImageCacheManager.ts
class ImageCacheManager {
  async preloadImages(documentId: string) {
    const document = await this.getDocument(documentId);
    const imageUrls = this.extractImageUrls(document);
    
    FastImage.preload(
      imageUrls.map(uri => ({ uri, priority: FastImage.priority.normal }))
    );
  }

  renderCachedImage(url: string) {
    return (
      <FastImage
        source={{ 
          uri: url,
          cache: FastImage.cacheControl.immutable
        }}
        style={styles.image}
      />
    );
  }
}
```

### Phase 4: Integration & Testing (Days 11-14)
**Goal**: Connect all components and test

#### Day 11: Wire Up Redux Actions
- Connect screens to Redux store
- Implement action creators for image operations
- Add loading and error states

#### Day 12: Implement Offline Mode
- Test offline queue functionality
- Add network status monitoring
- Implement retry logic

#### Day 13: Performance Optimization
- Add image lazy loading
- Implement list virtualization
- Optimize re-renders

#### Day 14: Testing & Bug Fixes
- Test complete image capture flow
- Test offline/online transitions
- Fix identified issues

## Quick Start Commands

### Install Required Dependencies
```bash
# Image handling
npm install react-native-fast-image
npm install react-native-image-resizer

# State management  
npm install @reduxjs/toolkit react-redux
npm install redux-persist

# Firebase (if not already installed)
npm install @react-native-firebase/storage
```

### File Structure
```
app/
├── (drawer)/
│   └── sci/
│       ├── _layout.tsx
│       ├── index.tsx          # Document list
│       ├── [id].tsx          # Document viewer
│       ├── capture.tsx       # Image capture
│       └── gallery.tsx       # Image gallery
├── components/
│   └── sci/
│       ├── DocumentCard.tsx
│       ├── ImageFieldItem.tsx
│       ├── ImageGallery.tsx
│       └── CameraView.tsx
├── services/
│   ├── ImageUploadService.ts
│   ├── SyncManager.ts
│   └── ImageCacheManager.ts
├── store/
│   └── sci/
│       ├── sciSlice.ts
│       └── sciActions.ts
└── types/
    └── sci.types.ts
```

## Success Metrics
1. **Image Capture Rate**: Track % of fields with images vs placeholders
2. **Upload Success**: Monitor successful vs failed uploads
3. **Sync Performance**: Measure time to sync when coming online
4. **User Engagement**: Track daily active users capturing images
5. **Data Quality**: Monitor image resolution and file sizes

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Large image files | Automatic compression to max 1920x1080 |
| Poor connectivity | Robust offline queue with automatic retry |
| Storage costs | Thumbnail generation, cleanup old images |
| User confusion | Clear UI indicators and help tooltips |

## Testing Checklist

### Functional Tests
- [ ] Capture image from camera
- [ ] Select image from gallery
- [ ] View captured images
- [ ] Delete images
- [ ] Navigate between documents
- [ ] Search and filter documents
- [ ] Offline image capture
- [ ] Online sync process

### Edge Cases
- [ ] No camera permission
- [ ] No gallery permission
- [ ] Full device storage
- [ ] Corrupt image file
- [ ] Network timeout during upload
- [ ] App killed during sync
- [ ] Multiple images for same field
- [ ] Very large documents (100+ fields)

## Go-Live Checklist
- [ ] All priority fields implemented (Sanitation, Inspections)
- [ ] Offline mode fully functional
- [ ] Image optimization working
- [ ] Error handling in place
- [ ] Loading states implemented
- [ ] Empty states designed
- [ ] Permissions handling smooth
- [ ] Analytics tracking enabled

## Next Steps After MVP
1. AI-powered image validation
2. Bulk capture mode for walkarounds
3. Image annotations and markup
4. Video capture support
5. OCR for text extraction from images