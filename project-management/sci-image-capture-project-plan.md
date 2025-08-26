# SCI Image Capture - React Native Project Plan

## Project Overview
A React Native mobile application enabling users to navigate Standard Cleaning Instructions (SCI) documents and capture/manage images for specific fields during plant walkarounds. The app focuses on enriching SCI documents with real-world photos of equipment, safety procedures, and cleaning steps.

## Core Business Value
- **Field Data Collection**: Enable workers to capture real images during plant walkarounds
- **Document Enrichment**: Replace placeholder text with actual facility photos
- **Visual Guidance**: Provide clear visual references for cleaning procedures
- **Compliance Documentation**: Maintain photographic evidence of cleaning standards

## Technical Architecture

### 1. Data Models & Interfaces

#### SCI Document Structure
```typescript
interface SCIDocument {
  id: string;
  documentNumber: string;
  title: string;
  companyId: string;
  categoryId: string;
  areas?: string[];  // List of plant areas covered
  content: SCIContent;
  metadata: DocumentMetadata;
}

interface SCIContent {
  items?: CleaningItem[];
  preparatoryActivities?: string[];
  ppeRequirements?: PPERequirement[];
  safetyPrecautions?: SafetyPrecaution[];
  equipmentColorCoding?: ColorCodeEntry[];
  applicationEquipment?: Equipment[];
  cleaningChemicals?: Chemical[];
  cleaningInstructions?: CleaningInstruction[];
  sanitationSteps?: SanitationStep[];  // PRIMARY IMAGE FIELD
  postCleaningInspections?: InspectionItem[];  // PRIMARY IMAGE FIELD
}
```

#### Image-Enabled Field Types
```typescript
// Fields with image support (5 total)
interface PPERequirement {
  name: string;
  image?: string;  // URL or placeholder text
  imageUrl?: string;  // Alternative field name
  description?: string;
}

interface SafetyPrecaution {
  title: string;
  description: string;
  image?: string;
  severity?: 'critical' | 'warning' | 'info';
}

interface Equipment {
  name: string;
  image?: string;
  imageUrl?: string;
  type?: string;
}

interface SanitationStep {  // PRIORITY FIELD
  name: string;
  imageUrl?: string;
  description?: string;
  criticalLimit?: string;
  monitoringFrequency?: string;
}

interface InspectionItem {  // PRIORITY FIELD
  name: string;
  image?: string;
  imageUrl?: string;
  acceptanceCriteria?: string;
  frequency?: string;
}
```

### 2. Screen Architecture

#### A. Document List Screen
**Purpose**: Browse and search SCI documents
```typescript
interface DocumentListScreen {
  // Components
  SearchBar: TextInput;  // Filter by doc number/title
  FilterChips: Array<TouchableOpacity>;  // Filter by area
  DocumentCards: FlatList<SCIDocumentCard>;
  
  // Features
  - Pull to refresh
  - Lazy loading pagination
  - Offline support with cached data
  - Quick action buttons (View, Capture Images)
}
```

**Space-Efficient Area Display**:
```typescript
// Collapsible area pills with count badge
<AreaPillsComponent>
  <TouchableOpacity>
    <Text>Production (+3)</Text>  // Expands to show all areas
  </TouchableOpacity>
</AreaPillsComponent>
```

#### B. SCI Document Viewer Screen
**Purpose**: Navigate document sections and manage images
```typescript
interface SCIViewerScreen {
  // Header
  DocumentHeader: {
    documentNumber: string;
    title: string;
    syncStatus: 'synced' | 'pending' | 'offline';
  };
  
  // Content
  SectionList: {
    sections: [
      { title: 'Safety & PPE', data: [...], hasImages: true },
      { title: 'Equipment', data: [...], hasImages: true },
      { title: 'Cleaning Steps', data: [...], hasImages: true },  // PRIORITY
      { title: 'Inspections', data: [...], hasImages: true },  // PRIORITY
    ];
  };
  
  // Features
  - Collapsible sections
  - Image count badges
  - Quick navigation menu
  - Offline mode indicator
}
```

#### C. Image Gallery Screen
**Purpose**: Manage images for a specific field
```typescript
interface ImageGalleryScreen {
  // Props
  fieldType: 'sanitationSteps' | 'inspections' | 'ppe' | 'equipment' | 'safety';
  fieldItem: any;  // The specific item being edited
  
  // Components
  ImageGrid: FlatList<ImageThumbnail>;
  AddImageButton: TouchableOpacity;
  
  // Actions
  - View full screen
  - Add new image (camera/gallery)
  - Delete image
  - Reorder images (drag & drop)
  - Add caption/notes
}
```

