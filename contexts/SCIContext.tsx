import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { auth } from '../firebase';
import { SCIFirestoreService } from '../services/sciFirestoreService';
import { StorageService } from '../services/storageService';
import { 
  SCIDocument, 
  LocalImage, 
  ImageFieldType,
  isValidImageUrl 
} from '../types/sci';
import { debug, PerfTimer } from '../utils/debug';
import { checkNetworkStatus, subscribeToNetworkChanges } from '../utils/networkUtils';

interface SCIContextType {
  // State
  documents: SCIDocument[];
  selectedDocument: SCIDocument | null;
  imageQueue: LocalImage[];
  isLoading: boolean;
  isSyncing: boolean;
  
  // Actions
  loadDocuments: () => Promise<void>;
  selectDocument: (document: SCIDocument) => void;
  queueImage: (image: LocalImage) => Promise<void>;
  syncImageQueue: () => Promise<void>;
  getFieldImages: (documentId: string, fieldType: ImageFieldType) => LocalImage[];
  updateFieldImage: (
    documentId: string, 
    fieldType: ImageFieldType, 
    fieldIndex: number, 
    imageUrl: string
  ) => Promise<void>;
  clearDocument: () => void;
}

const SCIContext = createContext<SCIContextType | null>(null);

// Directory for offline image storage
const IMAGE_CACHE_DIR = `${FileSystem.documentDirectory}sci_images/`;
const QUEUE_FILE = `${FileSystem.documentDirectory}sci_image_queue.json`;

