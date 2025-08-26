// SCI Document Types - Based on project plan specifications

export interface SCIDocument {
  id: string;
  documentNumber: string;
  title: string;
  companyId: string;
  categoryId: string;
  areas?: (string | { area?: string; name?: string; mcsRef?: string; mcsIdh?: string })[];
  content: SCIContent;
  metadata: DocumentMetadata;
  imageStats: ImageStats;
}

export interface SCIContent {
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

// Image-enabled field types
export interface PPERequirement {
  name: string;
  image?: string;
  imageUrl?: string;
  description?: string;
}

export interface SafetyPrecaution {
  title: string;
  description: string;
  image?: string;
  imageUrl?: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface Equipment {
  name: string;
  image?: string;
  imageUrl?: string;
  type?: string;
}

export interface SanitationStep {
  name: string;
  imageUrl?: string;
  description?: string;
  criticalLimit?: string;
  monitoringFrequency?: string;
}

export interface InspectionItem {
  name: string;
  image?: string;
  imageUrl?: string;
  acceptanceCriteria?: string;
  frequency?: string;
}

// Supporting types
export interface CleaningItem {
  id: string;
  name: string;
  description?: string;
}

export interface ColorCodeEntry {
  color: string;
  usage: string;
}

export interface Chemical {
  name: string;
  dilution?: string;
  contactTime?: string;
}

export interface CleaningInstruction {
  step: number;
  instruction: string;
}

export interface DocumentMetadata {
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
  version: string;
  status: 'draft' | 'active' | 'archived';
}

export interface ImageStats {
  total: number;
  captured: number;
  pending: number;
}

// Image handling types
export interface LocalImage {
  id: string;
  localUri: string;
  remoteUrl?: string;
  documentId: string;
  documentNumber: string;
  fieldType: ImageFieldType;
  fieldIndex: number;
  fieldName: string;
  capturedAt: Date | string;
  syncStatus: 'pending' | 'uploading' | 'synced' | 'failed';
  retryCount?: number;
  category?: 'cleaning' | 'inspection' | 'other'; // For 2-pronged storage approach
}

export type ImageFieldType = 
  | 'sanitationSteps'
  | 'postCleaningInspections'
  | 'ppeRequirements'
  | 'safetyPrecautions'
  | 'applicationEquipment';

export interface ImageUploadResult {
  originalUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  dimensions: { width: number; height: number };
  fileSize: number;
  mimeType: string;
}

// Helper function to check if a field has valid image URL
export const isValidImageUrl = (url: any): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  const placeholderTexts = ['photo placeholder', 'image placeholder', 'no image', 'add photo'];
  const lowerUrl = url.toLowerCase().trim();
  
  for (const placeholder of placeholderTexts) {
    if (lowerUrl.includes(placeholder)) return false;
  }
  
  return lowerUrl.startsWith('http://') || 
         lowerUrl.startsWith('https://') || 
         lowerUrl.startsWith('file://');
};

// Get display name for field type
export const getFieldDisplayName = (fieldType: ImageFieldType): string => {
  const names: Record<ImageFieldType, string> = {
    sanitationSteps: 'Sanitation Steps',
    postCleaningInspections: 'Post Cleaning Inspections',
    ppeRequirements: 'PPE Requirements',
    safetyPrecautions: 'Safety Precautions',
    applicationEquipment: 'Application Equipment',
  };
  return names[fieldType] || fieldType;
};