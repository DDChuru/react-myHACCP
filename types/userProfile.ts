import { RolesModel } from "./roles";

export type UserProfileModel = {
    id: string;
    email?: string;
    fullName?: string;
    companyId?: string;
    teamId?: string;
    roles?: RolesModel;
    siteId?: string;
    groupId?: string;
    divisionId?: string;
    departmentId?: string;    // For internal department assignment
    legacyId?: number;
    regionId?: string;
    imageUrl?: string;
    phoneNumber?: string;
    username?: string;
    defaultRegion?: string;
    defaultClient?: string;
    defaultView?: string;
    defaultDivision?: string;
    allocatedSiteIds?: string[];
    signatureUrl?: string;    // For stored signature
    pushToken?: string;        // For push notifications
    notificationsEnabled?: boolean;
}