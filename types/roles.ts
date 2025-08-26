export interface RolesModel {
    supervisor?: boolean;
    siteAdmin?: boolean;
    admin?: boolean;
    superAdmin?: boolean;
    tenantAdmin?: boolean; // New role for tenant-specific administration
    operations?: boolean;
    clientLiaison?: boolean;
    hr?: boolean;
    isClient?: boolean;
    isSiteManager?: boolean;
    leadAuditor?: boolean;
    documentController?: boolean;
    auditor?: boolean;
    processOwner?: boolean;
    icleanDeveloper?: boolean;
    icleanSupport?: boolean;
    icleanAdmin?: boolean;
    hygienist?: boolean; // New role for GMP compliance and manufacturing hygiene
    managementRepresentative?: boolean; // New role for tenant 'avi' for managing NCRs
    
    // Document workflow roles
    documentReviewer?: boolean; // Can review and comment on documents
    documentApprover?: boolean; // Can approve documents for publishing
    documentPublisher?: boolean; // Can publish approved documents
    qualityManager?: boolean; // Can override workflow rules for quality purposes
    
    // Crew Member role - limited access, training only
    crewMember?: boolean; // Can only access training modules
}