#### D. Image Capture Screen
**Purpose**: Camera interface for capturing new images
```typescript
interface ImageCaptureScreen {
  // Camera Features
  CameraView: RNCamera;
  CaptureButton: TouchableOpacity;
  FlashToggle: TouchableOpacity;
  GridOverlay: View;  // Optional composition guides
  
  // Context Display
  FieldContext: {
    documentNumber: string;
    fieldName: string;
    itemName: string;
  };
  
  // Post-Capture
  ImagePreview: Image;
  RetakeButton: TouchableOpacity;
  SaveButton: TouchableOpacity;
}
```

### 3. Component Architecture

#### Core Components
```typescript
// Document Card Component
export const SCIDocumentCard: React.FC<{
  document: SCIDocument;
  onPress: () => void;
  imageStats: { total: number; captured: number };
}> = ({ document, onPress, imageStats }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.docNumber}>{document.documentNumber}</Text>
        <ImageProgressBadge captured={imageStats.captured} total={imageStats.total} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{document.title}</Text>
      <AreaPills areas={document.areas} maxVisible={2} />
    </TouchableOpacity>
  );
};

// Image Field Component
export const ImageFieldItem: React.FC<{
  item: any;
  fieldType: string;
  onImagePress: () => void;
}> = ({ item, fieldType, onImagePress }) => {
  const hasValidImage = isValidImageUrl(item.image || item.imageUrl);
  
  return (
    <View style={styles.container}>
      <Text style={styles.itemName}>{item.name || item.title}</Text>
      <TouchableOpacity onPress={onImagePress}>
        {hasValidImage ? (
          <FastImage source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="camera-plus" size={24} />
            <Text>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

### 4. State Management

#### Redux Store Structure
```typescript
interface AppState {
  documents: {
    list: SCIDocument[];
    selectedDocument: SCIDocument | null;
    filters: DocumentFilters;
    syncQueue: PendingUpdate[];
  };
  
  images: {
    pending: LocalImage[];  // Not yet uploaded
    uploading: UploadingImage[];  // Currently uploading
    cache: ImageCache;  // Downloaded images
  };
  
  sync: {
    isOnline: boolean;
    lastSync: Date;
    pendingChanges: number;
  };
}
```

#### Image Interfaces (From Angular Implementation)

```typescript
// Core Image File Interface
interface ImageFile {
  id: string;
  name: string;
  file: File;  // React Native: Use { uri, type, name }
  preview: string;  // Data URL for preview
  dataUrl: string;  // Base64 encoded image data
  type?: string;  // MIME type
  size?: number;  // File size in bytes
}

// Upload Result Interface
interface ImageUploadResult {
  originalUrl: string;      // Full resolution
  thumbnailUrl: string;     // 150px thumbnail
  mediumUrl: string;        // 600px medium size
  dimensions: { width: number; height: number };
  fileSize: number;
  mimeType: string;
}

// Document Image Interface
interface DocumentImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  section: 'key-sanitation' | 'post-inspection' | 'ppe' | 'equipment' | 'safety';
  itemIndex: number;
  itemName: string;
  uploadedAt: Date;
  uploadedBy: string;
  mimeType: string;
  size: number;
}

// Image Upload Options
interface ImageUploadOptions {
  generateThumbnail?: boolean;  // Default: true
  generateMedium?: boolean;     // Default: true
  maxWidth?: number;            // Default: 1920
  maxHeight?: number;           // Default: 1080
  quality?: number;             // Default: 85
}

// Image Display Data
interface ImageDisplayData {
  originalUrl?: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  dimensions?: { width: number; height: number };
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  loadingState?: 'loading' | 'loaded' | 'error';
}
```

#### Image Constraints & Validation
```typescript
const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
  SUPPORTED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  THUMBNAIL_SIZE: 150,
  MEDIUM_SIZE: 600,
  COMPRESSION_QUALITY: 0.85,
  MAX_DIMENSION: 1920
};
```

#### Offline Capability
```typescript
// Sync Manager
class SyncManager {
  // Queue changes locally
  async queueImageUpdate(documentId: string, fieldPath: string, imageData: LocalImage) {
    await AsyncStorage.setItem(`pending_${Date.now()}`, JSON.stringify({
      type: 'IMAGE_UPDATE',
      documentId,
      fieldPath,
      imageData,
      timestamp: Date.now()
    }));
  }
  
