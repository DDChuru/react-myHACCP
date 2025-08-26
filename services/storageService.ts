import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  uploadString 
} from 'firebase/storage';
import { app } from '../firebase';
import { ImageUploadResult } from '../types/sci';

const storage = getStorage(app);

export class StorageService {
  private static instance: StorageService;
  
  private constructor() {}
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload an image to Firebase Storage
   */
  async uploadImage(
    localUri: string,
    documentId: string,
    fieldType: string,
    fieldIndex: number
  ): Promise<string> {
    try {
      console.log('[Storage] Starting upload:', { documentId, fieldType, fieldIndex, localUri: localUri.substring(0, 50) });
      
      // Validate inputs
      if (!localUri) {
        throw new Error('No image URI provided');
      }
      
      // Create a unique path for the image (sanitize fieldType for path)
      const timestamp = Date.now();
      const sanitizedFieldType = fieldType.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${documentId}_${sanitizedFieldType}_${fieldIndex}_${timestamp}.jpg`;
      const path = `sci-images/${documentId}/${sanitizedFieldType}/${filename}`;
      
      console.log('[Storage] Upload path:', path);
      
      // Create storage reference
      const storageRef = ref(storage, path);
      
      // Convert local URI to blob
      let blob;
      try {
        const response = await fetch(localUri);
        blob = await response.blob();
        console.log('[Storage] Blob created, size:', blob.size);
      } catch (fetchError) {
        console.error('[Storage] Failed to fetch image:', fetchError);
        throw new Error(`Failed to load image: ${fetchError.message}`);
      }
      
      // Upload the blob
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          documentId,
          fieldType: sanitizedFieldType,
          fieldIndex: fieldIndex.toString(),
          uploadedAt: new Date().toISOString()
        }
      });
      
      console.log('[Storage] Upload completed:', snapshot.metadata.fullPath);
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log('[Storage] Download URL obtained:', downloadUrl.substring(0, 100) + '...');
      
      return downloadUrl;
    } catch (error) {
      console.error('[Storage] Upload failed with details:', {
        error: error.message,
        code: error.code,
        documentId,
        fieldType,
        fieldIndex
      });
      throw error;
    }
  }

  /**
   * Upload base64 image (alternative method)
   */
  async uploadBase64Image(
    base64Data: string,
    documentId: string,
    fieldType: string,
    fieldIndex: number
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const filename = `${documentId}_${fieldType}_${fieldIndex}_${timestamp}.jpg`;
      const path = `sci-images/${documentId}/${fieldType}/${filename}`;
      
      const storageRef = ref(storage, path);
      
      // Upload base64 string
      const snapshot = await uploadString(storageRef, base64Data, 'base64', {
        contentType: 'image/jpeg',
        customMetadata: {
          documentId,
          fieldType,
          fieldIndex: fieldIndex.toString(),
          uploadedAt: new Date().toISOString()
        }
      });
      
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    } catch (error) {
      console.error('[Storage] Base64 upload failed:', error);
      throw error;
    }
  }
}