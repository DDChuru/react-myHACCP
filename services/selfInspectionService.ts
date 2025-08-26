import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { offlineService } from './offlineService';

export interface Issue {
  id: string;
  areaId: string;
  areaName: string;
  category: string;
  categoryId: string;
  severity: string;
  severityId: string;
  severityLevel: number;
  description: string;
  images: Array<{
    uri: string;
    annotations?: any[];
    type?: string;
    uploadedAt?: string;
  }>;
  proposedActionDate: Date;
  responsibleUserId: string;
  responsibleUserName: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  acknowledged: boolean;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
}

export interface SelfInspection {
  id?: string;
  // Basic info
  name: string; // User-defined inspection name
  site: string;
  siteId: string;
  checklist: string;
  checklistId?: string;
  
  // Status tracking
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  
  // Progress
  totalItems: number;
  completedItems: number;
  
  // Issues found
  issues: Issue[]; // Embedded array of issues
  issueCount: number;
  
  // Timestamps
  createdAt: any;
  updatedAt: any;
  scheduledDate: Date | Timestamp;
  startedAt?: Date | Timestamp;
  completedAt?: Date | Timestamp;
  
  // User info
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  completedBy?: string;
  completedByName?: string;
  
  // Signature
  inspectorSignature?: string;
  signedAt?: Date | Timestamp;
  
  // Company
  companyId: string;
}

/**
 * Create a new self-inspection and persist immediately
 */
export async function createSelfInspection(
  inspection: Omit<SelfInspection, 'id' | 'createdAt' | 'updatedAt'>,
  companyId: string
): Promise<string> {
  const inspectionsRef = collection(db, `companies/${companyId}/selfInspections`);
  const newDocRef = doc(inspectionsRef);
  
  const inspectionData = {
    ...inspection,
    id: newDocRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    status: inspection.status || 'draft',
    completedItems: 0,
    issueCount: 0,
    issues: []
  };

  try {
    // Try to save to Firestore
    await setDoc(newDocRef, inspectionData);
    console.log('✅ Self-inspection created:', newDocRef.id);
    return newDocRef.id;
  } catch (error: any) {
    // If offline or error, queue for later
    if (!offlineService.getIsOnline() || error.code === 'unavailable') {
      console.log('📥 Queuing inspection for offline sync');
      await offlineService.queueOfflineOperation({
        type: 'inspection',
        action: 'create',
        data: inspectionData,
        companyId
      });
      // Return the generated ID for local use
      return newDocRef.id;
    }
    console.error('❌ Error creating self-inspection:', error);
    throw error;
  }
}

/**
 * Update an existing self-inspection
 */
export async function updateSelfInspection(
  inspectionId: string,
  updates: Partial<SelfInspection>,
  companyId: string
): Promise<void> {
  try {
    const inspectionRef = doc(db, `companies/${companyId}/selfInspections`, inspectionId);
    
    await updateDoc(inspectionRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Self-inspection updated:', inspectionId);
  } catch (error: any) {
    // If offline or error, queue for later
    if (!offlineService.getIsOnline() || error.code === 'unavailable') {
      console.log('📥 Queuing inspection update for offline sync');
      await offlineService.queueOfflineOperation({
        type: 'inspection',
        action: 'update',
        data: { id: inspectionId, updates },
        companyId
      });
      return; // Don't throw error for offline
    }
    console.error('❌ Error updating self-inspection:', error);
    throw error;
  }
}

/**
 * Get all self-inspections for a company
 */
export async function getSelfInspections(
  companyId: string,
  filterStatus?: string
): Promise<SelfInspection[]> {
  try {
    const inspectionsRef = collection(db, `companies/${companyId}/selfInspections`);
    
    let q = query(
      inspectionsRef,
      orderBy('scheduledDate', 'desc')
    );
    
    if (filterStatus) {
      q = query(
        inspectionsRef,
        where('status', '==', filterStatus),
        orderBy('scheduledDate', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    
    const inspections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SelfInspection));
    
    console.log(`📋 Loaded ${inspections.length} self-inspections`);
    return inspections;
  } catch (error) {
    console.error('❌ Error fetching self-inspections:', error);
    return [];
  }
}

/**
 * Get a single self-inspection by ID
 */
export async function getSelfInspection(
  inspectionId: string,
  companyId: string
): Promise<SelfInspection | null> {
  try {
    const inspectionRef = doc(db, `companies/${companyId}/selfInspections`, inspectionId);
    const docSnap = await getDoc(inspectionRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as SelfInspection;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching self-inspection:', error);
    return null;
  }
}

/**
 * Get today's pending inspections
 */
export async function getTodaysPendingInspections(
  companyId: string
): Promise<SelfInspection[]> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const inspectionsRef = collection(db, `companies/${companyId}/selfInspections`);
    
    const q = query(
      inspectionsRef,
      where('scheduledDate', '>=', Timestamp.fromDate(today)),
      where('scheduledDate', '<', Timestamp.fromDate(tomorrow)),
      where('status', 'in', ['pending', 'in_progress', 'draft']),
      orderBy('scheduledDate', 'asc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SelfInspection));
  } catch (error) {
    console.error('❌ Error fetching today\'s inspections:', error);
    return [];
  }
}

/**
 * Mark inspection as started
 */
export async function startInspection(
  inspectionId: string,
  companyId: string
): Promise<void> {
  await updateSelfInspection(
    inspectionId,
    {
      status: 'in_progress',
      startedAt: serverTimestamp()
    },
    companyId
  );
}

/**
 * Mark inspection as completed
 */
export async function completeInspection(
  inspectionId: string,
  completedBy: string,
  completedByName: string,
  companyId: string
): Promise<void> {
  await updateSelfInspection(
    inspectionId,
    {
      status: 'completed',
      completedAt: serverTimestamp(),
      completedBy,
      completedByName
    },
    companyId
  );
}

/**
 * Add an issue to an inspection (embeds in document array)
 */
export async function addIssueToInspection(
  inspectionId: string,
  issue: Issue,
  companyId: string
): Promise<void> {
  try {
    const inspection = await getSelfInspection(inspectionId, companyId);
    if (!inspection) {
      // If inspection not found locally, it might be pending offline
      if (!offlineService.getIsOnline()) {
        console.log('📥 Queuing issue for offline inspection');
        await offlineService.queueOfflineOperation({
          type: 'issue',
          action: 'create',
          data: { inspectionId, issue },
          companyId
        });
        return;
      }
      throw new Error('Inspection not found');
    }
    
    const updatedIssues = [...(inspection.issues || []), issue];
    
    await updateSelfInspection(
      inspectionId,
      {
        issues: updatedIssues,
        issueCount: updatedIssues.length
      },
      companyId
    );
  } catch (error: any) {
    // If offline, queue the issue
    if (!offlineService.getIsOnline() || error.code === 'unavailable') {
      console.log('📥 Queuing issue for offline sync');
      await offlineService.queueOfflineOperation({
        type: 'issue',
        action: 'create',
        data: { inspectionId, issue },
        companyId
      });
      return;
    }
    console.error('❌ Error adding issue to inspection:', error);
    throw error;
  }
}

/**
 * Update inspection progress
 */
export async function updateInspectionProgress(
  inspectionId: string,
  completedItems: number,
  totalItems: number,
  companyId: string
): Promise<void> {
  await updateSelfInspection(
    inspectionId,
    {
      completedItems,
      totalItems,
      status: completedItems === totalItems ? 'completed' : 'in_progress'
    },
    companyId
  );
}