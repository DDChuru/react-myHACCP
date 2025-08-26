# Self-Inspection Feature Plan

## Feature Overview
A comprehensive self-inspection module enabling site managers and QA teams to conduct regular facility inspections, identify non-conformances, assign corrective actions, and track resolution through to completion.

## Technical Requirements

### Core Functionality
- Create self-inspections for specific company sites
- Area-based inspection workflow with selective area inclusion
- Issue identification and categorization system
- Corrective action assignment and tracking
- Acknowledgement workflow for assigned responsibilities
- Multi-image support for issues and resolutions
- Dashboard analytics and monitoring
- Cross-platform compatibility (React Native + Web)

### Data Models/Collections

#### Company-Scoped Collections (CSC)

**csc/self_inspections**
```javascript
{
  id: string,
  siteId: string,
  siteName: string,
  inspectionDate: timestamp,
  inspectorId: string,
  inspectorName: string,
  areas: [
    {
      areaId: string,
      areaName: string,
      inspected: boolean,
      issueCount: number
    }
  ],
  status: 'in_progress' | 'completed' | 'cancelled',
  totalIssues: number,
  resolvedIssues: number,
  completionRate: number,
  createdAt: timestamp,
  updatedAt: timestamp,
  completedAt: timestamp | null
}
```

**csc/inspection_issues**
```javascript
{
  id: string,
  inspectionId: string,
  siteId: string,
  areaId: string,
  areaName: string,
  
  // Issue Details
  // NCR category - populated from csc/ncrcategories collection
  category: string,  // Dynamic from company's NCR categories
  categoryId: string,  // Reference to ncrcategories document
  
  // NCR severity - populated from csc/ncrseverities collection  
  severity: string,  // Dynamic from company's NCR severities
  severityId: string,  // Reference to ncrseverities document
  severityLevel: number,  // Numeric level for sorting/escalation
  description: string,
  images: [
    {
      url: string,
      annotations: Array<{  // Using existing annotation component
        x: number,
        y: number,
        text: string,
        color: string,
        timestamp: Date
      }>,
      uploadedAt: timestamp,
      uploadedBy: string
    }
  ],
  
  // Assignment & Tracking
  responsibleUserId: string,
  responsibleUserName: string,
  responsibleUserEmail: string,
  actionByDate: timestamp,
  acknowledgedAt: timestamp | null,
  acknowledgedBy: string | null,
  
  // Resolution
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'verified',
  correctiveAction: string | null,
  resolutionImages: [
    {
      url: string,
      uploadedAt: timestamp,
      uploadedBy: string
    }
  ],
  resolvedAt: timestamp | null,
  resolvedBy: string | null,
  verifiedAt: timestamp | null,
  verifiedBy: string | null,
  
  // Metadata
  createdAt: timestamp,
  createdBy: string,
  updatedAt: timestamp,
  isOverdue: boolean
}
```

**csc/sites** (existing collection)
```javascript
{
  id: string,
  name: string,
  address: string,
  // ... other existing fields
}
```

**csc/siteAreas** (existing collection)
```javascript
{
  id: string,
  siteId: string,  // Links to csc/sites
  name: string,
  type: string,
  // ... other existing fields
}
```

### Site/Area Selection Flow & Access Control

#### Role-Based Site Access
- **Admin Users**: 
  - See ALL sites across the company
  - Can create inspections for any site
  - Can view all inspections across all sites
  - No site restrictions in queries
  
- **SiteAdmin Users**: 
  - See ONLY their assigned sites
  - Site access determined by user profile `assignedSites` array
  - Can only create inspections for assigned sites
  - Cannot view inspections from unassigned sites

#### Inspection Creation Access
- **Role-agnostic**: Any user with site access can create self-inspections
- Both Admin and SiteAdmin users can start inspections if they have site access
- No special "inspector" role required - access is determined by site assignment

#### Responsible User Selection
- Pull from all users who have access to the inspection site
- For Admin users: Can assign to any user in the company
- For SiteAdmin users: Can assign to other users with access to the same site
- Display user name and email for clarity during selection

#### Site/Area Selection UI Flow
1. **Site Selection Screen**:
   - Query `csc/sites` based on user role:
     - Admin: `collection(db, 'companies/${companyId}/sites')`
     - SiteAdmin: `where(documentId(), 'in', user.assignedSites)`
   - Display site list with name, address, and area count
   - Search/filter capability for large site lists

