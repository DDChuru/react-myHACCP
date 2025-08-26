#!/usr/bin/env node
// Quick Firestore Scripts for Common Tasks
// Usage: node scripts/firestore-admin/quick-scripts.js [task]

const { db, COMPANIES, CATEGORIES, csc } = require('./setup');
const { createDocument, batchWrite } = require('./crud-operations');

// ============= NCR SEVERITY SETUP =============

async function setupNCRSeverities(companyId = COMPANIES.ENVIROWIZE) {
  console.log(`\n🚀 Setting up NCR Severities for company: ${companyId}`);
  
  const severities = require('../ncr-severities.json');
  const collectionPath = csc(companyId, 'ncrSeverity');
  
  try {
    const operations = severities.map(severity => ({
      type: 'set',
      collection: collectionPath,
      docId: severity.id,
      data: severity
    }));
    
    await batchWrite(operations);
    console.log(`✅ Created ${severities.length} severity levels`);
    
  } catch (error) {
    console.error('❌ Error setting up severities:', error);
  }
}

// ============= TEST DATA GENERATION =============

async function generateTestInspections(companyId = COMPANIES.ENVIROWIZE, count = 5) {
  console.log(`\n🧪 Generating ${count} test inspections...`);
  
  const severityIds = ['critical', 'major', 'minor', 'observation'];
  const areas = ['Kitchen', 'Storage', 'Prep Area', 'Dining', 'Receiving'];
  const inspectionTypes = ['Daily', 'Weekly', 'Monthly'];
  
  for (let i = 0; i < count; i++) {
    const inspection = {
      type: inspectionTypes[Math.floor(Math.random() * inspectionTypes.length)],
      date: new Date().toISOString(),
      inspector: 'Test User',
      area: areas[Math.floor(Math.random() * areas.length)],
      status: 'completed',
      score: Math.floor(Math.random() * 20) + 80,
      ncrs: []
    };
    
    // Add random NCRs
    const ncrCount = Math.floor(Math.random() * 3);
    for (let j = 0; j < ncrCount; j++) {
      inspection.ncrs.push({
        severityId: severityIds[Math.floor(Math.random() * severityIds.length)],
        description: `Test issue ${j + 1}`,
        correctiveAction: 'To be addressed',
        status: 'open',
        createdAt: new Date().toISOString()
      });
    }
    
    await createDocument(csc(companyId, 'self_inspections'), inspection);
  }
  
  console.log(`✅ Generated ${count} test inspections`);
}

// ============= DATA EXPORT =============

async function exportCollection(collectionPath, outputFile = null) {
  console.log(`\n📤 Exporting collection: ${collectionPath}`);
  
  try {
    const snapshot = await db.collection(collectionPath).get();
    const data = {};
    
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    
    const json = JSON.stringify(data, null, 2);
    
    if (outputFile) {
      const fs = require('fs');
      fs.writeFileSync(outputFile, json);
      console.log(`✅ Exported to: ${outputFile}`);
    } else {
      console.log(json);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Export error:', error);
  }
}

// ============= DATA IMPORT =============

async function importCollection(collectionPath, inputFile) {
  console.log(`\n📥 Importing to collection: ${collectionPath}`);
  
  try {
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    const operations = Object.entries(data).map(([docId, docData]) => ({
      type: 'set',
      collection: collectionPath,
      docId,
      data: docData
    }));
    
    await batchWrite(operations);
    console.log(`✅ Imported ${operations.length} documents`);
    
  } catch (error) {
    console.error('❌ Import error:', error);
  }
}

// ============= QUICK STATS =============

async function getCollectionStats(companyId = COMPANIES.ENVIROWIZE) {
  console.log(`\n📊 Collection Statistics for Company: ${companyId}`);
  console.log('=' .repeat(60));
  
  const collections = [
    'ncrSeverity',
    'self_inspections',
    'documents',
    'internal_audits',
    'external_inspections'
  ];
  
  for (const collection of collections) {
    try {
      const snapshot = await db.collection(csc(companyId, collection)).get();
      console.log(`  ${collection}: ${snapshot.size} documents`);
    } catch (error) {
      console.log(`  ${collection}: Error accessing collection`);
    }
  }
}

// ============= LIVE MONITOR =============

async function monitorCollection(collectionPath, duration = 60000) {
  console.log(`\n👁️  Monitoring collection: ${collectionPath}`);
  console.log(`Duration: ${duration / 1000} seconds`);
  console.log('Press Ctrl+C to stop\n');
  
  const unsubscribe = db.collection(collectionPath)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        const timestamp = new Date().toLocaleTimeString();
        
        if (change.type === 'added') {
          console.log(`➕ [${timestamp}] Added: ${change.doc.id}`);
        }
        if (change.type === 'modified') {
          console.log(`✏️  [${timestamp}] Modified: ${change.doc.id}`);
        }
        if (change.type === 'removed') {
          console.log(`🗑️  [${timestamp}] Removed: ${change.doc.id}`);
        }
      });
    });
  
  // Auto-stop after duration
  setTimeout(() => {
    unsubscribe();
    console.log('\n✅ Monitoring stopped');
    process.exit(0);
  }, duration);
}

