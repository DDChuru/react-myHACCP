/**
 * NCR (Non-Conformance Report) Type Definitions
 */

export interface NCRSeverity {
  id: 'critical' | 'major' | 'minor' | 'observation';
  name: string;
  level: 1 | 2 | 3 | 4;
  color: string;
  description: string;
  responseTime: string;
  escalationRequired: boolean;
  examples?: string[];
  icon?: string;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface NCRCategory {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface NCRIssue {
  id?: string;
  
  // Identification
  inspectionId: string;
  siteId: string;
  siteName: string;
  areaId: string;
  areaName: string;
  
  // Issue Details
  categoryId: string;
  categoryName?: string;
  severityId: 'critical' | 'major' | 'minor' | 'observation';
  severityLevel?: 1 | 2 | 3 | 4;
  description: string;
  
  // Evidence
  images?: {
    uri: string;
    annotations?: any[];
    timestamp?: any;
  }[];
  
  // Assignment
  responsiblePersonId: string;
  responsiblePersonName: string;
  responsiblePersonEmail?: string;
  proposedCompletionDate: any; // Firestore Timestamp
  
  // Status
  status: 'open' | 'acknowledged' | 'in-progress' | 'completed' | 'verified';
  
  // Corrective Action
  correctiveAction?: {
    description: string;
    implementedDate?: any;
    images?: {
      uri: string;
      timestamp?: any;
    }[];
    verifiedBy?: string;
    verifiedDate?: any;
  };
  
  // Acknowledgement
  acknowledgement?: {
    acknowledgedBy: string;
    acknowledgedDate: any;
    signature?: string;
    comments?: string;
  };
  
  // Metadata
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedAt: any;
  
  // Escalation
  escalated?: boolean;
  escalationHistory?: {
    escalatedTo: string;
    escalatedBy: string;
    escalatedDate: any;
    reason: string;
  }[];
}

// Severity level helpers
export const getSeverityColor = (severity: NCRSeverity['id']): string => {
  const colors = {
    critical: '#D32F2F',
    major: '#F57C00',
    minor: '#FBC02D',
    observation: '#388E3C'
  };
  return colors[severity] || '#757575';
};

export const getSeverityIcon = (severity: NCRSeverity['id']): string => {
  const icons = {
    critical: 'alert-octagon',
    major: 'alert',
    minor: 'alert-circle',
    observation: 'information'
  };
  return icons[severity] || 'alert-circle-outline';
};

export const getSeverityLevel = (severity: NCRSeverity['id']): number => {
  const levels = {
    critical: 1,
    major: 2,
    minor: 3,
    observation: 4
  };
  return levels[severity] || 4;
};

// Standard severities for reference
export const STANDARD_SEVERITIES: NCRSeverity[] = [
  {
    id: 'critical',
    name: 'Critical',
    level: 1,
    color: '#D32F2F',
    description: 'Immediate food safety risk',
    responseTime: '0-2 hours',
    escalationRequired: true
  },
  {
    id: 'major',
    name: 'Major',
    level: 2,
    color: '#F57C00',
    description: 'Significant compliance issue',
    responseTime: '2-24 hours',
    escalationRequired: true
  },
  {
    id: 'minor',
    name: 'Minor',
    level: 3,
    color: '#FBC02D',
    description: 'Quality concern',
    responseTime: '1-7 days',
    escalationRequired: false
  },
  {
    id: 'observation',
    name: 'Observation',
    level: 4,
    color: '#388E3C',
    description: 'Improvement opportunity',
    responseTime: '7-30 days',
    escalationRequired: false
  }
];