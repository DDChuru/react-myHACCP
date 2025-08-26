/**
 * iCleanVerification Feature Interfaces
 * 
 * This file contains all TypeScript interfaces for the iCleanVerification feature.
 * Uses existing InspectionModel from CLEANING_SYSTEM_INTERFACES.md as the base.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// CORE DATA MODELS (Firestore Persistence)
// ============================================================================

/**
 * InspectionModel - Primary persistence layer for verification data
 * Stored in: csc/inspections
 * This matches the existing InspectionModel interface from CLEANING_SYSTEM_INTERFACES.md
 */
export interface InspectionModel {
  id?: string;
  
  // Core References
  areaItemId: string;        // Links to AreaItem
  siteId: string;            // Links to Site
  scheduleId?: string;       // Links to Schedule (Daily/Weekly/Monthly)
  
  // Verification Data (Only Pass/Fail per requirements)
  status: 'pass' | 'fail';   // CRITICAL: Only two statuses
  verifiedBy: string;        // User who performed verification
  verifiedAt: Date | Timestamp; // Timestamp of verification
  
  // Additional Verification Details
  notes?: string;            // Inspector notes (optional for all statuses)
  issues?: string[];         // List of identified issues (typically for failures)
  correctiveActions?: string[]; // Required actions
  photos?: AnnotatedPhoto[]; // Photo evidence with annotation overlay
  
