#!/usr/bin/env node
// Debugging Utilities for Firestore
// Usage: node scripts/firestore-admin/debug-utils.js [command]

const { db, COMPANIES, csc } = require('./setup');
const Table = require('cli-table3');

// ============= INSPECTION TOOLS =============

async function inspectCollection(collectionPath, detailed = false) {
  console.log(`\n🔍 Inspecting Collection: ${collectionPath}`);
  console.log('=' .repeat(60));
  
  try {
    const snapshot = await db.collection(collectionPath).get();
    console.log(`📊 Total Documents: ${snapshot.size}`);
    
    if (snapshot.size === 0) {
      console.log('⚠️  Collection is empty');
      return;
    }
    
    // Sample document structure
    const firstDoc = snapshot.docs[0];
    console.log(`\n📄 Sample Document ID: ${firstDoc.id}`);
    console.log('📝 Document Structure:');
    printObjectStructure(firstDoc.data());
    
    if (detailed) {
      console.log('\n📚 All Documents:');
      snapshot.forEach(doc => {
        console.log(`\n  ID: ${doc.id}`);
        console.log('  Data:', JSON.stringify(doc.data(), null, 2));
      });
    }
    
    // Field statistics
    const fieldStats = analyzeFields(snapshot.docs);
    console.log('\n📈 Field Statistics:');
    const table = new Table({
      head: ['Field', 'Type', 'Count', 'Sample Value']
    });
    
    Object.entries(fieldStats).forEach(([field, stats]) => {
      table.push([
        field,
        stats.types.join(', '),
        stats.count,
        JSON.stringify(stats.sample).substring(0, 30)
      ]);
    });
    
    console.log(table.toString());
    
  } catch (error) {
    console.error('❌ Error inspecting collection:', error);
  }
}

function printObjectStructure(obj, indent = '  ') {
  Object.entries(obj).forEach(([key, value]) => {
    const type = Array.isArray(value) ? 'array' : typeof value;
    console.log(`${indent}├─ ${key}: ${type}`);
    
    if (type === 'object' && value !== null && !Array.isArray(value)) {
      printObjectStructure(value, indent + '│  ');
    }
  });
}

function analyzeFields(docs) {
  const fieldStats = {};
  
  docs.forEach(doc => {
    const data = doc.data();
    Object.entries(data).forEach(([key, value]) => {
      if (!fieldStats[key]) {
        fieldStats[key] = {
          types: new Set(),
          count: 0,
          sample: null
        };
      }
      
      fieldStats[key].types.add(typeof value);
      fieldStats[key].count++;
      if (!fieldStats[key].sample) {
        fieldStats[key].sample = value;
      }
    });
  });
  
  // Convert Sets to arrays
  Object.keys(fieldStats).forEach(key => {
    fieldStats[key].types = Array.from(fieldStats[key].types);
  });
  
  return fieldStats;
}

// ============= VALIDATION TOOLS =============

async function validateNCRs(companyId) {
  console.log('\n🔍 Validating NCRs...');
  const errors = [];
  const warnings = [];
  
  try {
    // Check NCR severities exist
    const severities = await db.collection(csc(companyId, 'ncrSeverity')).get();
    if (severities.empty) {
      errors.push('❌ No NCR severities defined');
    } else {
      console.log(`✅ Found ${severities.size} severity levels`);
    }
    
    // Validate severity structure
    const requiredFields = ['id', 'name', 'level', 'color', 'description'];
    severities.forEach(doc => {
      const data = doc.data();
      requiredFields.forEach(field => {
        if (!data[field]) {
          warnings.push(`⚠️  Severity ${doc.id} missing field: ${field}`);
        }
      });
    });
    
    // Check for inspections using valid severities
    const validSeverityIds = severities.docs.map(doc => doc.id);
    const inspections = await db.collection(csc(companyId, 'self_inspections')).get();
    
    inspections.forEach(doc => {
      const data = doc.data();
      if (data.ncrs && Array.isArray(data.ncrs)) {
        data.ncrs.forEach((ncr, index) => {
          if (ncr.severityId && !validSeverityIds.includes(ncr.severityId)) {
            warnings.push(`⚠️  Inspection ${doc.id} NCR[${index}] has invalid severity: ${ncr.severityId}`);
          }
        });
      }
    });
    
  } catch (error) {
    errors.push(`❌ Validation error: ${error.message}`);
  }
  
  // Print results
  console.log('\n📋 Validation Results:');
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All validations passed!');
  } else {
    errors.forEach(err => console.log(err));
    warnings.forEach(warn => console.log(warn));
  }
  
  return { errors, warnings };
}