  // Process queue when online
  async processSyncQueue() {
    const pendingKeys = await AsyncStorage.getAllKeys();
    const pendingItems = pendingKeys.filter(key => key.startsWith('pending_'));
    
    for (const key of pendingItems) {
      const item = JSON.parse(await AsyncStorage.getItem(key));
      await this.uploadImage(item);
      await AsyncStorage.removeItem(key);
    }
  }
}
```

### 5. Image Handling

#### Image Upload Service
```typescript
class ImageUploadService {
  async uploadImage(
    companyId: string,
    documentId: string,
    fieldType: string,
    imageUri: string
  ): Promise<string> {
    // Generate storage path
    const fileName = `${fieldType}_${Date.now()}.jpg`;
    const storagePath = `companies/${companyId}/documents/${documentId}/sci-images/${fileName}`;
    
    // Upload to Firebase Storage
    const reference = storage().ref(storagePath);
    await reference.putFile(imageUri);
    
    // Get download URL
    const downloadUrl = await reference.getDownloadURL();
    
    // Update Firestore document
    await this.updateDocumentField(documentId, fieldType, downloadUrl);
    
    return downloadUrl;
  }
  
  private isValidImageUrl(url: any): boolean {
    if (!url || typeof url !== 'string') return false;
    
    const placeholderTexts = ['photo placeholder', 'image placeholder', 'no image'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const placeholder of placeholderTexts) {
      if (lowerUrl.includes(placeholder)) return false;
    }
    
    return lowerUrl.startsWith('http://') || 
           lowerUrl.startsWith('https://') || 
           lowerUrl.startsWith('file://');
  }
}
```

#### Image Optimization
```typescript
import ImageResizer from 'react-native-image-resizer';

async function optimizeImage(uri: string): Promise<string> {
  const optimized = await ImageResizer.createResizedImage(
    uri,
    1920,  // maxWidth
    1080,  // maxHeight
    'JPEG',
    80,    // quality
    0      // rotation
  );
  
  return optimized.uri;
}
```

### 6. Navigation Structure

```typescript
// React Navigation Stack
const SCINavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="DocumentList" 
        component={DocumentListScreen}
        options={{ title: 'SCI Documents' }}
      />
      <Stack.Screen 
        name="DocumentViewer" 
        component={SCIViewerScreen}
        options={({ route }) => ({ 
          title: route.params.document.documentNumber 
        })}
      />
      <Stack.Screen 
        name="ImageGallery" 
        component={ImageGalleryScreen}
        options={{ title: 'Manage Images' }}
      />
      <Stack.Screen 
        name="ImageCapture" 
        component={ImageCaptureScreen}
        options={{ 
          title: 'Capture Photo',
          presentation: 'modal'
        }}
      />
    </Stack.Navigator>
  );
};
```

### 7. Performance Optimizations

#### List Performance
```typescript
// Use FlatList with optimization props
<FlatList
  data={documents}
  renderItem={renderDocumentCard}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
  initialNumToRender={10}
/>
```

#### Image Caching
```typescript
import FastImage from 'react-native-fast-image';

// Preload critical images
FastImage.preload([
  { uri: 'https://...image1.jpg' },
  { uri: 'https://...image2.jpg' },
]);

// Use FastImage with caching
<FastImage
  source={{ 
    uri: imageUrl,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable
  }}
  style={styles.image}
  resizeMode={FastImage.resizeMode.cover}
/>
```

### 8. User Experience Features

#### Smart Features
1. **Auto-Save**: Images saved locally immediately, sync when online
2. **Progress Tracking**: Visual indicators for image completion per document
3. **Quick Actions**: Swipe to capture, long-press to view gallery
4. **Bulk Operations**: Select multiple items for batch image capture
5. **Smart Suggestions**: AI-powered suggestions for missing images

#### Accessibility
```typescript
// Proper accessibility labels
<TouchableOpacity
  accessible={true}
  accessibilityLabel={`Capture image for ${item.name}`}
  accessibilityHint="Opens camera to take a photo"
  accessibilityRole="button"
>
  <Text>Add Photo</Text>
</TouchableOpacity>
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Set up React Native project with TypeScript
- [ ] Configure Firebase (Auth, Firestore, Storage)
- [ ] Implement Redux store and offline storage
- [ ] Create base navigation structure
- [ ] Build authentication flow

### Phase 2: Document List & Viewer (Week 3-4)
- [ ] Document list screen with search/filter
- [ ] Document card component with image stats
- [ ] SCI viewer screen with collapsible sections
- [ ] Area pills component for space efficiency
- [ ] Implement pull-to-refresh and pagination

### Phase 3: Image Management (Week 5-6)
- [ ] Image gallery screen for field management
- [ ] Camera integration with react-native-vision-camera
- [ ] Image upload service with retry logic
- [ ] Offline queue management
- [ ] Image optimization and compression

