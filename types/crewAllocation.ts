import { Timestamp } from 'firebase/firestore';

/**
 * Crew Allocation Types
 * Manages the assignment of crew members to site areas with area items tracking
 */

export interface SiteArea {
  id: string;
  siteId: string;
  siteName?: string;
  areaName: string;
  description?: string;
  areaCode?: string;
  companyId: string;
  isActive: boolean;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  
  // Area items count for KPI tracking
  totalAreaItems?: number;
  criticalItems?: number;
  
  // QR Code for area identification
  qrCode?: string;
}

export interface AreaItem {
  id: string;
  areaId: string;
  itemName: string;
  description?: string;
  sciDocumentId?: string; // Link to SCI document
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  isCritical: boolean;
  requiresTraining: boolean;
  trainingDocumentId?: string;
  companyId: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface CrewAreaAllocation {
  id: string;
  
  // Core allocation fields
  crewMemberId: string;
  crewMemberName: string; // Denormalized for quick display
  areaId: string;
  areaName: string; // Denormalized for quick display
  siteId: string;
  companyId: string;
  
  // Assignment details
  assignmentType: 'primary' | 'secondary' | 'backup' | 'temporary';
  startDate: Date | Timestamp;
  endDate?: Date | Timestamp; // null for permanent assignments
  
  // Shift information
  shift?: 'morning' | 'afternoon' | 'night' | 'rotating';
  workDays?: string[]; // ['monday', 'tuesday', ...] for specific days
  
  // Training & Competency
  isTrainedForArea: boolean;
  trainingCompletedDate?: Date | Timestamp;
  competencyScore?: number; // 0-100 score from assessments
  certificationExpiryDate?: Date | Timestamp;
  
  // Area Items Training Status
  trainedAreaItems?: string[]; // Array of areaItemIds the crew is trained for
  pendingTrainingItems?: string[]; // Items requiring training
  
  // Performance Metrics (for KPIs)
  assignedAreaItemsCount?: number;
  completedVerificationsCount?: number;
  failedVerificationsCount?: number;
  averageCompletionTime?: number; // in minutes
  lastVerificationDate?: Date | Timestamp;
  
  // Status and metadata
  status: 'active' | 'inactive' | 'pending' | 'expired';
  notes?: string;
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  
  // Notification preferences
  notifyOnAssignment?: boolean;
  notifyOnTrainingRequired?: boolean;
}

export interface CrewAllocationSummary {
  crewMemberId: string;
  crewMemberName: string;
  position?: string;
  photoUrl?: string;
  
  // Area allocations
  primaryAreas: AllocationDetail[];
  secondaryAreas: AllocationDetail[];
  backupAreas: AllocationDetail[];
  
  // Training summary
  totalAreasAssigned: number;
  fullyTrainedAreas: number;
  partiallyTrainedAreas: number;
  pendingTrainingAreas: number;
  
  // Performance summary
  overallCompetencyScore: number;
  totalVerifications: number;
  successRate: number;
  
  // Training KPIs
  totalAreaItems: number;
  trainedItemsCount: number;
  trainingCompletionRate: number;
  upcomingTrainingDeadlines: TrainingDeadline[];
}

export interface AllocationDetail {
  areaId: string;
  areaName: string;
  assignmentType: CrewAreaAllocation['assignmentType'];
  trainingStatus: 'completed' | 'in_progress' | 'pending';
  competencyScore?: number;
  itemsTrainingProgress: {
    total: number;
    trained: number;
    percentage: number;
  };
}

export interface TrainingDeadline {
  areaId: string;
  areaName: string;
  itemId?: string;
  itemName?: string;
  deadline: Date | Timestamp;
  type: 'certification_expiry' | 'mandatory_training' | 'refresher';
  priority: 'high' | 'medium' | 'low';
}

export interface AllocationFilters {
  siteId?: string;
  areaId?: string;
  crewMemberId?: string;
  assignmentType?: CrewAreaAllocation['assignmentType'];
  status?: CrewAreaAllocation['status'];
  trainingStatus?: 'trained' | 'untrained' | 'partial';
  shift?: CrewAreaAllocation['shift'];
  searchTerm?: string;
}

export interface BulkAllocationRequest {
  crewMemberIds: string[];
  areaIds: string[];
  assignmentType: CrewAreaAllocation['assignmentType'];
  startDate: Date;
  endDate?: Date;
  shift?: CrewAreaAllocation['shift'];
  workDays?: string[];
  notes?: string;
}

export interface TrainingProgressReport {
  reportDate: Date;
  siteId: string;
  siteName: string;
  