2. **Area Selection Screen** (after site selection):
   - Query `csc/siteAreas` filtered by selected `siteId`
   - Display all areas for the selected site
   - Multi-select checkboxes for area selection
   - "Select All" / "Deselect All" quick actions
   - Area grouping by type (if applicable)

3. **Data Retrieval Pattern**:
```javascript
// For Admin users - get all sites
const sitesQuery = collection(db, `companies/${companyId}/sites`);

// For SiteAdmin users - filter by assignedSites
const sitesQuery = query(
  collection(db, `companies/${companyId}/sites`),
  where(documentId(), 'in', user.assignedSites)
);

// Get areas for selected site (same for all users)
const areasQuery = query(
  collection(db, `companies/${companyId}/siteAreas`),
  where('siteId', '==', selectedSiteId)
);

// Get users for responsible person dropdown
// Admin users - all company users
const usersQuery = query(
  collection(db, 'users'),
  where('companyId', '==', companyId)
);

// SiteAdmin users - users with access to current site
const usersQuery = query(
  collection(db, 'users'),
  where('companyId', '==', companyId),
  where('assignedSites', 'array-contains', selectedSiteId)
);
```

#### User Profile Enhancement
```javascript
{
  // ... existing user fields ...
  role: 'Admin' | 'SiteAdmin' | 'User',
  assignedSites: string[], // Array of site IDs for SiteAdmin users
  companyId: string,
  signatureUrl: string | null,
  // ... other fields ...
}
```

### Integration Points
- Firebase Authentication for user management
- Firebase Storage for image uploads
- Firestore real-time listeners for status updates
- Push notifications for:
  - New issue assignments
  - Overdue action reminders
  - Issue resolution notifications
  - Acknowledgement requests

## User Stories

### Inspector/QA Manager
- As an inspector, I want to create a new self-inspection for a specific site
- As an inspector, I want to select which areas to inspect from the site's area list
- As an inspector, I want to add issues with photos and assign them to responsible persons
- As an inspector, I want to set severity levels and due dates for corrective actions
- As an inspector, I want to see the completion status of my inspections

### Responsible Person (Issue Assignee)
- As a responsible person, I want to see all issues assigned to me
- As a responsible person, I want to acknowledge that I've seen and planned for an issue
- As a responsible person, I want to add corrective actions and upload resolution photos
- As a responsible person, I want to mark issues as resolved
- As a responsible person, I want to receive notifications for new assignments

### Site Manager
- As a site manager, I want to see all inspections for my site
- As a site manager, I want to track pending issues and overdue actions
- As a site manager, I want to see completion rates and trends
- As a site manager, I want to verify that corrective actions have been completed

### Admin/Management
- As an admin, I want to see company-wide inspection metrics
- As an admin, I want to identify sites with recurring issues
- As an admin, I want to track acknowledgement response times
- As an admin, I want to export inspection reports

## Acceptance Criteria

### Inspection Creation
- ✓ User can select a site from their authorized sites list
- ✓ User can select specific areas to inspect (not forced to inspect all)
- ✓ User can save inspection as draft and continue later
- ✓ System auto-saves progress to prevent data loss

### Issue Management
- ✓ User can add multiple issues per area
- ✓ Each issue requires: category, severity, description, responsible person, action date
- ✓ User can attach multiple photos to each issue
- ✓ System validates that action date is in the future
- ✓ System sends notification to responsible person upon assignment

### Acknowledgement Workflow
- ✓ Responsible person receives notification of new assignment
- ✓ Acknowledgement button is prominently displayed
- ✓ System tracks acknowledgement timestamp and user
- ✓ Dashboard shows acknowledged vs unacknowledged issues
- ✓ Managers can see which issues haven't been acknowledged

### Corrective Actions
- ✓ Responsible person can add detailed corrective action description
- ✓ Multiple resolution photos can be uploaded
- ✓ Status updates trigger notifications to inspector
- ✓ Issues cannot be closed without corrective action details

### Dashboard & Analytics
- ✓ Real-time count of pending issues
- ✓ Overdue actions highlighted in red
- ✓ Completion rate calculation: (resolved issues / total issues) * 100
- ✓ Acknowledgement rate tracking
- ✓ Filter by: site, date range, severity, status, responsible person
- ✓ Trend charts for issues over time

