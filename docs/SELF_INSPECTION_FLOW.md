# Self-Inspection End-to-End Flow

## Overview
The self-inspection feature allows users to conduct inspections, report issues, and track compliance. All data is immediately persisted to Firestore to prevent data loss.

## 1. Data Flow Architecture

```mermaid
graph TB
    subgraph "User Interface"
        A[Self-Inspection List] 
        B[New Inspection]
        C[Conduct Screen]
        D[Add Issue Screen]
        E[Complete Inspection]
    end
    
    subgraph "Firestore Collections"
        F[selfInspections]
        G[ncrcategories]
        H[ncrSeverity]
        I[userProfile]
        J[siteAreas]
    end
    
    A -->|Fetch| F
    B -->|Create| F
    C -->|Update| F
    D -->|Read| G
    D -->|Read| H
    D -->|Read| I
    D -->|Read| J
    D -->|Update Issues Array| F
    E -->|Update Status| F
```

## 2. Creating a New Inspection

```mermaid
sequenceDiagram
    participant User
    participant NewScreen as New Inspection Screen
    participant Service as selfInspectionService
    participant Firestore
    
    User->>NewScreen: Select Site
    NewScreen->>Firestore: Fetch all areas for site
    Firestore-->>NewScreen: Return areas list
    
    User->>NewScreen: Enter inspection name
    User->>NewScreen: Click "Start Inspection"
    
    NewScreen->>Service: createSelfInspection()
    Note over Service: Creates inspection object with:<br/>- name<br/>- all areas included<br/>- status: 'pending'<br/>- totalItems: areas.length * 10<br/>- completedItems: 0<br/>- issues: []
    
    Service->>Firestore: Save to selfInspections collection
    Firestore-->>Service: Return inspection ID
    Service-->>NewScreen: Return inspection ID
    
    NewScreen->>User: Navigate to Conduct Screen
```

### Key Points:
- **Immediate Persistence**: Inspection is saved to Firestore BEFORE navigating
- **All Areas Included**: No area selection needed - all areas are automatically included
- **Unique ID**: Each inspection gets a Firestore-generated ID for tracking

## 3. Conducting an Inspection

```mermaid
graph TD
    A[Conduct Screen Loads] -->|inspectionId| B[Load Inspection from Firestore]
    B --> C{Status Check}
    C -->|pending| D[Update to 'in_progress']
    C -->|in_progress| E[Continue]
    
    E --> F[Display Summary]
    F --> G[Areas Count]
    F --> H[Issues Count]
    F --> I[Show Issues List]
    
    J[User Clicks FAB] --> K[Navigate to Add Issue]
```

### Data Structure in Firestore:
```javascript
{
  id: "abc123",
  name: "Jan 15 2pm - Kitchen Inspection",
  status: "in_progress",
  
  // Areas
  area: "Kitchen A, Storage Room, Prep Area",
  areaId: "area1,area2,area3",
  site: "Main Site",
  siteId: "site123",
  
  // Progress
  totalItems: 30,  // 3 areas × 10 items
  completedItems: 0,
  
  // Issues (array that grows as issues are added)
  issues: [],
  issueCount: 0,
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  scheduledDate: Date,
  startedAt: Timestamp,
  
  // User info
  createdBy: "userId",
  createdByName: "John Doe",
  companyId: "2XTSaqxU41zCTBIVJeXb"
}
```

## 4. Adding Issues

```mermaid
sequenceDiagram
    participant User
    participant AddIssue as Add Issue Screen
    participant AreaPicker
    participant Firestore
    participant Service
    
    User->>AddIssue: Click FAB (+)
    AddIssue->>Firestore: Fetch ncrcategories
    AddIssue->>Firestore: Fetch ncrSeverity
    AddIssue->>Firestore: Fetch userProfile
    AddIssue->>Firestore: Fetch siteAreas
    
    User->>AddIssue: Click "Select Area"
    AddIssue->>AreaPicker: Open modal
    User->>AreaPicker: Search/Select area
    AreaPicker-->>AddIssue: Return selected area
    
    User->>AddIssue: Fill form
    Note over AddIssue: - Description<br/>- Category<br/>- Severity<br/>- Responsible person<br/>- Due date<br/>- Photos (optional)
    
    User->>AddIssue: Click "Save Issue"
    
    AddIssue->>Service: Create issue object
    Note over Service: Issue structure:<br/>{<br/>  id: timestamp,<br/>  areaId: "area1",<br/>  areaName: "Kitchen A",<br/>  category: "Temperature Control",<br/>  severity: "Critical",<br/>  description: "...",<br/>  responsibleUserId: "...",<br/>  proposedActionDate: Date,<br/>  images: []<br/>}
    
    Service->>Service: addIssueToInspection()
    Service->>Firestore: Update inspection.issues array
    Service->>Firestore: Update inspection.issueCount
    
    AddIssue->>User: Navigate back to Conduct
```

