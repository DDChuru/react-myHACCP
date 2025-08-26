# NCR Severities Setup

## Agreed Severity Levels

We've standardized on 4 severity levels for NCRs (Non-Conformance Reports):

### 1. **Critical** (Level 1) 🔴
- **Color:** Red (#D32F2F)
- **Response Time:** 0-2 hours
- **Escalation:** Required
- **Description:** Immediate food safety risk. Product/process must be stopped.
- **Examples:**
  - Temperature abuse in critical zone
  - Contamination of product
  - Allergen cross-contact
  - Metal/glass/foreign object in product
  - No handwashing facilities

### 2. **Major** (Level 2) 🟠
- **Color:** Orange (#F57C00)
- **Response Time:** 2-24 hours
- **Escalation:** Required
- **Description:** Significant quality/compliance issue. Requires urgent attention.
- **Examples:**
  - Documentation missing
  - Pest activity observed
  - Equipment not calibrated
  - Chemical storage violations
  - Staff training expired

### 3. **Minor** (Level 3) 🟡
- **Color:** Yellow (#FBC02D)
- **Response Time:** 1-7 days
- **Escalation:** Not required
- **Description:** Quality concern. Should be corrected soon.
- **Examples:**
  - Minor cleaning issues
  - Labeling errors
  - Minor maintenance needed
  - Organizational issues
  - Minor procedural deviations

### 4. **Observation** (Level 4) 🟢
- **Color:** Green (#388E3C)
- **Response Time:** 7-30 days
- **Escalation:** Not required
- **Description:** Improvement opportunity. No immediate risk.
- **Examples:**
  - Best practice suggestions
  - Process improvements
  - Efficiency recommendations
  - Training opportunities
  - Documentation enhancements

## Firestore Collection Structure

```
companies/
  └── {companyId}/
      └── ncrSeverities/   ← Correct collection name
          ├── critical/
          ├── major/
          ├── minor/
          └── observation/
```

## Usage in App

```typescript
// Fetch severities
const severitiesQuery = collection(db, `companies/${companyId}/ncrSeverities`);
const severitiesSnapshot = await getDocs(severitiesQuery);

// In self-inspection add issue screen
<SegmentedButtons
  value={selectedSeverity}
  onValueChange={setSelectedSeverity}
  buttons={[
    { value: 'critical', label: 'Critical', style: { backgroundColor: '#D32F2F' }},
    { value: 'major', label: 'Major', style: { backgroundColor: '#F57C00' }},
    { value: 'minor', label: 'Minor', style: { backgroundColor: '#FBC02D' }},
    { value: 'observation', label: 'Observation', style: { backgroundColor: '#388E3C' }}
  ]}
/>
```

## Manual Setup in Firebase Console

Since we need authentication, you can manually add these in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/project/iclean-field-service-4bddd/firestore)
2. Navigate to: `companies/2XTSaqxU41zCTBIVJeXb/ncrSeverities`
3. Add documents with IDs: `critical`, `major`, `minor`, `observation`

Each document should have:
```json
{
  "id": "critical",
  "name": "Critical",
  "level": 1,
  "color": "#D32F2F",
  "description": "Immediate food safety risk. Product/process must be stopped.",
  "responseTime": "0-2 hours",
  "escalationRequired": true,
  "active": true
}
```

## Implementation Notes

- Collection name is `ncrSeverities` (not `ncrsevetiry` - fixed typo)
- Each severity has a unique color for visual identification
- Response times help with SLA management
- Escalation flags trigger automatic notifications
- Level numbers (1-4) for sorting and filtering

## Next Steps

1. ✅ Severity levels defined
2. ✅ Type definitions created (`types/ncr.ts`)
3. ⏳ Manual data entry in Firebase Console (need auth)
4. ⏳ Update self-inspection screens to use severities
5. ⏳ Add severity filtering to dashboard