### Data Integrity
- ✓ All timestamps use server time (not client)
- ✓ User permissions enforced at database rules level
- ✓ Soft delete for inspections (status: 'cancelled')
- ✓ Audit trail maintained through updatedAt fields

## Implementation Notes

### Phase 1: Core Inspection Flow
1. Create inspection UI with site/area selection
2. Issue creation form with image upload
3. Basic listing of inspections and issues
4. Status management (open/resolved)

### Phase 2: Assignment & Acknowledgement
1. User assignment dropdown with email display
2. Acknowledgement button and timestamp tracking
3. Push notification integration
4. "My Issues" view for responsible persons

### Phase 3: Dashboard & Analytics
1. Metrics calculation and display
2. Filtering and search capabilities
3. Trend charts and visualizations
4. Export functionality

### Technical Considerations
- Use Firestore compound queries for efficient filtering
- Implement optimistic UI updates for better UX
- Cache site/area data locally to reduce reads
- Use Firebase Storage rules to restrict image access
- Implement batch writes for multi-issue creation
- Consider pagination for large issue lists

## Critical Additional Requirements

### 1. Signature Capture System

#### Implementation Strategy
- **Auditor Signature**: One signature per inspection completion
- **Responsible Person Signature**: One signature per issue resolution
- **Profile Integration**: Check user profile for existing `signatureUrl` field
  - If exists: Use stored signature automatically
  - If not exists: Prompt for signature capture and save to profile

#### Data Model Updates

**csc/self_inspections** (add fields):
```javascript
{
  // ... existing fields ...
  auditorSignature: {
    signatureUrl: string,      // URL to signature image or base64
    signedAt: timestamp,
    signedBy: string,          // userId
    fromProfile: boolean        // true if using stored signature
  }
}
```

**csc/inspection_issues** (add fields):
```javascript
{
  // ... existing fields ...
  resolutionSignature: {
    signatureUrl: string,
    signedAt: timestamp,
    signedBy: string,
    fromProfile: boolean
  }
}
```

**users collection** (profile enhancement):
```javascript
{
  // ... existing fields ...
  signatureUrl: string | null,  // Stored signature for reuse
  signatureUpdatedAt: timestamp
}
```

### 2. Offline Mode Architecture (CRITICAL)

#### Caching Strategy

**Primary Cache Collections**:
```javascript
// Local SQLite/AsyncStorage structure
{
  // Essential data for offline operations
  "offline_cache": {
    "sites": [],              // All user's authorized sites
    "areas": [],              // All areas for cached sites
    "users": [],              // Team members for assignment
    "pending_inspections": [], // Draft inspections
    "pending_issues": [],     // Unsynced issues
    "pending_uploads": []     // Queue for image uploads
  },
  
  // Recent data for reference
  "recent_cache": {
    "last_30_days_inspections": [],
    "open_issues": [],
    "my_assigned_issues": []
  }
}
```

**Sync Queue Management**:
```javascript
{
  "sync_queue": [
    {
      id: string,
      type: 'inspection' | 'issue' | 'image' | 'signature',
      operation: 'create' | 'update' | 'delete',
      data: object,
      attempts: number,
      lastAttempt: timestamp,
      priority: 'high' | 'normal' | 'low'
    }
  ]
}
```

**Offline Capabilities**:
- ✓ Create new inspections
- ✓ Add issues with local image storage
- ✓ View recent inspections (last 30 days)
- ✓ View and update assigned issues
- ✓ Capture signatures locally
- ✗ Real-time notifications (queued for sync)
- ✗ View historical reports (beyond cache)

**Sync Protocol**:
1. On network restoration, sync in priority order:
   - High: Safety critical issues, overdue items
   - Normal: New inspections, issue updates
   - Low: Images, signatures, analytics
2. Conflict resolution: Server timestamp wins, maintain audit log
3. Retry strategy: Exponential backoff with max 5 attempts

### 3. Company/Tenant Configuration Schema

**Configuration Storage**: All self-inspection configurations are stored in a single document at `companies/${companyId}/config/self-inspection`. The mobile app reads these configurations but does not modify them - all configuration changes must be done through the web UI.

