# Firestore Admin Scripts

A comprehensive set of scripts for debugging, maintaining, and managing Firestore data during development.

## Setup

1. Install dependencies:
```bash
cd scripts/firestore-admin
npm install
```

2. Configure Firebase:
   - Option A: Download service account key from Firebase Console → Project Settings → Service Accounts
   - Option B: Use default credentials with project ID in `setup.js`

3. Update `setup.js` with your project ID

## Quick Start

### Common Commands

```bash
# Setup NCR severities for a company
npm run setup-ncr

# Generate test data
npm run test-data

# View collection statistics
npm run stats

# List documents in a collection
node crud-operations.js list companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity

# Inspect collection structure
node debug-utils.js inspect companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity --detailed
```

## Available Scripts

### 1. CRUD Operations (`crud-operations.js`)

Basic Firestore operations for debugging:

```bash
# List documents
node crud-operations.js list [collection]

# Get specific document
node crud-operations.js get [collection] [docId]

# Query documents
node crud-operations.js query [collection] [field] [operator] [value]

# Examples
node crud-operations.js list companies/2XTSaqxU41zCTBIVJeXb/documents
node crud-operations.js get companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity critical
node crud-operations.js query companies/2XTSaqxU41zCTBIVJeXb/self_inspections status == completed
```

### 2. Debug Utilities (`debug-utils.js`)

Advanced debugging and validation tools:

```bash
# Inspect collection structure and statistics
node debug-utils.js inspect [collection] [--detailed]

# Validate NCR data integrity
node debug-utils.js validate [companyId]

# Clean up orphaned documents
node debug-utils.js cleanup [companyId]

# Examples
node debug-utils.js inspect companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity --detailed
node debug-utils.js validate 2XTSaqxU41zCTBIVJeXb
```

### 3. Quick Scripts (`quick-scripts.js`)

Common maintenance tasks:

```bash
# Setup NCR severities
node quick-scripts.js setup-ncr [companyId]

# Generate test inspections
node quick-scripts.js test-data [companyId] [count]

# Export collection to JSON
node quick-scripts.js export [collection] [outputFile]

# Import JSON to collection
node quick-scripts.js import [collection] [inputFile]

# Show collection statistics
node quick-scripts.js stats [companyId]

# Monitor collection changes in real-time
node quick-scripts.js monitor [collection] [duration-ms]

# Examples
node quick-scripts.js setup-ncr 2XTSaqxU41zCTBIVJeXb
node quick-scripts.js test-data 2XTSaqxU41zCTBIVJeXb 10
node quick-scripts.js export companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity backup.json
node quick-scripts.js monitor companies/2XTSaqxU41zCTBIVJeXb/self_inspections 30000
```

## Use Cases

### During Development

1. **Setting up test data**:
```bash
# Setup severities and generate test inspections
node quick-scripts.js setup-ncr
node quick-scripts.js test-data 2XTSaqxU41zCTBIVJeXb 20
```

2. **Debugging data issues**:
```bash
# Inspect what's in a collection
node debug-utils.js inspect companies/2XTSaqxU41zCTBIVJeXb/self_inspections --detailed

# Validate data integrity
node debug-utils.js validate 2XTSaqxU41zCTBIVJeXb
```

3. **Live monitoring during app testing**:
```bash
# Watch for changes as you test the app
node quick-scripts.js monitor companies/2XTSaqxU41zCTBIVJeXb/self_inspections
```

### Data Management

1. **Backup and restore**:
```bash
# Backup
node quick-scripts.js export companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity severities-backup.json

# Restore
node quick-scripts.js import companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity severities-backup.json
```

2. **Migration between environments**:
```bash
# Export from one company
node quick-scripts.js export companies/2XTSaqxU41zCTBIVJeXb/ncrSeverity data.json

# Import to another company
node quick-scripts.js import companies/99nJGmkViPZ4Fl45pWU8/ncrSeverity data.json
```

## Company IDs

- **Envirowize**: `2XTSaqxU41zCTBIVJeXb` (primary test)
- **Demo Site**: `99nJGmkViPZ4Fl45pWU8`

## Collection Paths

Using Company Scoped Collections (CSC):
- `companies/${companyId}/ncrSeverity` - NCR severity levels
- `companies/${companyId}/self_inspections` - Self inspection records
- `companies/${companyId}/documents` - Company documents
- `companies/${companyId}/internal_audits` - Internal audit records
- `companies/${companyId}/external_inspections` - External inspection records

## Programmatic Usage

You can also use these scripts programmatically in your code:

```javascript
const { db, COMPANIES, csc } = require('./setup');
const { createDocument, queryDocuments } = require('./crud-operations');
const { inspectCollection } = require('./debug-utils');

async function myCustomScript() {
  // Create a document
  await createDocument(
    csc(COMPANIES.ENVIROWIZE, 'test_collection'),
    { name: 'Test', value: 123 }
  );
  
  // Query documents
  const results = await queryDocuments(
    csc(COMPANIES.ENVIROWIZE, 'self_inspections'),
    'status',
    '==',
    'completed'
  );
  
  // Inspect collection
  await inspectCollection(csc(COMPANIES.ENVIROWIZE, 'ncrSeverity'));
}
```

## Troubleshooting

1. **Authentication errors**: Make sure you have proper Firebase credentials
2. **Permission denied**: Check Firestore security rules
3. **Module not found**: Run `npm install` in the scripts/firestore-admin directory
4. **Connection timeout**: Check your internet connection and Firebase project status

## Safety Notes

- These scripts can modify production data if pointed to production Firebase
- Always test on development/staging first
- Use the export function to backup before making changes
- The delete operations are permanent