### Issue Persistence Strategy:
1. **Issue is created as an object** with all details
2. **Added to inspection's issues array** in Firestore
3. **Issue count is incremented** for quick reference
4. **Each issue includes area information** for context

## 5. Issue Data Structure

```javascript
{
  id: "1234567890",  // Timestamp-based ID
  
  // Location
  areaId: "kitchen-a",
  areaName: "Kitchen A",
  
  // Classification
  category: "Temperature Control",
  categoryId: "temperature-control",
  severity: "Critical",
  severityId: "critical",
  severityLevel: 1,
  
  // Details
  description: "Refrigerator temperature above safe zone",
  
  // Assignment
  responsibleUserId: "user123",
  responsibleUserName: "Jane Smith",
  proposedActionDate: Date,
  
  // Evidence
  images: [
    {
      uri: "file://...",
      annotations: [],
      type: "before",
      uploadedAt: Date
    }
  ],
  
  // Status
  status: "pending",
  acknowledged: false,
  
  // Metadata
  createdBy: "inspector123",
  createdByName: "John Doe",
  createdAt: Date
}
```

## 6. Completing an Inspection

```mermaid
graph TD
    A[User Clicks Complete] --> B[Show Signature Modal]
    B --> C[User Signs]
    C --> D[Save Signature]
    D --> E[Update Inspection]
    
    E --> F[Set status: 'completed']
    E --> G[Set completedAt: timestamp]
    E --> H[Set completedBy: userId]
    E --> I[Attach signature]
    
    F --> J[Save to Firestore]
    J --> K[Navigate to List]
```

## 7. Data Persistence Timeline

```mermaid
gantt
    title Data Persistence Points
    dateFormat X
    axisFormat %s
    
    section Inspection
    Create Inspection    :done, 0, 1
    Start (pending→progress) :done, 2, 1
    
    section Issues
    Add Issue 1          :done, 3, 1
    Add Issue 2          :done, 5, 1
    Add Issue 3          :done, 7, 1
    
    section Completion
    Complete & Sign      :done, 9, 1
    Final Save          :done, 10, 1
```

## 8. Offline Capability (Future)

The current architecture supports offline capability:

```mermaid
graph LR
    A[User Action] --> B{Online?}
    B -->|Yes| C[Direct to Firestore]
    B -->|No| D[Queue in AsyncStorage]
    D --> E[Sync when online]
    E --> C
    C --> F[Update UI]
```

## Key Design Decisions

### 1. **Immediate Persistence**
- Inspection created immediately when starting
- No risk of data loss
- Can resume anytime

### 2. **Area Selection at Issue Level**
- All areas included by default
- Area selected only when adding issue
- Reduces complexity and clicks

### 3. **Issues as Array**
- Issues stored in inspection document
- No separate collection needed
- Easier to query and display

### 4. **Status Tracking**
```
draft → pending → in_progress → completed
```

### 5. **No Area Navigation**
- Simplified conduct screen
- All issues shown in one list
- Area shown as badge on each issue

## API Functions

```typescript
// Create new inspection
createSelfInspection(data, companyId) → inspectionId

// Update inspection
updateSelfInspection(inspectionId, updates, companyId)

// Add issue to inspection
addIssueToInspection(inspectionId, issue, companyId)

// Get all inspections
getSelfInspections(companyId, filterStatus?)

// Get single inspection
getSelfInspection(inspectionId, companyId)

// Mark as started
startInspection(inspectionId, companyId)

// Mark as completed
completeInspection(inspectionId, userId, userName, companyId)
```

## Benefits of This Architecture

1. **Data Safety**: Every action is persisted immediately
2. **Resumability**: Can pick up where left off anytime
3. **Simplicity**: Fewer screens and clicks
4. **Scalability**: Ready for offline mode
5. **Traceability**: Complete audit trail
6. **Performance**: Single document updates vs. multiple collections