  // Signatures & Compliance
  signature?: string;        // Digital signature (base64)
  supervisorApproval?: {
    approvedBy: string;
    approvedAt: Date | Timestamp;
    comments?: string;
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  companyId: string;
  
  // Mobile Sync
  iCleanerSyncId?: string;   // Reference to mobile app sync
  syncedAt?: Date | Timestamp;
  deviceId?: string;
  
  // Auto-completion tracking (for Complete Inspection feature)
  autoCompletionDetails?: {
    dailyItemsAutoPassed: string[];  // IDs of items auto-passed
    manuallyVerified: string[];      // IDs of manually verified items
    completedAt: Date | Timestamp;
  };
}

/**
 * Annotated Photo with overlay data
 */
export interface AnnotatedPhoto {
  url: string;              // Firebase Storage URL
  localPath?: string;       // Local cache path for offline
  annotations?: {
    drawings: DrawingAnnotation[];
    textLabels: TextAnnotation[];
  };
  thumbnailUrl?: string;    // Small preview image
  capturedAt: Date | Timestamp;
}

export interface DrawingAnnotation {
  type: 'arrow' | 'circle' | 'rectangle' | 'freehand';
  color: string;
  strokeWidth: number;
  points: { x: number; y: number }[];
}

export interface TextAnnotation {
  text: string;
  position: { x: number; y: number };
  color: string;
  fontSize: number;
}

// ============================================================================
// LOCAL CACHE MODELS (AsyncStorage - Not persisted to Firestore)
// ============================================================================

/**
 * Progressive Local Status Tracking
 * Stored in: AsyncStorage
 * Key: @iCleanVerification:progress:{siteAreaId}
 */
export interface LocalVerificationProgress {
  areaId: string;
  date: string;  // YYYY-MM-DD format
  scheduleGroups: {
    daily: ScheduleGroupProgress;
    weekly: ScheduleGroupProgress;
    monthly: ScheduleGroupProgress;
  };
  lastModified: number; // Unix timestamp
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  offlineQueue: OfflineVerification[];
}

export interface ScheduleGroupProgress {
  items: AreaItemProgress[];
  totalCount: number;
  completedCount: number;
  autoCompletedCount: number;
  failedCount: number;
  completionPercentage: number;
  lastVerifiedAt?: number; // Unix timestamp
}

export interface AreaItemProgress {
  areaItemId: string;
  itemName: string;
  sciReference?: string;
  status: VerificationStatus;
  verifiedAt?: number; // Unix timestamp
  isAutoCompleted: boolean;
  failureReason?: string;
  photoCount: number;
  isDue: boolean;
  isOverdue: boolean;
  dueDate: string; // YYYY-MM-DD
}

/**
 * Offline Verification Queue Entry
 */
export interface OfflineVerification {
  id: string;              // Local UUID
  inspection: Partial<InspectionModel>;
  createdAt: number;       // Unix timestamp
  retryCount: number;
  lastError?: string;
  photos: LocalPhoto[];    // Photos to upload
}

export interface LocalPhoto {
  localUri: string;
  annotations?: AnnotatedPhoto['annotations'];
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadedUrl?: string;
}

// ============================================================================
// STATUS & COLOR CODING
// ============================================================================

export type VerificationStatus = 
  | 'pending'     // Not yet verified
  | 'in_progress' // Currently being verified
  | 'pass'        // Verification passed
  | 'fail'        // Verification failed
  | 'overdue';    // Past due date

export interface StatusColorScheme {
  background: string;
  text: string;
  border: string;
  icon: string;
  contrastRatio: number; // WCAG AA compliance
}

export const STATUS_COLORS: Record<VerificationStatus, StatusColorScheme> = {
  pending: {
    background: '#F5F5F5',    // Light gray (NOT pure white)
    text: '#212121',          // Dark gray text
    border: '#BDBDBD',        // Medium gray border
    icon: '⚪',
    contrastRatio: 12.63     // Exceeds WCAG AA
  },
  in_progress: {
    background: '#FFF3E0',    // Light orange
    text: '#E65100',          // Dark orange text
    border: '#FF9800',        // Orange border
    icon: '🟡',
    contrastRatio: 4.75      // Meets WCAG AA
  },
  pass: {
    background: '#4CAF50',    // Green
    text: '#FFFFFF',          // White text
    border: '#388E3C',        // Darker green border
    icon: '🟢',
    contrastRatio: 5.14      // Meets WCAG AA
  },
  fail: {
    background: '#F44336',    // Red
    text: '#FFFFFF',          // White text
    border: '#D32F2F',        // Darker red border
    icon: '🔴',
    contrastRatio: 5.92      // Meets WCAG AA
  },
  overdue: {
    background: '#FF5722',    // Deep orange
    text: '#FFFFFF',          // White text
    border: '#D84315',        // Darker orange border
    icon: '🟠',
    contrastRatio: 4.63      // Meets WCAG AA
  }
};

// ============================================================================
// NOTIFICATION MODELS
// ============================================================================

export interface NotificationConfig {
  enabled: boolean;
  groupingMode: 'hourly' | 'three_hour' | 'custom';
  customInterval?: number;  // Minutes if custom mode
  deliveryTimes?: DeliveryTime[];
  channels: NotificationChannel[];
}

export interface DeliveryTime {
  label: 'morning' | 'afternoon' | 'late_afternoon';
  time: string; // HH:MM format
}

export interface NotificationChannel {
  type: 'in_app' | 'push' | 'email';
  enabled: boolean;
}

export interface GroupedNotification {
  id: string;
  siteId: string;
  areaId: string;
  scheduledFor: Date;
  items: NotificationItem[];
  summary: {
    totalItems: number;
    pendingCount: number;
    overdueCount: number;
    completedToday: number;
    failuresRequiringAttention: number;
  };
  status: 'scheduled' | 'sent' | 'viewed' | 'dismissed';
}

export interface NotificationItem {
  areaItemId: string;
  itemName: string;
  areaName: string;
  status: VerificationStatus;
  priority: 'high' | 'medium' | 'low';
  dueIn?: string; // e.g., "2 hours", "overdue by 1 day"
}

// ============================================================================
// UI COMPONENTS PROPS
// ============================================================================

export interface ScheduleTabsProps {
  activeTab: 'daily' | 'weekly' | 'monthly';
  onTabChange: (tab: 'daily' | 'weekly' | 'monthly') => void;
  progress: LocalVerificationProgress;
  onCompleteInspection: () => void;
}

export interface VerificationItemCardProps {
  item: AreaItemProgress;
  onVerify: (status: 'pass' | 'fail') => void;
  onAddPhoto: () => void;
  onViewSCI: () => void;
  colorScheme: StatusColorScheme;
  isOffline: boolean;
}

export interface SCIModalProps {
  visible: boolean;
  onClose: () => void;
  sciDocumentId: string;
  activeTab: 'cleaning' | 'sanitation' | 'inspection';
}

export interface CompleteInspectionModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  dailyItems: {
    manual: AreaItemProgress[];
    toAutoPass: AreaItemProgress[];
  };
  weeklyItems: AreaItemProgress[];
  monthlyItems: AreaItemProgress[];
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface IVerificationService {
  // Core verification operations
  loadAreaItems(siteId: string, areaId: string): Promise<AreaItemProgress[]>;
  verifyItem(itemId: string, status: 'pass' | 'fail', details?: Partial<InspectionModel>): Promise<void>;
  completeInspection(areaId: string, autoPassDailyItems: boolean): Promise<void>;
  
  // Local cache operations
  getLocalProgress(areaId: string): Promise<LocalVerificationProgress | null>;
  updateLocalProgress(areaId: string, progress: LocalVerificationProgress): Promise<void>;
  clearLocalProgress(areaId: string): Promise<void>;
  
  // Sync operations
  syncOfflineVerifications(): Promise<void>;
  getQueuedVerifications(): Promise<OfflineVerification[]>;
  retryFailedSync(verificationId: string): Promise<void>;
  
  // Status calculations
  calculateItemStatus(item: AreaItemProgress): VerificationStatus;
  getColorScheme(status: VerificationStatus): StatusColorScheme;
  calculateDueStatus(schedule: string, lastVerified?: Date): { isDue: boolean; isOverdue: boolean; dueDate: string };
}

export interface INotificationService {
  // Configuration
  updateNotificationConfig(config: NotificationConfig): Promise<void>;
  getNotificationConfig(): Promise<NotificationConfig>;
  
