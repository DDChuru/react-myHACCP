# SCI Image Capture - Technology Stack Decision

## Simplified Architecture Using Existing Dependencies

### ✅ What We'll Use (Already Installed)

#### 1. Image Capture & Display
```typescript
// expo-image-picker - Camera/Gallery
import * as ImagePicker from 'expo-image-picker';

// expo-image - Optimized image display with caching
import { Image } from 'expo-image';

// Built-in caching, no FastImage needed!
<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk" // Automatic caching!
/>
```

#### 2. Image Processing
```typescript
// expo-image-manipulator (only new dependency needed)
import * as ImageManipulator from 'expo-image-manipulator';

// Resize and compress
const compressed = await ImageManipulator.manipulateAsync(
  imageUri,
  [{ resize: { width: 1920 } }],
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
);
```

#### 3. Offline Storage
```typescript
// expo-file-system - Local caching and offline queue
import * as FileSystem from 'expo-file-system';

// Save image locally
const localUri = `${FileSystem.documentDirectory}sci_images/${filename}`;
await FileSystem.copyAsync({ from: imageUri, to: localUri });

// Store offline queue
await FileSystem.writeAsStringAsync(
  `${FileSystem.documentDirectory}sync_queue.json`,
  JSON.stringify(queue)
);
```

#### 4. State Management
```typescript
// Simple Context API (no Redux needed)
const SCIContext = createContext<SCIContextType>(null);

export const SCIProvider = ({ children }) => {
  const [documents, setDocuments] = useState<SCIDocument[]>([]);
  const [imageQueue, setImageQueue] = useState<QueuedImage[]>([]);
  
  // Load from Firestore
  useEffect(() => {
    const loadDocuments = async () => {
      const snapshot = await firestore()
        .collection('sciDocuments')
        .where('companyId', '==', user.companyId)
        .get();
      
      setDocuments(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    };
    
    loadDocuments();
  }, []);
  
  return (
    <SCIContext.Provider value={{ documents, imageQueue, ... }}>
      {children}
    </SCIContext.Provider>
  );
};
```

#### 5. Firebase Integration
```typescript
// Already configured in firebase.js
import { auth, db } from '../firebase';
import { storage } from 'firebase/storage';

// Upload to Firebase Storage
const uploadImage = async (localUri: string, path: string) => {
  const blob = await fetch(localUri).then(r => r.blob());
  const ref = storage().ref(path);
  await ref.put(blob);
  return await ref.getDownloadURL();
};
```

### 📁 Simplified File Structure

```
app/
├── (drawer)/
│   └── sci/                     # SCI module
│       ├── _layout.tsx          # Stack navigator
│       ├── index.tsx            # Document list
│       ├── [id].tsx            # Document viewer
│       └── capture.tsx         # Camera screen
│
├── components/
│   └── sci/
│       ├── DocumentCard.tsx    # Using Paper Card
│       ├── ImageField.tsx      # Using expo-image
│       └── ImageUploadButton.tsx
│
├── contexts/
│   └── SCIContext.tsx          # Simple state management
│
├── services/
│   └── sci/
│       ├── imageService.ts     # Upload/compress logic
│       └── syncService.ts      # Offline sync
│
└── types/
    └── sci.ts                  # TypeScript interfaces
```

### 🎯 Implementation Approach

#### Phase 1: Core Setup (Day 1)
```bash
# Only installation needed
npx expo install expo-image-manipulator

# Everything else is ready!
```

#### Phase 2: Create Context & Types (Day 2)
- Set up SCIContext with documents state
- Create TypeScript interfaces
- Add to app/_layout.tsx providers

#### Phase 3: Build Screens (Days 3-5)
- Document list with React Native Paper
- Document viewer with sections
- Camera integration with expo-image-picker

#### Phase 4: Image Services (Days 6-7)
- Image compression with expo-image-manipulator
- Firebase Storage upload
- Offline queue with expo-file-system

### 💡 Why This Approach is Better

1. **Fewer Dependencies**: Using Expo's built-in tools
2. **Better Performance**: expo-image has superior caching
3. **Simpler State**: Context API is perfect for this scope
4. **Expo Optimized**: Everything works seamlessly in Expo
5. **Less Code**: No Redux boilerplate needed
6. **Faster Development**: Can start immediately

### 🚀 Quick Start Code

```typescript
// 1. Install the only missing piece
// Terminal: npx expo install expo-image-manipulator

// 2. Create the context (contexts/SCIContext.tsx)
import React, { createContext, useContext, useState } from 'react';

interface SCIContextType {
  documents: SCIDocument[];
  selectedDocument: SCIDocument | null;
  captureImage: (fieldType: string, itemIndex: number) => Promise<void>;
  syncQueue: () => Promise<void>;
}

const SCIContext = createContext<SCIContextType>(null);

export const useSCI = () => {
  const context = useContext(SCIContext);
  if (!context) throw new Error('useSCI must be within SCIProvider');
  return context;
};

// 3. Add image capture service (services/sci/imageService.ts)
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';

export const captureAndUploadImage = async (
  documentId: string,
  fieldPath: string
) => {
  // Launch camera
  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });
  
  if (result.canceled) return null;
  
  // Compress image
  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  
  // Upload to Firebase
  const filename = `${Date.now()}.jpg`;
  const storageRef = ref(storage, `sci/${documentId}/${fieldPath}/${filename}`);
  
  const response = await fetch(compressed.uri);
  const blob = await response.blob();
  
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};
```

### ✅ Benefits Summary

- **0 Redux complexity** - Simple Context API
- **1 new dependency** - Just expo-image-manipulator
- **Built-in caching** - expo-image handles it
- **Native performance** - Expo optimized components
- **Faster development** - Start coding immediately
- **Less to maintain** - Fewer moving parts

This approach leverages everything we already have and keeps it simple!