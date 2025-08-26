import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface SyncStatus {
  collection: string;
  status: 'pending' | 'syncing' | 'success' | 'error';
  count?: number;
  error?: string;
  lastSynced?: Date;
}

export interface SyncResult {
  success: boolean;
  collections: SyncStatus[];
  totalRecords: number;
  duration: number;
}

// Company-scoped collection paths
const getCSCPath = (companyId: string, collectionName: string) => {
  return `companies/${companyId}/${collectionName}`;
};

/**
 * Sync all collections needed for self-inspection module
 * This is primarily for development to ensure we have the latest data
 */
export async function syncSelfInspectionData(
  companyId: string = '2XTSaqxU41zCTBIVJeXb'
): Promise<SyncResult> {
  const startTime = Date.now();
  const syncStatuses: SyncStatus[] = [];
  let totalRecords = 0;

  // Collections to sync for self-inspection
  const collectionsToSync = [
    'ncrSeverity',       // NCR severities (legacy singular name)
    'ncrcategories',     // NCR categories (lowercase for CSC consistency)
    'sites',             // Company sites
    'userProfile',       // User profiles for assignment (root collection)
    'checklistTemplates', // Inspection checklist templates
    'inspectionAreas',   // Areas to inspect
    'correctionTypes',   // Types of corrective actions
  ];

  for (const collectionName of collectionsToSync) {
    const status: SyncStatus = {
      collection: collectionName,
      status: 'syncing'
    };
    syncStatuses.push(status);

    try {
      console.log(`Syncing ${collectionName}...`);
      
      // Get collection path - handle both CSC and root collections
      const collectionPath = collectionName === 'userProfile' 
        ? collectionName 
        : getCSCPath(companyId, collectionName);
      
      const snapshot = await getDocs(collection(db, collectionPath));
      
      status.count = snapshot.size;
      status.status = 'success';
      status.lastSynced = new Date();
      totalRecords += snapshot.size;
      
      console.log(`✅ Synced ${collectionName}: ${snapshot.size} records`);
      
      // Store in local state/cache (to be implemented with offline strategy)
      // For now, just reading to verify connectivity
      
    } catch (error) {
      status.status = 'error';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to sync ${collectionName}:`, error);
    }
  }

  const duration = Date.now() - startTime;
  const success = syncStatuses.every(s => s.status === 'success');

  return {
    success,
    collections: syncStatuses,
    totalRecords,
    duration
  };
}

/**
 * Sync a specific collection
 */
export async function syncCollection(
  companyId: string,
  collectionName: string
): Promise<SyncStatus> {
  const status: SyncStatus = {
    collection: collectionName,
    status: 'syncing'
  };

  try {
    const collectionPath = collectionName === 'userProfile' 
      ? collectionName 
      : getCSCPath(companyId, collectionName);
    
    const snapshot = await getDocs(collection(db, collectionPath));
    
    status.count = snapshot.size;
    status.status = 'success';
    status.lastSynced = new Date();
    
    return status;
  } catch (error) {
    status.status = 'error';
    status.error = error instanceof Error ? error.message : 'Unknown error';
    return status;
  }
}

/**
 * Create sample data for development if collections are empty
 */
export async function ensureDevData(companyId: string = '2XTSaqxU41zCTBIVJeXb') {
  console.log('Checking for development data...');
  
  // Check if NCR severities exist
  const severitiesPath = getCSCPath(companyId, 'ncrSeverity');
  const severitiesSnapshot = await getDocs(collection(db, severitiesPath));
  
  if (severitiesSnapshot.empty) {
    console.log('Creating NCR severities...');
    const severities = [
      { id: 'critical', name: 'Critical', level: 1, color: '#D32F2F' },
      { id: 'major', name: 'Major', level: 2, color: '#F57C00' },
      { id: 'minor', name: 'Minor', level: 3, color: '#FBC02D' },
      { id: 'observation', name: 'Observation', level: 4, color: '#388E3C' }
    ];
    
    for (const severity of severities) {
      await setDoc(
        doc(db, severitiesPath, severity.id),
        {
          ...severity,
          createdAt: serverTimestamp(),
          active: true
        }
      );
    }
    console.log('✅ Created NCR severities');
  }
  
  // Check if NCR categories exist
  const categoriesPath = getCSCPath(companyId, 'ncrcategories');
  const categoriesSnapshot = await getDocs(collection(db, categoriesPath));
  
  if (categoriesSnapshot.empty) {
    console.log('Creating NCR categories...');
    const categories = [
      { id: 'temperature', name: 'Temperature Control' },
      { id: 'hygiene', name: 'Personal Hygiene' },
      { id: 'cleaning', name: 'Cleaning & Sanitation' },
      { id: 'pest', name: 'Pest Control' },
      { id: 'documentation', name: 'Documentation' },
      { id: 'equipment', name: 'Equipment & Maintenance' }
    ];
    
    for (const category of categories) {
      await setDoc(
        doc(db, categoriesPath, category.id),
        {
          ...category,
          createdAt: serverTimestamp(),
          active: true
        }
      );
    }
    console.log('✅ Created NCR categories');
  }
  
  // Check inspection areas
  const areasPath = getCSCPath(companyId, 'inspectionAreas');
  const areasSnapshot = await getDocs(collection(db, areasPath));
  
  if (areasSnapshot.empty) {
    console.log('Creating inspection areas...');
    const areas = [
      { id: 'kitchen-a', name: 'Kitchen A', siteId: 'main-site' },
      { id: 'storage', name: 'Storage Room', siteId: 'main-site' },
      { id: 'prep-area', name: 'Prep Area', siteId: 'main-site' },
      { id: 'receiving', name: 'Receiving Area', siteId: 'main-site' }
    ];
    
    for (const area of areas) {
      await setDoc(
        doc(db, areasPath, area.id),
        {
          ...area,
          createdAt: serverTimestamp(),
          active: true
        }
      );
    }
    console.log('✅ Created inspection areas');
  }
}

/**
 * Get sync status from local storage/cache
 */
export function getSyncStatus(): Record<string, SyncStatus> {
  // TODO: Implement with AsyncStorage or other local storage
  return {};
}

/**
 * Clear all cached data (useful for development)
 */
export async function clearSyncCache() {
  // TODO: Implement cache clearing
  console.log('Cache cleared');
}