export const SCIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<SCIDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<SCIDocument | null>(null);
  const [imageQueue, setImageQueue] = useState<LocalImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsubscribe, setUnsubscribe] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  
  // Initialize services
  const sciService = SCIFirestoreService.getInstance();
  const storageService = StorageService.getInstance();

  // Initialize storage on mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Create directory if it doesn't exist
        const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
        }
        
        // Load queued images from disk
        await loadQueueFromDisk();
        
        // Check initial network status
        const online = await checkNetworkStatus();
        setIsOnline(online);
        console.log('[SCIContext] Initial network status:', online);
        
        // If online and have queued images, sync them
        if (online && imageQueue.length > 0) {
          console.log('[SCIContext] Online with queued images, starting sync...');
          syncImageQueue();
        }
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };

    initializeStorage();
    
    // Subscribe to network changes
    const unsubscribeNetwork = subscribeToNetworkChanges((online) => {
      setIsOnline(online);
      if (online && imageQueue.length > 0) {
        console.log('[SCIContext] Network restored, syncing queued images...');
        syncImageQueue();
      }
    });
    
    return () => {
      unsubscribeNetwork();
    };
  }, []);

  // Load queue from disk
  const loadQueueFromDisk = async () => {
    try {
      const queueInfo = await FileSystem.getInfoAsync(QUEUE_FILE);
      if (queueInfo.exists) {
        const queueData = await FileSystem.readAsStringAsync(QUEUE_FILE);
        const queue = JSON.parse(queueData) as LocalImage[];
        setImageQueue(queue);
      }
    } catch (error) {
      console.error('Failed to load queue from disk:', error);
    }
  };

  // Save queue to storage
  const saveQueueToDisk = async (queue: LocalImage[]) => {
    try {
      await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  };

  // Load SCI documents from Firestore
  const loadDocuments = async () => {
    const timer = new PerfTimer('Load SCI Documents');
    
    // Don't try to load if no user is logged in
    const user = auth.currentUser;
    if (!user) {
      console.log('[SCIContext] No user logged in, skipping document load');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      debug.log('Current user:', user?.email);

      // Try to fetch real documents from Firestore
      try {
        debug.log('Fetching SCI documents from Firestore...');
        debug.log('Company ID:', '2XTSaqxU41zCTBIVJeXb');
        debug.log('Category ID:', 'inxcJO4M5LI7sGZtOyl4');
        const firestoreDocuments = await sciService.fetchSCIDocuments();
        debug.success(`Fetched ${firestoreDocuments.length} documents from Firestore`);
        
        if (firestoreDocuments.length > 0) {
          setDocuments(firestoreDocuments);
          
          // Subscribe to real-time updates
          const unsub = sciService.subscribeToSCIDocuments((updatedDocs) => {
            debug.log('Real-time update received:', updatedDocs.length);
            setDocuments(updatedDocs);
          });
          
          setUnsubscribe(() => unsub);
          timer.end();
          return;
        }
      } catch (firestoreError) {
        debug.error('Firestore fetch failed, using sample data:', firestoreError);
      }

      // Fallback to sample data if Firestore fails or returns no documents
      const sampleDocuments: SCIDocument[] = [
        {
          id: '1',
          documentNumber: 'SCI-2025-001',
          title: 'Kitchen Deep Clean Procedure',
          companyId: 'company1',
          categoryId: 'kitchen',
          areas: ['Kitchen', 'Prep Area', 'Storage'],
          content: {
            sanitationSteps: [
              { name: 'Pre-rinse surfaces', description: 'Remove debris' },
              { name: 'Apply detergent', description: 'Use approved cleaner' },
              { name: 'Scrub surfaces', description: 'Use color-coded brushes' },
              { name: 'Final rinse', description: 'Hot water rinse' },
              { name: 'Sanitize', description: 'Apply sanitizer solution' },
            ],
            postCleaningInspections: [
              { name: 'Visual inspection', acceptanceCriteria: 'No visible debris' },
              { name: 'ATP testing', acceptanceCriteria: 'Below 10 RLU' },
              { name: 'Manager approval', acceptanceCriteria: 'Signed off' },
            ],
            ppeRequirements: [
              { name: 'Safety goggles', description: 'Chemical splash protection' },
              { name: 'Rubber gloves', description: 'Chemical resistant' },
              { name: 'Apron', description: 'Waterproof apron' },
            ],
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'admin',
            version: '1.0',
            status: 'active',
          },
          imageStats: {
            total: 11, // 5 sanitation + 3 inspections + 3 PPE
            captured: 0,
            pending: 0,
          },
        },
        {
          id: '2',
          documentNumber: 'SCI-2025-002',
          title: 'Equipment Sanitization Protocol',
          companyId: 'company1',
          categoryId: 'equipment',
          areas: ['Production Line', 'Equipment Room'],
          content: {
            sanitationSteps: [
              { name: 'Disassemble equipment', description: 'Follow manual' },
              { name: 'Pre-clean parts', description: 'Remove food particles' },
              { name: 'Wash in sink', description: 'Use hot soapy water' },
              { name: 'Sanitize parts', description: 'Immerse in sanitizer' },
            ],
            postCleaningInspections: [
              { name: 'Parts inspection', acceptanceCriteria: 'All parts clean' },
              { name: 'Reassembly check', acceptanceCriteria: 'Properly assembled' },
            ],
          },
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: 'admin',
            version: '1.0',
            status: 'active',
          },
          imageStats: {
            total: 6,
            captured: 0,
            pending: 0,
          },
        },
      ];

      setDocuments(sampleDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
      Alert.alert('Error', 'Failed to load SCI documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Select a document
  const selectDocument = (document: SCIDocument) => {
    setSelectedDocument(document);
  };

  // Clear selected document
  const clearDocument = () => {
    setSelectedDocument(null);
  };

  // Queue an image for upload
  const queueImage = async (image: LocalImage) => {
    console.log('[SCIContext] Queueing image, online status:', isOnline);
    
    const newQueue = [...imageQueue, image];
    setImageQueue(newQueue);
    await saveQueueToDisk(newQueue);
    
    // If online, immediately sync this image
    if (isOnline) {
      console.log('[SCIContext] Device is online, syncing immediately...');
      // Use setTimeout to avoid state update conflicts
      setTimeout(() => {
        syncSingleImage(image);
      }, 100);
    } else {
      console.log('[SCIContext] Device is offline, image queued for later sync');
    }
  };

  // Sync single image
  const syncSingleImage = async (image: LocalImage) => {
    try {
      console.log('[SCIContext] Syncing single image:', image.id);
      
      // Upload to Firebase Storage
      const downloadUrl = await storageService.uploadImage(
        image.localUri,
        image.documentId,
        image.fieldType,
        image.fieldIndex
      );
      
      console.log('[SCIContext] Image uploaded successfully:', downloadUrl);
      
      // Update Firestore document with the new URL
      await sciService.updateDocumentField(
        image.documentId,
        image.fieldType,
        image.fieldIndex,
        downloadUrl
      );
      
      // Remove from queue
      const updatedQueue = imageQueue.filter(img => img.id !== image.id);
      setImageQueue(updatedQueue);
      await saveQueueToDisk(updatedQueue);
      
      // Update local document state
      await updateFieldImage(
        image.documentId,
        image.fieldType,
        image.fieldIndex,
        downloadUrl
      );
      
      console.log('[SCIContext] Image sync completed successfully');
    } catch (error) {
      console.error('[SCIContext] Failed to sync image:', error);
      // Update image status to failed
      const updatedQueue = imageQueue.map(img => 
        img.id === image.id 
          ? { ...img, syncStatus: 'failed' as const, retryCount: (img.retryCount || 0) + 1 }
          : img
      );
      setImageQueue(updatedQueue);
      await saveQueueToDisk(updatedQueue);
    }
  };

  // Sync image queue
  const syncImageQueue = async () => {
    if (imageQueue.length === 0) return;
    
    console.log('[SCIContext] Starting batch sync of', imageQueue.length, 'images');
    setIsSyncing(true);
    const failedImages: LocalImage[] = [];
    
    for (const image of imageQueue) {
      try {
        console.log('[SCIContext] Uploading image:', image.id);
        
        // Upload to Firebase Storage
        const downloadUrl = await storageService.uploadImage(
          image.localUri,
          image.documentId,
          image.fieldType,
          image.fieldIndex
        );
        
        console.log('[SCIContext] Image uploaded, updating Firestore...');
        
        // Update Firestore document
        await sciService.updateDocumentField(
          image.documentId,
          image.fieldType,
          image.fieldIndex,
          downloadUrl
        );
        
        // Update local document state
        await updateFieldImage(
          image.documentId,
          image.fieldType,
          image.fieldIndex,
          downloadUrl
        );
        
        console.log('[SCIContext] Image sync completed');
      } catch (error) {
        console.error('[SCIContext] Failed to upload image:', error);
        failedImages.push({
          ...image,
          retryCount: (image.retryCount || 0) + 1,
          syncStatus: 'failed',
        });
      }
    }
    
    setImageQueue(failedImages);
    await saveQueueToDisk(failedImages);
    setIsSyncing(false);
    
    if (failedImages.length > 0) {
      Alert.alert(
        'Sync Incomplete',
        `${failedImages.length} images failed to upload. They will be retried when network is available.`
      );
    } else {
      console.log('[SCIContext] All images synced successfully');
    }
  };

  // Get images for a specific field
  const getFieldImages = (documentId: string, fieldType: ImageFieldType): LocalImage[] => {
    return imageQueue.filter(
      img => img.documentId === documentId && img.fieldType === fieldType
    );
  };

  // Update field image in Firestore
  const updateFieldImage = async (
    documentId: string,
    fieldType: ImageFieldType,
    fieldIndex: number,
    imageUrl: string
  ) => {
    try {
      // Update local state
      const updatedDocs = documents.map(doc => {
        if (doc.id === documentId) {
          const content = { ...doc.content };
          const field = content[fieldType];
          
          if (Array.isArray(field) && field[fieldIndex]) {
            field[fieldIndex] = {
              ...field[fieldIndex],
              imageUrl,
              image: imageUrl,
            };
          }
          
          return {
            ...doc,
            content,
            imageStats: {
              ...doc.imageStats,
              captured: doc.imageStats.captured + 1,
            },
          };
        }
        return doc;
      });
      
      setDocuments(updatedDocs);
      
      // In production, update Firestore
      // const docRef = doc(db, 'sciDocuments', documentId);
      // await updateDoc(docRef, {
      //   [`content.${fieldType}.${fieldIndex}.imageUrl`]: imageUrl,
      //   'imageStats.captured': increment(1),
      // });
    } catch (error) {
      console.error('Failed to update field image:', error);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unsubscribe]);

  const value: SCIContextType = {
    documents,
    selectedDocument,
    imageQueue,
    isLoading,
    isSyncing,
    loadDocuments,
    selectDocument,
    queueImage,
    syncImageQueue,
    getFieldImages,
    updateFieldImage,
    clearDocument,
  };

  return <SCIContext.Provider value={value}>{children}</SCIContext.Provider>;
};

// Custom hook to use SCI context
export const useSCI = () => {
  const context = useContext(SCIContext);
  if (!context) {
    throw new Error('useSCI must be used within SCIProvider');
  }
  return context;
};