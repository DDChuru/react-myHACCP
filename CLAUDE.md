# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Visual Output System

**For all visual diagrams, flowcharts, and documentation:**
1. Check global instructions at: `~/.claude/global-instructions.md`
2. Use the visual output workflow - save to `~/.claude/outputs/latest.md`
3. Direct users to view at: http://localhost:3001
4. DO NOT create local HTML files in this project

## Project Overview

This is a React Native HACCP (Hazard Analysis and Critical Control Points) management application built with Expo. It's designed for food safety compliance, auditing, and documentation management in commercial food service environments.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on specific platforms
npm run ios        # iOS simulator
npm run android    # Android emulator  
npm run web        # Web browser

# Linting
npm run lint

# Reset project (moves starter code to app-example)
npm run reset-project
```

## Architecture & Navigation Structure

### Authentication Flow
- **Entry Point**: `app/_layout.tsx` contains the root layout with auth state management
- **Auth Provider**: `hooks/useAuth.js` wraps the app and manages Firebase authentication
- **Protected Routes**: Navigation automatically redirects based on auth state:
  - Authenticated users → `/(drawer)/(tabs)` (main app)
  - Unauthenticated users → `/login`

### Navigation Hierarchy
```
Root Stack Navigator
├── login (public)
├── signup (public)
└── (drawer) DrawerNavigator [authenticated]
    ├── (tabs) BottomTabNavigator
    │   ├── index (Dashboard)
    │   ├── tasks
    │   ├── quick-check
    │   ├── alerts
    │   └── profile
    ├── documents (with photo upload)
    ├── self-inspection
    ├── internal-audit
    ├── inspection
    ├── temperature
    ├── suppliers
    ├── training
    └── reports
```

### Key Technical Components

**UI Framework**: React Native Paper (Material Design 3)
- Theme configuration: `theme/paperTheme.js`
- Custom HACCP-specific color schemes for compliance states
- Light/dark mode support

**Firebase Integration**:
- Configuration: `firebase.js` (contains Firebase credentials)
- Authentication: Firebase Auth
- Database: Firestore (configured but not yet implemented)

**Image Handling**:
- `expo-image-picker` for camera/gallery access
- Documents module (`app/(drawer)/documents.tsx`) has photo attachment capability

**Data Visualization**:
- `react-native-chart-kit` for temperature trends, audit statistics
- `react-native-calendars` for scheduling and date management
- `lottie-react-native` for animations

## Module-Specific Notes

### Documents Module
- Supports photo attachments to SOPs and cleaning instructions
- Implements version control and status tracking
- Categories: cleaning, food-safety, equipment, training

### Inspection Modules
- **Self Inspection**: Daily operational checks
- **Internal Audit**: Company-initiated compliance audits  
- **Inspection**: External/regulatory inspections (FDA, customers, third-party)

### Critical Features for HACCP Compliance
- Temperature monitoring with danger zone alerts
- Non-conformance report (NCR) tracking
- Critical Control Point (CCP) management
- Audit trail and compliance scoring

## File Naming Conventions
- Screens: PascalCase with Screen suffix (e.g., `DocumentsScreen`)
- Components: PascalCase (e.g., `UIShowcase`)
- Hooks: camelCase with 'use' prefix (e.g., `useAuth`)
- Navigation layouts: `_layout.tsx` for route groups

## State Management
Currently using React Context for auth state. Complex state management for forms and data will need Redux or Zustand implementation as the app scales.

## Testing
No test framework currently configured. Consider adding Jest and React Native Testing Library for future development.

## Platform Considerations
- iOS: Configured for tablets support
- Android: Edge-to-edge display enabled
- Web: Static output with Metro bundler

## Environment Variables
Firebase configuration is currently hardcoded in `firebase.js`. Move to environment variables before production deployment.

## Firestore Database Structure

### Company IDs (for testing)
- **Envirowize**: `2XTSaqxU41zCTBIVJeXb` (primary test company)
- **Demo Site**: `99nJGmkViPZ4Fl45pWU8`

### Document Categories
- **Standard Cleaning Instruction**: `inxcJO4M5LI7sGZtOyl4` (SCI documents)
- **Master Cleaning Schedule**: `JX1ckleMoG3aOpOeaonO`

### Firestore Collections Structure
```
companies/
├── {companyId}/
│   ├── documents/           # Documents collection directly under company
│   │   └── {documentId}/
│   │       ├── documentNumber: string
│   │       ├── title: string
│   │       ├── categoryId: string  # References documentCategories
│   │       ├── content: object
│   │       │   ├── sanitationSteps: array
│   │       │   ├── postCleaningInspections: array
│   │       │   └── ... other fields
│   │       └── metadata: object
│   ├── documentCategories/  # Categories collection
│   │   └── {categoryId}/
│   │       ├── name: string
│   │       └── type: string
│   ├── ncrcategories/       # NCR categories (lowercase for CSC consistency)
│   │   └── {categoryId}/
│   │       ├── name: string
│   │       ├── active: boolean
│   │       └── createdAt: timestamp
│   ├── ncrSeverity/         # NCR severities (legacy singular name)
│   │   └── {severityId}/
│   │       ├── name: string
│   │       ├── level: number
│   │       ├── color: string
│   │       └── description: string
│   ├── selfInspections/     # Self inspection records
│   │   └── {inspectionId}/
│   │       ├── name: string
│   │       ├── status: string
│   │       ├── areas: string
│   │       └── issues: array
│   └── contentSchema/       # Schema definitions
│       └── {schemaId}/
│           └── fields: object
```

### Querying SCI Documents
```typescript
// Get SCI documents for Envirowize (filtered by categoryId)
const sciQuery = query(
  collection(db, 'companies/2XTSaqxU41zCTBIVJeXb/documents'),
  where('categoryId', '==', 'inxcJO4M5LI7sGZtOyl4')
);
```

## Task Management Protocol

### IMPORTANT: Active Tasks Tracking
**Always check and update `project-management/active-tasks.md` when:**
1. Starting work on any feature
2. Completing any task (mark with [x])
3. Encountering bugs or blockers
4. Making architectural decisions
5. At the end of each coding session

### Task Update Format
```markdown
- [x] Completed task description
- [ ] Pending task description
- [ ] ~~Cancelled task~~ (with reason in notes)
```

### Current Active Feature
**SCI Image Capture Integration** - Enabling field workers to capture and enrich SCI documents with real photos during plant walkarounds. Priority focus on:
- Sanitation Steps (PRIMARY)
- Post Cleaning Inspections (PRIMARY)
- PPE Requirements
- Safety Precautions
- Application Equipment

Always refer to `project-management/sci-image-capture-project-plan.md` for detailed specifications and `project-management/active-tasks.md` for current sprint tasks.
- can we capture company scopped collections to start with companies/${companyId}
- recognise csc as shortcut for company scopped collection
example csc/completed_audits is companies/${companyId}/completed_audits