// ============= CLI INTERFACE =============

if (require.main === module) {
  const task = process.argv[2];
  
  switch(task) {
    case 'setup-ncr':
      const setupCompany = process.argv[3] || COMPANIES.ENVIROWIZE;
      setupNCRSeverities(setupCompany).then(() => process.exit(0));
      break;
      
    case 'test-data':
      const testCompany = process.argv[3] || COMPANIES.ENVIROWIZE;
      const count = parseInt(process.argv[4]) || 5;
      generateTestInspections(testCompany, count).then(() => process.exit(0));
      break;
      
    case 'export':
      const exportPath = process.argv[3];
      const outputFile = process.argv[4];
      if (!exportPath) {
        console.log('Usage: node quick-scripts.js export [collection] [output-file]');
        process.exit(1);
      }
      exportCollection(exportPath, outputFile).then(() => process.exit(0));
      break;
      
    case 'import':
      const importPath = process.argv[3];
      const inputFile = process.argv[4];
      if (!importPath || !inputFile) {
        console.log('Usage: node quick-scripts.js import [collection] [input-file]');
        process.exit(1);
      }
      importCollection(importPath, inputFile).then(() => process.exit(0));
      break;
      
    case 'stats':
      const statsCompany = process.argv[3] || COMPANIES.ENVIROWIZE;
      getCollectionStats(statsCompany).then(() => process.exit(0));
      break;
      
    case 'monitor':
      const monitorPath = process.argv[3];
      const duration = parseInt(process.argv[4]) || 60000;
      if (!monitorPath) {
        console.log('Usage: node quick-scripts.js monitor [collection] [duration-ms]');
        process.exit(1);
      }
      monitorCollection(monitorPath, duration);
      break;
      
    default:
      console.log(`
🚀 Quick Firestore Scripts

Tasks:
  setup-ncr [companyId]               - Setup NCR severities
  test-data [companyId] [count]       - Generate test inspections
  export [collection] [file]          - Export collection to JSON
  import [collection] [file]          - Import JSON to collection
  stats [companyId]                   - Show collection statistics
  monitor [collection] [duration]     - Live monitor changes
  
Examples:
  node quick-scripts.js setup-ncr ${COMPANIES.ENVIROWIZE}
  node quick-scripts.js test-data ${COMPANIES.ENVIROWIZE} 10
  node quick-scripts.js export companies/${COMPANIES.ENVIROWIZE}/ncrSeverity backup.json
  node quick-scripts.js stats ${COMPANIES.ENVIROWIZE}
  node quick-scripts.js monitor companies/${COMPANIES.ENVIROWIZE}/self_inspections 30000
      `);
  }
}