  // Overall metrics
  totalCrewMembers: number;
  totalAreas: number;
  totalAreaItems: number;
  totalAllocations: number;
  
  // Training metrics
  fullyTrainedAllocations: number;
  partiallyTrainedAllocations: number;
  untrainedAllocations: number;
  
  // Area coverage
  areasWithFullCoverage: number; // All shifts covered with trained crew
  areasWithPartialCoverage: number;
  areasWithNoCoverage: number;
  
  // Critical items coverage
  criticalItemsWithTrainedCrew: number;
  criticalItemsWithoutTrainedCrew: number;
  
  // Detailed breakdowns
  byArea: AreaTrainingStatus[];
  byCrew: CrewTrainingStatus[];
  
  // Recommendations
  trainingGaps: TrainingGap[];
  suggestedAllocations: SuggestedAllocation[];
}

export interface AreaTrainingStatus {
  areaId: string;
  areaName: string;
  totalItems: number;
  criticalItems: number;
  assignedCrew: number;
  fullyTrainedCrew: number;
  coveragePercentage: number;
  shifts: {
    morning: boolean;
    afternoon: boolean;
    night: boolean;
  };
}

export interface CrewTrainingStatus {
  crewMemberId: string;
  crewMemberName: string;
  position: string;
  areasAssigned: number;
  areasFullyTrained: number;
  itemsTrained: number;
  trainingCompletionRate: number;
  upcomingDeadlines: number;
}

export interface TrainingGap {
  areaId: string;
  areaName: string;
  itemId?: string;
  itemName?: string;
  gapType: 'no_coverage' | 'insufficient_trained' | 'expiring_certification';
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedShifts: string[];
  recommendedAction: string;
}

export interface SuggestedAllocation {
  crewMemberId: string;
  crewMemberName: string;
  areaId: string;
  areaName: string;
  reason: string;
  matchScore: number; // 0-100 based on skills, availability, etc.
  requiredTraining: string[];
}

// Service interface for crew allocation operations
export interface ICrewAllocationService {
  // CRUD operations
  createAllocation(allocation: Omit<CrewAreaAllocation, 'id'>): Promise<string>;
  updateAllocation(id: string, updates: Partial<CrewAreaAllocation>): Promise<void>;
  deleteAllocation(id: string): Promise<void>;
  getAllocation(id: string): Promise<CrewAreaAllocation | null>;
  
  // Query operations
  getAllocations(filters: AllocationFilters): Promise<CrewAreaAllocation[]>;
  getCrewSummary(crewMemberId: string): Promise<CrewAllocationSummary>;
  getAreaCoverage(areaId: string): Promise<AreaTrainingStatus>;
  
  // Bulk operations
  bulkAllocate(request: BulkAllocationRequest): Promise<string[]>;
  bulkUpdateTrainingStatus(allocationIds: string[], itemIds: string[]): Promise<void>;
  
  // Training operations
  recordTrainingCompletion(allocationId: string, itemIds: string[]): Promise<void>;
  getTrainingGaps(siteId: string): Promise<TrainingGap[]>;
  generateTrainingReport(siteId: string): Promise<TrainingProgressReport>;
  
  // Recommendations
  suggestAllocations(areaId: string): Promise<SuggestedAllocation[]>;
  optimizeShiftCoverage(siteId: string): Promise<BulkAllocationRequest[]>;
}

// Constants
export const ASSIGNMENT_TYPES = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  BACKUP: 'backup',
  TEMPORARY: 'temporary'
} as const;

export const SHIFTS = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  NIGHT: 'night',
  ROTATING: 'rotating'
} as const;

export const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export const ALLOCATION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  EXPIRED: 'expired'
} as const;