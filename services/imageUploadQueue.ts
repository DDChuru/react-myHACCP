import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { offlineService } from './offlineService';

const IMAGE_UPLOAD_QUEUE_KEY = '@image_upload_queue';

export interface PendingImageUpload {
  id: string;
  localUri: string;
  uploadPath: string; // Firebase Storage path
  inspectionId: string;
  issueId: string;
  imageIndex: number;
  companyId: string;
  annotations?: any[];
  timestamp: number;
  retryCount: number;
  uploadName: string;
}

class ImageUploadQueueService {
  private uploadInProgress = false;
  private maxRetries = 3;

  /**
   * Queue an image for upload when offline
   */
  async queueImageUpload(params: {
    localUri: string;
    inspectionId: string;
    issueId: string;
    imageIndex: number;
    companyId: string;
    annotations?: any[];
    uploadName: string;
  }): Promise<void> {
    try {
      const queue = await this.getQueue();
      
      const pendingUpload: PendingImageUpload = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        localUri: params.localUri,
        uploadPath: `companies/${params.companyId}/inspections/${params.inspectionId}/issues/${params.issueId}/${Date.now()}_${params.uploadName}`,
        inspectionId: params.inspectionId,
        issueId: params.issueId,
        imageIndex: params.imageIndex,
        companyId: params.companyId,
        annotations: params.annotations,
        timestamp: Date.now(),
        retryCount: 0,
        uploadName: params.uploadName
      };

      queue.push(pendingUpload);
      await AsyncStorage.setItem(IMAGE_UPLOAD_QUEUE_KEY, JSON.stringify(queue));
      
      console.log(`📸 Queued image for upload: ${params.uploadName}`);
    } catch (error) {
      console.error('Error queuing image upload:', error);
      throw error;
    }
  }

  /**
   * Get pending image uploads
   */
  async getQueue(): Promise<PendingImageUpload[]> {
    try {
      const queueJson = await AsyncStorage.getItem(IMAGE_UPLOAD_QUEUE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting image upload queue:', error);
      return [];
    }
  }

  /**
   * Process pending image uploads
   */
  async processPendingUploads(): Promise<void> {
    if (this.uploadInProgress || !offlineService.getIsOnline()) {
      return;
    }

    this.uploadInProgress = true;

    try {
      const queue = await this.getQueue();
      console.log(`🔄 Processing ${queue.length} pending image uploads...`);

      for (const item of queue) {
        try {
          await this.uploadImage(item);
          await this.removeFromQueue(item.id);
          console.log(`✅ Uploaded image: ${item.uploadName}`);
        } catch (error) {
          console.error(`❌ Failed to upload image ${item.id}:`, error);
          
          item.retryCount++;
          
          if (item.retryCount >= this.maxRetries) {
            console.warn(`⚠️ Max retries reached for image ${item.id}`);
            await this.moveToFailedQueue(item);
            await this.removeFromQueue(item.id);
          } else {
            // Update retry count in queue
            await this.updateQueueItem(item);
          }
        }
      }
    } catch (error) {
      console.error('Error processing image uploads:', error);
    } finally {
      this.uploadInProgress = false;
    }
  }

  /**
   * Upload a single image
   */
  private async uploadImage(item: PendingImageUpload): Promise<void> {
    // Fetch the image from local URI
    const response = await fetch(item.localUri);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, item.uploadPath);
    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Update the inspection document with the new image URL
    await this.updateInspectionWithImageUrl(
      item.inspectionId,
      item.issueId,
      item.imageIndex,
      downloadURL,
      item.companyId
    );
  }

  /**
   * Update inspection document with uploaded image URL
   */
  private async updateInspectionWithImageUrl(
    inspectionId: string,
    issueId: string,
    imageIndex: number,
    imageUrl: string,
    companyId: string
  ): Promise<void> {
    try {
      const inspectionRef = doc(db, `companies/${companyId}/selfInspections`, inspectionId);
      const inspectionDoc = await getDoc(inspectionRef);
      
      if (!inspectionDoc.exists()) {
        throw new Error('Inspection not found');
      }
      
      const inspection = inspectionDoc.data();
      const issues = inspection.issues || [];
      
      // Find the issue and update the image URL
      const issueIndex = issues.findIndex((i: any) => i.id === issueId);
      if (issueIndex !== -1) {
        if (issues[issueIndex].images && issues[issueIndex].images[imageIndex]) {
          issues[issueIndex].images[imageIndex].url = imageUrl;
          issues[issueIndex].images[imageIndex].pendingUpload = false;
          
          // Update the document
          await updateDoc(inspectionRef, { issues });
          console.log(`✅ Updated inspection with image URL`);
        }
      }
    } catch (error) {
      console.error('Error updating inspection with image URL:', error);
      throw error;
    }
  }

  /**
   * Remove item from queue
   */
  private async removeFromQueue(itemId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(item => item.id !== itemId);
    await AsyncStorage.setItem(IMAGE_UPLOAD_QUEUE_KEY, JSON.stringify(filtered));
  }

  /**
   * Update queue item
   */
  private async updateQueueItem(item: PendingImageUpload): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(q => q.id === item.id);
    if (index !== -1) {
      queue[index] = item;
      await AsyncStorage.setItem(IMAGE_UPLOAD_QUEUE_KEY, JSON.stringify(queue));
    }
  }

  /**
   * Move to failed queue
   */
  private async moveToFailedQueue(item: PendingImageUpload): Promise<void> {
    const failedQueueKey = '@failed_image_uploads';
    try {
      const failedJson = await AsyncStorage.getItem(failedQueueKey);
      const failed = failedJson ? JSON.parse(failedJson) : [];
      failed.push({
        ...item,
        failedAt: Date.now()
      });
      await AsyncStorage.setItem(failedQueueKey, JSON.stringify(failed));
    } catch (error) {
      console.error('Error moving to failed queue:', error);
    }
  }

  /**
   * Get pending upload count
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear all pending uploads
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(IMAGE_UPLOAD_QUEUE_KEY);
    console.log('🗑️ Cleared image upload queue');
  }
}

// Export singleton instance
export const imageUploadQueue = new ImageUploadQueueService();