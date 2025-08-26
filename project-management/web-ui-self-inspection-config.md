# Web UI Self-Inspection Configuration Guide

## Overview
This document outlines the web UI requirements for managing self-inspection configurations. The web UI is the **only** interface that can modify these settings - the mobile app has read-only access.

## Configuration Architecture

### Storage Location
All configurations are stored in a single Firestore document:
```
companies/${companyId}/config/self-inspection
```

### Default Values
When no configuration exists, the system applies these defaults:
- **QR Scanning**: Disabled
- **Recurring Inspections**: Disabled
- **Notifications**: In-app only
- **Escalation**: Disabled
- **RACI Matrix**: Empty (requires manual assignment)

## Required Web UI Components

### 1. NCR Categories Management

**Collection**: `companies/${companyId}/ncrcategories` (note: plural)

**UI Requirements**:
- List view showing all NCR categories
- Add/Edit/Delete functionality
- Drag-and-drop reordering (updates `order` field)
- Active/Inactive toggle
- Bulk import from CSV/Excel

**Fields to Manage**:
```javascript
{
  name: string,        // Required, e.g., "Biological Hazard"
  code: string,        // Required, e.g., "BIO"
  description: string, // Optional, help text
  active: boolean,     // Toggle visibility in mobile app
  order: number        // Display sequence
}
```

**Validation Rules**:
- Name and code must be unique within company
- Code should be uppercase, 2-5 characters
- At least one category must remain active

### 2. NCR Severities Management

**Collection**: `companies/${companyId}/ncrseverities` (note: plural)

**UI Requirements**:
- List view with visual color indicators
- Add/Edit/Delete functionality
- Color picker for severity color
- Escalation timer configuration
- Warning when deleting severities with existing issues

**Fields to Manage**:
```javascript
{
  name: string,                    // Required, e.g., "Critical"
  level: number,                   // Required, 1 = most severe
  color: string,                   // Hex color for UI
  description: string,             // Help text
  escalationHours: number,         // Hours before auto-escalation
  requiresImmediateAction: boolean, // Flag for urgent handling
  active: boolean                  // Toggle visibility
}
```

**Validation Rules**:
- Level numbers must be unique and sequential
- Color must be valid hex code
- At least one severity must remain active
- Escalation hours must be positive number or 0 (no escalation)

### 3. RACI Matrix Configuration

**Storage**: Within `companies/${companyId}/config/self-inspection` document

**UI Components**:

#### Global RACI Settings
- Default assignments for entire company
- User multi-select dropdowns for each RACI role
- Clear visual distinction between R, A, C, I roles
- Validation: Accountable must be single user

#### Site-Specific Overrides
- List of all sites with override capability
- "Inherit from Global" toggle
- Custom RACI assignment per site
- Copy settings from another site

#### Area-Specific Overrides
- Hierarchical view: Site → Areas
- Granular control per area
- Bulk apply to multiple areas

#### Severity-Based Overrides
- Special RACI for critical issues
- Links to severity definitions
- Escalation path visualization

**UI Layout Example**:
```
[Global RACI Settings]
┌─────────────────────────────────────────┐
│ Self-Inspection RACI                    │
├─────────────────────────────────────────┤
│ Responsible: [Multi-select users]       │
│ Accountable: [Single-select user]       │
│ Consulted:   [Multi-select users]       │
│ Informed:    [Multi-select users]       │
└─────────────────────────────────────────┘

[Site Overrides]
┌─────────────────────────────────────────┐
│ Site: Production Facility A             │
│ ☑ Use custom RACI (unchecked = global)  │
│ [RACI fields appear when checked]       │
└─────────────────────────────────────────┘
```

### 4. Escalation Settings

**UI Requirements**:
- Enable/Disable master toggle
- Multi-level escalation configuration
- Time-based triggers
- Condition-based rules
- Test escalation feature

**Configuration Interface**:
```javascript
// Each escalation level
{
  level: 1,
  triggerHours: 24,        // Dropdown: 4, 8, 12, 24, 48, 72
  condition: 'not_acknowledged', // Dropdown options
  escalateTo: {
    role: 'custom',          // or 'manager', 'area_head'
    users: [userId1, userId2] // Multi-select
  },
  notificationChannels: ['email', 'whatsapp', 'inApp']
}
```

**Visual Timeline**:
Show escalation path as timeline graphic:
```
Issue Created → 24hrs → Level 1 → 48hrs → Level 2 → 72hrs → Level 3
```

### 5. Notification Preferences

**Channel Configuration**:
- Master toggles for Email, WhatsApp, In-App
- In-App cannot be disabled (show as locked ON)
- API key management for WhatsApp
- Email server settings

**Trigger Management**:
Matrix view for notification triggers:
```
                 │ Email │ WhatsApp │ In-App │
─────────────────┼───────┼──────────┼────────┤
New Assignment   │   ☑   │    ☑     │   ☑    │
Acknowledged     │   ☐   │    ☐     │   ☑    │
Resolved         │   ☑   │    ☐     │   ☑    │
Overdue          │   ☑   │    ☑     │   ☑    │
Completed        │   ☑   │    ☐     │   ☑    │
```

### 6. QR Scanning Configuration

**UI Components**:
- Enable/Disable toggle
- Mode selector: Mandatory / Optional / Disabled
- QR format configuration
- Test QR generator for areas
- Bulk QR code export/print