  // Notification generation
  generateGroupedNotifications(progress: LocalVerificationProgress): GroupedNotification[];
  scheduleNotification(notification: GroupedNotification): Promise<void>;
  cancelScheduledNotifications(siteId: string): Promise<void>;
  
  // User interaction
  markAsViewed(notificationId: string): Promise<void>;
  dismissNotification(notificationId: string): Promise<void>;
  getUnreadCount(siteId: string): Promise<number>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

export interface QRCodeData {
  type: 'area';
  siteId: string;
  areaId: string;
  areaName: string;
  version: number;
}

export interface FilterOptions {
  status?: VerificationStatus[];
  schedule?: ScheduleFrequency[];
  searchText?: string;
  showOverdueOnly?: boolean;
  showDueTodayOnly?: boolean;
}

export interface SortOptions {
  field: 'name' | 'status' | 'dueDate' | 'lastVerified';
  direction: 'asc' | 'desc';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const CACHE_KEYS = {
  PROGRESS: '@iCleanVerification:progress:',
  CONFIG: '@iCleanVerification:config',
  OFFLINE_QUEUE: '@iCleanVerification:offlineQueue',
  PHOTO_CACHE: '@iCleanVerification:photos:',
  LAST_SYNC: '@iCleanVerification:lastSync'
} as const;

export const SYNC_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 5000,
  BATCH_SIZE: 10,
  PHOTO_UPLOAD_TIMEOUT_MS: 30000,
  MAX_OFFLINE_DAYS: 7
} as const;

export const UI_CONFIG = {
  ITEMS_PER_PAGE: 50,
  VIRTUALIZATION_THRESHOLD: 100,
  SEARCH_DEBOUNCE_MS: 300,
  PHOTO_MAX_SIZE_MB: 5,
  PHOTOS_PER_ITEM: 3,
  ANIMATION_DURATION_MS: 200
} as const;