### Phase 4: Priority Fields Focus (Week 7)
- [ ] Enhanced UI for Sanitation Steps
- [ ] Enhanced UI for Post Cleaning Inspections
- [ ] Bulk image operations
- [ ] Quick capture mode for walkarounds
- [ ] Image annotation features

### Phase 5: Polish & Performance (Week 8)
- [ ] Performance optimization
- [ ] Error handling and recovery
- [ ] Analytics integration
- [ ] User onboarding flow
- [ ] Beta testing and bug fixes

## Technical Dependencies

```json
{
  "dependencies": {
    "react-native": "0.72.x",
    "react-navigation": "^6.x",
    "@react-navigation/native": "^6.x",
    "@react-navigation/stack": "^6.x",
    "react-native-firebase": "^18.x",
    "@react-native-firebase/app": "^18.x",
    "@react-native-firebase/auth": "^18.x",
    "@react-native-firebase/firestore": "^18.x",
    "@react-native-firebase/storage": "^18.x",
    "react-redux": "^8.x",
    "@reduxjs/toolkit": "^1.9.x",
    "redux-persist": "^6.x",
    "@react-native-async-storage/async-storage": "^1.x",
    "react-native-vision-camera": "^3.x",
    "react-native-fast-image": "^8.x",
    "react-native-image-resizer": "^3.x",
    "react-native-permissions": "^3.x",
    "react-native-vector-icons": "^10.x",
    "react-native-gesture-handler": "^2.x",
    "react-native-reanimated": "^3.x",
    "react-hook-form": "^7.x"
  }
}
```

## Security Considerations

1. **Authentication**: Firebase Auth with role-based access
2. **Data Protection**: Encrypt sensitive data in AsyncStorage
3. **Image Privacy**: Ensure proper permissions and EXIF data removal
4. **Network Security**: Certificate pinning for API calls
5. **Input Validation**: Sanitize all user inputs and file uploads

## Performance Metrics

### Target KPIs
- App launch time: < 2 seconds
- Document list load: < 1 second (cached)
- Image upload: < 5 seconds (optimized)
- Camera capture to save: < 3 seconds
- Offline to online sync: < 10 seconds for 10 images

### Monitoring
- Firebase Performance Monitoring
- Sentry for crash reporting
- Custom analytics for image capture success rates
- Network request monitoring

## Testing Strategy

### Unit Tests
- Redux reducers and actions
- Image validation utilities
- Sync queue management
- Data transformation functions

### Integration Tests
- Firebase service integration
- Camera and gallery functionality
- Offline/online transitions
- Image upload with retry

### E2E Tests
- Complete image capture flow
- Document navigation
- Offline mode operations
- Sync conflict resolution

## Deployment Strategy

### Beta Release
1. Internal testing with 5-10 users
2. TestFlight/Play Console beta (50 users)
3. Staged rollout to production (10% → 50% → 100%)

### App Store Optimization
- Screenshots highlighting image capture
- Video demo of walkaround workflow
- Keywords: SCI, cleaning, HACCP, food safety
- Localization for multiple markets

## Future Enhancements

### Version 2.0
- [ ] AI-powered image quality validation
- [ ] Barcode/QR code scanning for equipment
- [ ] Voice notes for observations
- [ ] Team collaboration features
- [ ] Automated report generation

### Version 3.0
- [ ] AR overlay for equipment identification
- [ ] Machine learning for image categorization
- [ ] Integration with IoT sensors
- [ ] Predictive maintenance insights
- [ ] Cross-platform desktop companion app

## Success Criteria

1. **User Adoption**: 80% of field workers using within 3 months
2. **Image Coverage**: 90% of SCI documents with complete images
3. **Efficiency Gain**: 50% reduction in documentation time
4. **Quality Improvement**: 30% fewer non-conformances related to cleaning
5. **User Satisfaction**: 4.5+ star rating in app stores

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Poor network connectivity | High | Robust offline mode with automatic sync |
| Large image files | Medium | Compression and optimization before upload |
| User adoption resistance | High | Intuitive UI and comprehensive training |
| Data loss | High | Multiple backup strategies and sync validation |
| Camera compatibility | Medium | Fallback to gallery selection, multiple camera libraries |

## Support & Maintenance

### Documentation
- User guide with screenshots
- Video tutorials for common tasks
- FAQ section in-app
- Technical documentation for developers

### Support Channels
- In-app feedback mechanism
- Email support
- Knowledge base
- Regular webinars for best practices

## Conclusion

This React Native application will transform how field workers interact with SCI documents, making image capture and management seamless during plant walkarounds. The focus on offline capability, performance optimization, and user experience will ensure high adoption rates and meaningful improvement in documentation quality.

The phased approach allows for iterative development with early user feedback, while the technical architecture ensures scalability and maintainability for future enhancements.