**Default Values**: When no configuration exists, the system uses these defaults:
- QR scanning: disabled
- Recurring inspections: disabled  
- Notifications: in-app only enabled
- Escalation: disabled
- RACI matrix: empty (manual assignment required)

**companies/${companyId}/config/self-inspection document**:
```javascript
{
  id: 'self-inspection',  // Fixed document ID
  lastUpdated: timestamp,
  lastUpdatedBy: string,
  
  inspectionConfig: {
    // QR Scanning Configuration
    qrScanningRequired: boolean,
    qrScanningMode: 'mandatory' | 'optional' | 'disabled',
    qrCodeFormat: 'area_id' | 'custom_format',
    
    // Recurring Inspection Scheduling
    recurringInspections: {
      enabled: boolean,
      frequency: 'daily' | 'weekly' | 'monthly' | 'custom',
      customSchedule: {
        daysOfWeek: number[], // [1,3,5] for Mon, Wed, Fri
        daysOfMonth: number[], // [1,15] for 1st and 15th
        time: string          // "09:00" in 24h format
      },
      autoAssignInspector: boolean,
      defaultInspectorId: string | null,
      reminderHoursBefore: number // Send reminder X hours before
    },
    
    // Notification Preferences
    notifications: {
      channels: {
        email: boolean,
        whatsapp: boolean,
        inApp: boolean  // Always true, cannot be disabled
      },
      whatsappConfig: {
        apiKey: string,
        phoneNumbers: string[] // Admin numbers for escalation
      },
      emailConfig: {
        fromAddress: string,
        replyTo: string
      },
      
      // Notification triggers
      triggers: {
        newIssueAssignment: ['email', 'whatsapp', 'inApp'],
        issueAcknowledged: ['inApp'],
        issueResolved: ['email', 'inApp'],
        overdueReminder: ['email', 'whatsapp', 'inApp'],
        inspectionCompleted: ['email', 'inApp']
      }
    },
    
    // Automatic Escalation Settings
    escalation: {
      enabled: boolean,
      levels: [
        {
          triggerHours: 24,  // Hours after issue creation
          condition: 'not_acknowledged' | 'not_resolved',
          escalateTo: 'manager' | 'area_head' | 'custom_role',
          notificationChannels: ['email', 'whatsapp', 'inApp']
        },
        {
          triggerHours: 48,
          condition: 'not_resolved',
          escalateTo: 'senior_management',
          notificationChannels: ['email', 'whatsapp', 'inApp']
        }
      ]
    }
  }
}
```

### 4. RACI Matrix Implementation (Stored in Config Document)

**RACI Configuration**: The RACI matrix is stored within the main configuration document at `companies/${companyId}/config/self-inspection` under the `raciMatrix` field. This ensures all configurations are centralized.

### NCR Categories and Severities