// ============= MIGRATION TOOLS =============

async function migrateCollection(sourceCollection, targetCollection, transformer = null) {
  console.log(`\n🔄 Migrating: ${sourceCollection} → ${targetCollection}`);
  
  try {
    const snapshot = await db.collection(sourceCollection).get();
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      let data = doc.data();
      
      // Apply transformation if provided
      if (transformer && typeof transformer === 'function') {
        data = transformer(data, doc.id);
      }
      
      const targetRef = db.collection(targetCollection).doc(doc.id);
      batch.set(targetRef, data);
      count++;
      
      // Firestore batch limit is 500
      if (count % 500 === 0) {
        batch.commit();
        console.log(`  📦 Committed batch of 500 documents`);
        batch = db.batch();
      }
    });
    
    if (count % 500 !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Migrated ${count} documents`);
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// ============= PERFORMANCE TOOLS =============

async function measureQueryPerformance(queries) {
  console.log('\n⏱️  Query Performance Test');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const query of queries) {
    const start = Date.now();
    
    try {
      const snapshot = await query.get();
      const elapsed = Date.now() - start;
      
      results.push({
        name: query._queryOptions.collectionId || 'Complex Query',
        time: elapsed,
        documents: snapshot.size
      });
      
      console.log(`✅ Query: ${query._queryOptions.collectionId || 'Complex'}`);
      console.log(`   Time: ${elapsed}ms | Documents: ${snapshot.size}`);
      
    } catch (error) {
      console.log(`❌ Query failed: ${error.message}`);
    }
  }
  
  return results;
}

// ============= CLEANUP TOOLS =============

async function cleanupOrphanedDocuments(companyId) {
  console.log('\n🧹 Cleaning up orphaned documents...');
  
  try {
    // Example: Find NCRs referencing non-existent severities
    const severities = await db.collection(csc(companyId, 'ncrSeverity')).get();
    const validSeverityIds = severities.docs.map(doc => doc.id);
    
    const inspections = await db.collection(csc(companyId, 'self_inspections')).get();
    let cleanupCount = 0;
    
    for (const doc of inspections.docs) {
      const data = doc.data();
      if (data.ncrs && Array.isArray(data.ncrs)) {
        const validNCRs = data.ncrs.filter(ncr => 
          !ncr.severityId || validSeverityIds.includes(ncr.severityId)
        );
        
        if (validNCRs.length !== data.ncrs.length) {
          await doc.ref.update({ ncrs: validNCRs });
          cleanupCount++;
          console.log(`  🔧 Fixed document: ${doc.id}`);
        }
      }
    }
    
    console.log(`✅ Cleanup complete: ${cleanupCount} documents fixed`);
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

// ============= EXPORT & CLI =============

module.exports = {
  inspectCollection,
  validateNCRs,
  migrateCollection,
  measureQueryPerformance,
  cleanupOrphanedDocuments
};

if (require.main === module) {
  const command = process.argv[2];
  const companyId = process.argv[3] || COMPANIES.ENVIROWIZE;
  
  switch(command) {
    case 'inspect':
      const collection = process.argv[3] || csc(COMPANIES.ENVIROWIZE, 'ncrSeverity');
      const detailed = process.argv[4] === '--detailed';
      inspectCollection(collection, detailed).then(() => process.exit(0));
      break;
      
    case 'validate':
      validateNCRs(companyId).then(() => process.exit(0));
      break;
      
    case 'cleanup':
      cleanupOrphanedDocuments(companyId).then(() => process.exit(0));
      break;
      
    default:
      console.log(`
🔧 Firestore Debug Utilities

Commands:
  inspect [collection] [--detailed]  - Inspect collection structure
  validate [companyId]               - Validate NCR data integrity
  cleanup [companyId]                - Clean orphaned documents
  
Examples:
  node debug-utils.js inspect companies/${COMPANIES.ENVIROWIZE}/ncrSeverity
  node debug-utils.js validate ${COMPANIES.ENVIROWIZE}
  node debug-utils.js cleanup ${COMPANIES.ENVIROWIZE}
      `);
  }
}