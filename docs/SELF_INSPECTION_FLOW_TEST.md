# Self-Inspection Flow Test Checklist

## Current Implementation Status

### ✅ What's Working
1. **Data Model** - Clean structure with issues embedded
2. **TypeScript Types** - Proper interfaces for SelfInspection and Issue
3. **Issue Persistence** - Issues save to Firestore immediately
4. **Area Management** - Areas only tracked on issues, not inspection root

### 🔄 Flow to Test

## 1. Main List Screen (`/self-inspection`)
- [ ] View list of inspections
- [ ] Shows: Name, Site, Status, Issue count
- [ ] Sync button works
- [ ] FAB button to create new
- [ ] Tap inspection to resume/view

**Potential Issues:**
- Does sync actually refresh from Firestore?
- Loading states working?

## 2. Create New Inspection (`/self-inspection/new`)
- [ ] Step 1: Select site
- [ ] Step 2: Name the inspection 
- [ ] Step 2: Toggle options (NCR, Before/After)
- [ ] Creates inspection in Firestore
- [ ] Navigates to conduct screen

**Potential Issues:**
- Inspection name required but no validation?
- Are sites loading from Firestore?

## 3. Conduct Inspection (`/self-inspection/conduct`)
- [ ] Shows inspection name and site
- [ ] Progress summary (areas/issues)
- [ ] FAB to add issues
- [ ] Issues list updates on return
- [ ] Complete button requires signature

**Potential Issues:**
- Areas loading correctly for the site?
- Does useFocusEffect properly reload issues?
- Signature component integration

## 4. Add Issue (`/self-inspection/add-issue`)
- [ ] Area picker with search
- [ ] Category dropdown (from ncrcategories)
- [ ] Severity dropdown (from ncrSeverity)
- [ ] Description field
- [ ] Responsible person dropdown
- [ ] Image capture button
- [ ] Proposed action date
- [ ] Save persists to Firestore

**Potential Issues:**
- Image capture not implemented?
- Area picker search/debounce working?
- Notification scheduling exists but untested

## 5. Image Annotation (`ImageAnnotator`)
- [ ] Component exists
- [ ] Can draw on image
- [ ] Save annotations
- [ ] Cancel returns to issue

**Status:** Component created but integration unclear

## 6. Complete Inspection (Signature)
- [ ] Signature pad appears
- [ ] Can draw signature
- [ ] Save completes inspection
- [ ] Updates Firestore status
- [ ] Returns to main list

**Potential Issues:**
- SignatureCapture component integration
- Does it update inspection status correctly?

## Data Flow Verification

### Creating Inspection
```
new.tsx → createSelfInspection() → Firestore
         ↓
    Returns ID
         ↓
Navigate to conduct with ID
```

### Adding Issue
```
add-issue.tsx → addIssueToInspection() → Updates inspection.issues[]
              ↓
         Firestore updated
              ↓
    conduct.tsx refreshes on focus
```

### Completing
```
conduct.tsx → updateSelfInspection() → Status: 'completed'
            ↓
      Firestore updated
            ↓
    Navigate to list
```

## Known Gaps/Questions

1. **Image Storage**
   - Where do images go? Not implemented
   - No Firebase Storage setup visible
   - Local URI only?

2. **Offline Queue**
   - No offline handling at all
   - Will fail without internet

3. **Areas Management**
   - How are siteAreas populated?
   - Need seed data?

4. **User Management**
   - userProfile collection exists
   - How are users assigned to sites?

5. **Notifications**
   - scheduleIssueNotifications() exists
   - But no push token setup visible

## Testing Priority

### Phase 1: Core Flow (Test Now)
1. Create inspection with name
2. Add text-only issue (no image)
3. Complete with signature
4. Verify in Firestore console

### Phase 2: Full Features
1. Test image capture
2. Test area search
3. Test notifications
4. Test sync functionality

### Phase 3: Edge Cases
1. No internet connection
2. Multiple issues on same area
3. Very long inspection names
4. Many issues (>50)

## Recommended Fixes Before Offline

### Critical
- [ ] Validate inspection name not empty
- [ ] Handle image capture properly
- [ ] Ensure area picker has areas
- [ ] Test signature component

### Nice to Have
- [ ] Loading states everywhere
- [ ] Error boundaries
- [ ] Better empty states
- [ ] Pull-to-refresh on lists

## Commands to Test

```bash
# Start the app
npm run ios
# or
npm run android

# Check Firestore data
# Go to Firebase Console > Firestore
# Navigate to: companies/2XTSaqxU41zCTBIVJeXb/selfInspections

# Monitor logs
npx react-native log-ios
# or
npx react-native log-android
```

## Next Steps

1. **Test the flow** - Create real inspection end-to-end
2. **Fix any blockers** - Especially image handling
3. **Add offline** - Once core flow is solid
4. **Polish UX** - Loading, errors, empty states