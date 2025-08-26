export type CrewPosition = 
    | 'Supervisor'
    | 'Site Manager'
    | 'Quality Controller'
    | 'Cleaner';

export interface CrewMemberModel {
    id: string;
    
    // Required fields
    fullName: string;
    companyId: string;
    
    // Optional but high priority
    position?: CrewPosition;
    phoneNumber?: string;
    email?: string;
    photoUrl?: string;
    
    // Optional fields for later enrichment
    employeeNumber?: string;
    startDate?: Date | string;
    certificationExpiryDates?: Record<string, Date | string>;
    emergencyContact?: {
        name?: string;
        relationship?: string;
        phoneNumber?: string;
    };
    
    // Site assignment
    siteIds?: string[]; // Multiple sites for flexibility
    primarySiteId?: string; // Primary site assignment
    
    // Metadata
    createdBy: string; // UID of admin/siteAdmin who created
    createdByRole: 'admin' | 'siteAdmin';
    createdAt?: Date | string;
    updatedAt?: Date | string;
    
    // Status
    isActive?: boolean;
    
    // Training tracking (to be expanded later)
    completedTrainingIds?: string[];
    lastTrainingDate?: Date | string;
}

export interface CrewMemberFilters {
    siteId?: string;
    position?: CrewPosition;
    isActive?: boolean;
    searchTerm?: string; // For name/email/phone search
}