**Settings**:
```javascript
{
  qrScanningRequired: boolean,
  qrScanningMode: 'mandatory' | 'optional' | 'disabled',
  qrCodeFormat: 'area_id' | 'custom_format',
  customFormatTemplate: string  // If custom selected
}
```

### 7. Recurring Inspection Scheduler

**UI Requirements**:
- Enable/Disable toggle
- Frequency selector with custom option
- Calendar widget for custom schedules
- Time picker for inspection time
- Default inspector assignment
- Preview of next 10 scheduled inspections

**Custom Schedule Builder**:
```
Frequency: [Daily|Weekly|Monthly|Custom]

If Weekly:
  Days: [M][T][W][T][F][S][S]
  
If Monthly:
  Days: [1, 15, Last day]
  
Time: [09:00 AM]
Auto-assign to: [Select Inspector]
Send reminder: [4] hours before
```

## Implementation Requirements

### Save Mechanism
- All changes save to `companies/${companyId}/config/self-inspection`
- Include audit fields: `lastUpdated`, `lastUpdatedBy`
- Implement optimistic locking to prevent conflicts
- Show save status indicator

### Validation Rules
1. **RACI Matrix**:
   - Accountable must have exactly one user
   - Responsible must have at least one user
   - Users must belong to the company

2. **Escalation**:
   - Levels must be sequential
   - Trigger hours must be increasing
   - At least one notification channel per level

3. **Notifications**:
   - WhatsApp requires valid API key if enabled
   - Email requires SMTP settings if enabled

### Default Configuration Object
```javascript
const DEFAULT_CONFIG = {
  id: 'self-inspection',
  lastUpdated: null,
  lastUpdatedBy: null,
  
  inspectionConfig: {
    // QR Scanning
    qrScanningRequired: false,
    qrScanningMode: 'disabled',
    qrCodeFormat: 'area_id',
    
    // Recurring Inspections
    recurringInspections: {
      enabled: false,
      frequency: 'weekly',
      customSchedule: {
        daysOfWeek: [],
        daysOfMonth: [],
        time: '09:00'
      },
      autoAssignInspector: false,
      defaultInspectorId: null,
      reminderHoursBefore: 4
    },
    
    // Notifications
    notifications: {
      channels: {
        email: false,
        whatsapp: false,
        inApp: true  // Always true
      },
      whatsappConfig: {
        apiKey: '',
        phoneNumbers: []
      },
      emailConfig: {
        fromAddress: '',
        replyTo: ''
      },
      triggers: {
        newIssueAssignment: ['inApp'],
        issueAcknowledged: ['inApp'],
        issueResolved: ['inApp'],
        overdueReminder: ['inApp'],
        inspectionCompleted: ['inApp']
      }
    },
    
    // Escalation
    escalation: {
      enabled: false,
      levels: []
    }
  },
  
  // RACI Matrix
  raciMatrix: {
    global: {
      selfInspection: {
        responsible: [],
        accountable: null,
        consulted: [],
        informed: []
      },
      issueResolution: {
        responsible: [],
        accountable: null,
        consulted: [],
        informed: []
      }
    },
    siteOverrides: {},
    areaOverrides: {},
    severityOverrides: {}
  }
};
```

## User Experience Guidelines

### Navigation
Create dedicated section in admin panel:
```
Admin Panel
├── Self-Inspection Config
│   ├── NCR Categories
│   ├── NCR Severities
│   ├── RACI Matrix
│   ├── Escalation Rules
│   ├── Notifications
│   ├── QR Settings
│   └── Recurring Schedule
```

### Visual Feedback
- Show loading states during save
- Highlight unsaved changes
- Confirmation dialogs for destructive actions
- Success/error toast notifications
- Preview mode to test configurations

### Permissions
- Only Admin and QA Manager roles can access
- Audit log all configuration changes
- Option to lock certain settings at corporate level

## Testing Considerations

### Test Features
1. **Configuration Preview**: Show how settings affect mobile app
2. **Test Notifications**: Send test messages to verify setup
3. **RACI Simulator**: Show who gets assigned for sample scenarios
4. **Escalation Timeline**: Visualize escalation for test issue

### Validation Testing
- Import/Export configurations for backup
- Configuration templates for quick setup
- Rollback to previous configuration option

## Mobile App Integration

The mobile app will:
1. Fetch configuration on app launch
2. Cache configuration locally
3. Check for updates periodically
4. Apply defaults when no config exists
5. Never modify configuration directly

**Mobile App Query**:
```javascript
// Fetch configuration
const configRef = doc(db, `companies/${companyId}/config/self-inspection`);
const configSnap = await getDoc(configRef);
const config = configSnap.exists() ? configSnap.data() : DEFAULT_CONFIG;

// Fetch NCR categories
const categoriesRef = collection(db, `companies/${companyId}/ncrcategories`);
const categoriesSnap = await getDocs(query(categoriesRef, where('active', '==', true)));

// Fetch NCR severities
const severitiesRef = collection(db, `companies/${companyId}/ncrseverities`);
const severitiesSnap = await getDocs(query(severitiesRef, where('active', '==', true)));
```

## Success Metrics
- Configuration changes reflected in mobile app within 1 minute
- 90% of companies customize at least one setting
- Zero data loss during configuration saves
- Support team can troubleshoot configs without developer help

## Future Enhancements
- Configuration versioning and history
- A/B testing different configurations
- ML-based configuration recommendations
- Industry-specific configuration templates
- Multi-company configuration management