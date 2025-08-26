# Self-Inspection Aligned Model Structure

## ✅ Fixed Issues

1. **Issue Persistence**: Now saves immediately to Firestore
2. **Data Structure**: Using embedded array pattern consistently  
3. **TypeScript Types**: Proper interfaces for SelfInspection and Issue
4. **Screen Updates**: Auto-refresh when returning from add-issue

## Current Structure

### Firestore Document Path
```
companies/{companyId}/selfInspections/{inspectionId}
```

### SelfInspection Model
```typescript
interface SelfInspection {
  id?: string;
  
  // Basic info
  name: string;              // User-defined inspection name
  area: string;              // Comma-separated area names
  areaId: string;            // Comma-separated area IDs
  site: string;              // Site name
  siteId: string;            // Site ID
  checklist: string;         // Checklist name
  checklistId?: string;      // Checklist ID
  
  // Status tracking
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  
  // Progress
  totalItems: number;        // Total checklist items
  completedItems: number;    // Completed items count
  
  // Issues (EMBEDDED ARRAY)
  issues: Issue[];           // Array of issues found
  issueCount: number;        // Denormalized count
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  scheduledDate: Date | Timestamp;
  startedAt?: Date | Timestamp;
  completedAt?: Date | Timestamp;
  
  // User info
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  completedBy?: string;
  completedByName?: string;
  
  // Signature
  inspectorSignature?: string;
  signedAt?: Date | Timestamp;
  
  // Company
  companyId: string;
}
```

### Issue Model (Embedded)
```typescript
interface Issue {
  id: string;                // Unique ID: issue_{timestamp}_{random}
  
  // Location
  areaId: string;
  areaName: string;
  
  // Classification
  category: string;
  categoryId: string;
  severity: string;
  severityId: string;
  severityLevel: number;
  
  // Details
  description: string;
  images: Array<{
    uri: string;
    annotations?: any[];
    type?: string;
    uploadedAt?: string;
  }>;
  
  // Assignment
  proposedActionDate: Date;
  responsibleUserId: string;
  responsibleUserName: string;
  
  // Status
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  acknowledged: boolean;
  acknowledgedAt?: Date | null;
  acknowledgedBy?: string | null;
  
  // Audit
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}
```

## Data Flow

### 1. Create Inspection
```typescript
// new.tsx
const inspectionData = {
  name: "Daily Kitchen Inspection",
  area: "Kitchen, Storage, Prep Area",
  areaId: "area1,area2,area3",
  site: "Main Facility",
  siteId: "site123",
  status: 'pending',
  issues: [],  // Empty initially
  issueCount: 0,
  // ... other fields
};

const inspectionId = await createSelfInspection(inspectionData, companyId);
// ✅ Saved to Firestore immediately
```

### 2. Add Issue
```typescript
// add-issue.tsx
const issue = {
  id: "issue_1234567_abc123",
  areaName: "Kitchen",
  severity: "Critical",
  description: "Broken freezer seal",
  // ... other fields
};

await addIssueToInspection(inspectionId, issue, companyId);
// ✅ Updates inspection document, appends to issues array
```

### 3. Complete Inspection
```typescript
// conduct.tsx
await updateSelfInspection(inspectionId, {
  status: 'completed',
  completedAt: serverTimestamp(),
  inspectorSignature: signatureBase64,
  issueCount: issues.length
}, companyId);
// ✅ Updates status, keeps issues embedded
```

## Why Embedded Array?

For HACCP inspections:
- Typically 10-50 issues per inspection
- Need atomic operations
- Single read gets everything
- Simpler offline sync
- Document size well under 1MB limit

## Migration Notes

If you previously had issues in subcollections, run this migration:
```javascript
// Migration script (if needed)
const migrateIssuesToEmbedded = async () => {
  const inspections = await getDocs(collection(db, 'companies/[companyId]/selfInspections'));
  
  for (const inspection of inspections.docs) {
    const issuesSubcollection = await getDocs(
      collection(db, `companies/[companyId]/selfInspections/${inspection.id}/issues`)
    );
    
    const issues = issuesSubcollection.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    await updateDoc(inspection.ref, {
      issues: issues,
      issueCount: issues.length
    });
  }
};
```

## Testing Checklist

- [x] Create new inspection persists to Firestore
- [x] Add issue updates inspection document
- [x] Issues display in conduct screen
- [x] Complete inspection updates status
- [x] Returning from add-issue refreshes list
- [ ] Offline persistence works
- [ ] Sync updates when back online