**csc/ncrcategories** (existing collection - plural):
```javascript
{
  id: string,
  name: string,  // Display name e.g., "Biological Hazard", "Chemical Contamination"
  code: string,  // Short code e.g., "BIO", "CHEM"
  description: string,
  active: boolean,
  order: number,  // Display order
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**csc/ncrseverities** (existing collection - plural):
```javascript
{
  id: string,
  name: string,  // e.g., "Critical", "Major", "Minor"
  level: number,  // 1 = most severe, higher numbers = less severe
  color: string,  // Hex color for UI display
  description: string,
  escalationHours: number,  // Hours before auto-escalation
  requiresImmediateAction: boolean,
  active: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Usage in Mobile App**:
```javascript
// Fetch NCR categories for dropdown
const categoriesQuery = query(
  collection(db, `companies/${companyId}/ncrcategories`),
  where('active', '==', true),
  orderBy('order')
);

// Fetch NCR severities for dropdown
const severitiesQuery = query(
  collection(db, `companies/${companyId}/ncrseverities`),
  where('active', '==', true),
  orderBy('level')
);

// When creating an issue
const issue = {
  category: selectedCategory.name,
  categoryId: selectedCategory.id,
  severity: selectedSeverity.name,
  severityId: selectedSeverity.id,
  severityLevel: selectedSeverity.level,
  // ... other fields
};
```

**csc/raci_matrix** (new collection):
```javascript
{
  id: string,
  scope: 'site' | 'area',  // Flexibility for site-wide or area-specific
  scopeId: string,          // siteId or areaId
  scopeName: string,
  
  matrix: {
    selfInspection: {
      responsible: string[],  // User IDs who execute
      accountable: string,    // Single user ID who owns outcome
      consulted: string[],    // User IDs who provide input
      informed: string[]      // User IDs who receive updates
    },
    
    issueResolution: {
      responsible: string[],
      accountable: string,
      consulted: string[],
      informed: string[]
    },
    
    escalation: {
      level1: {
        responsible: string[],
        accountable: string,
        consulted: string[],
        informed: string[]
      },
      level2: {
        responsible: string[],
        accountable: string,
        consulted: string[],
        informed: string[]
      }
    }
  },
  
  overrides: [  // Specific exceptions
    {
      issueCategory: 'critical' | 'biological',
      customMatrix: {
        responsible: string[],
        accountable: string,
        consulted: string[],
        informed: string[]
      }
    }
  ],
  
  effectiveFrom: timestamp,
  effectiveTo: timestamp | null,
  createdBy: string,
  updatedAt: timestamp
}
```

**RACI Storage Structure** (within config document):
```javascript
{
  // ... other config fields ...
  
  raciMatrix: {
    global: {  // Company-wide defaults
      selfInspection: {
        responsible: string[],  // User IDs
        accountable: string,
        consulted: string[],
        informed: string[]
      },
      issueResolution: {
        responsible: string[],
        accountable: string,
        consulted: string[],
        informed: string[]
      }
    },
    
    siteOverrides: {  // Site-specific overrides
      [siteId]: {
        selfInspection: { /* RACI structure */ },
        issueResolution: { /* RACI structure */ }
      }
    },
    
    areaOverrides: {  // Area-specific overrides
      [areaId]: {
        selfInspection: { /* RACI structure */ },
        issueResolution: { /* RACI structure */ }
      }
    },
    
    severityOverrides: {  // Severity-based overrides
      [severityId]: {
        responsible: string[],
        accountable: string,
        consulted: string[],
        informed: string[]
      }
    }
  }
}
```

**RACI Integration Points**:
1. **Issue Assignment**: Auto-populate responsible person based on RACI
2. **Notifications**: Send to all RACI members based on their role
3. **Escalation**: Follow RACI escalation path
4. **Dashboard Access**: Filter views based on RACI role
5. **Reporting**: Include RACI compliance metrics

### Security & Permissions
- Users can only see inspections for their authorized sites
- Only inspectors can create/edit inspections
- Responsible persons can only edit their assigned issues
- Managers have read access to all site data
- Image uploads restricted to authenticated users

### Performance Optimizations
- Lazy load images in lists
- Implement virtual scrolling for large datasets
- Use Firestore indexes for common queries
- Cache user and site data in context
- Debounce search inputs

### Error Handling
- Network failure recovery with local queue
- Image upload retry mechanism
- Validation errors shown inline
- Graceful degradation for offline mode
- Clear error messages for user actions

## Success Metrics
- Average time to acknowledge: < 4 hours
- Issue resolution rate: > 80% within deadline
- User adoption: > 90% of sites using within 3 months
- System reliability: > 99.9% uptime
- User satisfaction: > 4.5/5 rating

## Comprehensive Implementation Plan

### Configuration Access Pattern

**Mobile App (Read-Only)**:
```javascript
// Fetch configuration on app launch or inspection start
const configDoc = await getDoc(
  doc(db, `companies/${companyId}/config/self-inspection`)
);

const config = configDoc.exists() 
  ? configDoc.data()
  : getDefaultConfiguration();  // Use defaults if no config exists

// Helper function for default configuration
function getDefaultConfiguration() {
  return {
    inspectionConfig: {
      qrScanningRequired: false,
      qrScanningMode: 'disabled',
      recurringInspections: {
        enabled: false
      },
      notifications: {
        channels: {
          email: false,
          whatsapp: false,
          inApp: true
        },
        triggers: {
          newIssueAssignment: ['inApp'],
          issueAcknowledged: ['inApp'],
          issueResolved: ['inApp'],
          overdueReminder: ['inApp'],
          inspectionCompleted: ['inApp']
        }
      },
      escalation: {
        enabled: false,
        levels: []
      }
    },
    raciMatrix: {
      global: {},
      siteOverrides: {},
      areaOverrides: {},
      severityOverrides: {}
    }
  };
}
```

**Web UI (Read/Write)**:
- Provides full CRUD operations on the configuration document
- Manages NCR categories and severities collections
- Handles RACI matrix assignments with user selection
- Controls all company-wide settings

### Phase 1: Foundation (Week 1-2)
**Objective**: Core data structure and basic CRUD operations

1. **Firestore Setup**
   - Create all collections with proper indexes
   - Set up security rules for company-scoped access
   - Initialize test data for Envirowize company

2. **Offline Infrastructure**
   - Implement AsyncStorage/SQLite adapter
   - Create sync queue manager
   - Build conflict resolution logic
   - Set up network state monitoring

3. **Company Configuration**
   - Create admin UI for company settings
   - Implement configuration schema
   - Build notification channel setup

### Phase 2: Core Inspection Flow (Week 3-4)
**Objective**: Complete inspection creation and issue management

1. **Inspection Creation**
   - Site selection with area filtering
   - QR code scanner integration (conditional)
   - Draft save functionality
   - Auto-save mechanism

2. **Issue Management**
   - Multi-issue creation per area
   - Image capture and upload queue
   - Severity and category selection
   - Responsible person assignment (RACI-based)

3. **Offline Support**
   - Local inspection creation
   - Image queue management
   - Sync status indicators

### Phase 3: Workflow & Signatures (Week 5-6)
**Objective**: Complete acknowledgement and resolution workflows

1. **Signature System**
   - Signature pad component
   - Profile signature storage
   - Signature verification UI
   - Audit trail for signatures

2. **Acknowledgement Workflow**
   - Push notification setup
   - Acknowledgement UI
   - Tracking and reporting
   - Escalation triggers

3. **Resolution Workflow**
   - Corrective action forms
   - Resolution image uploads
   - Status progression logic
   - Verification process

### Phase 4: RACI & Automation (Week 7-8)
**Objective**: Implement RACI matrix and automated processes

1. **RACI Matrix**
   - Matrix configuration UI
   - Auto-assignment logic
   - Role-based notifications
   - Override management

2. **Automated Escalation**
   - Time-based triggers
   - Escalation path execution
   - Notification dispatch
   - Escalation reporting

3. **Recurring Inspections**
   - Schedule configuration
   - Auto-creation jobs
   - Assignment logic
   - Reminder system

### Phase 5: Analytics & Polish (Week 9-10)
**Objective**: Dashboard, reporting, and optimization

1. **Dashboard Development**
   - Real-time metrics
   - Trend visualizations
   - Filter controls
   - Export functionality

2. **Performance Optimization**
   - Query optimization
   - Image lazy loading
   - Virtual scrolling
   - Cache warming

3. **Testing & Documentation**
   - End-to-end testing
   - Offline scenario testing
   - User documentation
   - Admin guide

### Technical Stack Decisions

**Image Capture & Annotation**:
- Reuse existing annotation component (already implemented in codebase)
- expo-image-picker for image capture
- Support for drawing, text, and markup on images
- Maximum 5 annotated images per issue

**Offline Storage**:
- Primary: @react-native-async-storage/async-storage
- Complex queries: react-native-sqlite-storage
- Sync engine: Custom built with Redux Persist

**Signatures**:
- react-native-signature-canvas for capture
- Firebase Storage for persistence
- Base64 encoding for offline storage

**Notifications**:
- expo-notifications for push
- WhatsApp Business API integration
- SendGrid/SES for email

**QR Scanning**:
- expo-barcode-scanner
- Fallback manual entry option

**State Management**:
- Redux Toolkit for global state
- RTK Query for API caching
- Redux Persist for offline

### Risk Mitigation

1. **Data Loss Prevention**
   - Auto-save every 30 seconds
   - Local backup before sync
   - Conflict resolution logs

2. **Performance Degradation**
   - Pagination for large datasets
   - Progressive image loading
   - Background sync for non-critical data

3. **User Adoption**
   - Phased rollout by site
   - Training videos in-app
   - Feedback mechanism

4. **Compliance Requirements**
   - Audit trail for all changes
   - Data retention policies
   - Export capabilities for regulators