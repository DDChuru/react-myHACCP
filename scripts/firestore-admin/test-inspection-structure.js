#!/usr/bin/env node
// Test Inspection Structure Compliance with ACS Format
// Usage: node scripts/firestore-admin/test-inspection-structure.js

const { db, COMPANIES } = require('./setup');
const { getDocument, queryDocuments } = require('./crud-operations');

// ACS expected structure (from companies/AnmdYRpshMosqbsZ6l15/inspections/00001vo6TvU2FDynNTWQ)
const ACS_STRUCTURE = {
  requiredFields: [
    'id',           // Critical: This MUST be the areaItemId for reporting
    'areaId',
    'siteId', 
    'area',         // Full area object
    'schedule',     // Full schedule object
    'status',       // lowercase: 'pass' | 'fail'
    'lastStatus',   // Capitalized: 'Pass' | 'Fail'
    'verifiedBy',
    'verifiedAt',
    'companyId',
    'createdAt',
    'updatedAt'
  ],
  
  objectFields: {
    'area': ['id', 'name'],  // At minimum
    'schedule': ['id', 'name', 'days', 'hours', 'cycleId'],
    'user': ['id', 'fullName', 'email']  // If present
  },
  
  statusValues: {
    'status': ['pass', 'fail'],  // lowercase
    'lastStatus': ['Pass', 'Fail'],  // Capitalized
    'scheduleStatus': ['Pass', 'Fail']  // Capitalized
  }
};

async function validateInspectionStructure(inspection, source) {
  console.log(`\n📋 Validating inspection from ${source}:`);
  console.log(`   Document ID: ${inspection._docId || 'N/A'}`);
  console.log(`   Area Item ID (id field): ${inspection.id}`);
  
  const issues = [];
  
  // 1. Check Critical ID Field
  if (!inspection.id) {
    issues.push('❌ CRITICAL: Missing "id" field (should be areaItemId)');
  } else if (inspection.id === inspection._docId) {
    issues.push('❌ CRITICAL: "id" field is using Firestore doc ID instead of areaItemId');
  }
  
  // 2. Check Required Fields
  for (const field of ACS_STRUCTURE.requiredFields) {
    if (inspection[field] === undefined || inspection[field] === null) {
      issues.push(`❌ Missing required field: ${field}`);
    }
  }
  
  // 3. Check Object Fields
  for (const [field, subfields] of Object.entries(ACS_STRUCTURE.objectFields)) {
    if (inspection[field]) {
      if (typeof inspection[field] !== 'object') {
        issues.push(`❌ ${field} should be an object, got: ${typeof inspection[field]}`);
      } else {
        for (const subfield of subfields) {
          if (!inspection[field][subfield]) {
            issues.push(`⚠️  ${field}.${subfield} is missing`);
          }
        }
      }
    }
  }
  
  // 4. Check Status Values
  for (const [field, validValues] of Object.entries(ACS_STRUCTURE.statusValues)) {
    if (inspection[field] && !validValues.includes(inspection[field])) {
      issues.push(`❌ Invalid ${field} value: "${inspection[field]}" (expected: ${validValues.join(' or ')})`);
    }
  }
  
  // 5. Check siteId vs areaId
  if (inspection.siteId === inspection.areaId) {
    console.log(`   ⚠️  siteId === areaId (${inspection.siteId}) - might be incorrect`);
  }
  
  // 6. Check firstInspection flag
  if (typeof inspection.firstInspection !== 'boolean') {
    issues.push(`⚠️  firstInspection should be boolean, got: ${typeof inspection.firstInspection}`);
  }
  
  // Report Results
  if (issues.length === 0) {
    console.log('   ✅ Structure matches ACS format perfectly!');
    return true;
  } else {
    console.log('   Issues found:');
    issues.forEach(issue => console.log(`      ${issue}`));
    return false;
  }
}

async function compareInspections() {
  console.log('🔍 Inspection Structure Compliance Test\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Get an ACS inspection as reference
    console.log('📖 Fetching ACS reference inspection...');
    const acsInspection = await getDocument(
      `companies/${COMPANIES.ACS}/inspections`,
      '00001vo6TvU2FDynNTWQ'
    );
    
    if (acsInspection) {
      console.log('\nACS Reference Structure:');
      console.log('- id (areaItemId):', acsInspection.id);
      console.log('- area object:', acsInspection.area ? '✓ Present' : '✗ Missing');
      console.log('- schedule object:', acsInspection.schedule ? '✓ Present' : '✗ Missing');
      console.log('- firstInspection:', acsInspection.firstInspection);
    }
    
    console.log('\n' + '=' .repeat(60));
    
    // 2. Get Envirowize inspections
    console.log('\n📖 Fetching Envirowize inspections...');
    const envirowizeInspections = await queryDocuments(
      `companies/${COMPANIES.ENVIROWIZE}/inspections`,
      'companyId',
      '==',
      COMPANIES.ENVIROWIZE
    );
    
    if (envirowizeInspections && envirowizeInspections.length > 0) {
      console.log(`Found ${envirowizeInspections.length} Envirowize inspections`);
      
      // Validate each inspection
      let passCount = 0;
      for (const inspection of envirowizeInspections.slice(0, 3)) { // Test first 3
        inspection._docId = inspection.id;  // Store doc ID for comparison
        const isValid = await validateInspectionStructure(inspection, 'Envirowize');
        if (isValid) passCount++;
      }
      
      console.log('\n' + '=' .repeat(60));
      console.log(`📊 Summary: ${passCount}/${Math.min(3, envirowizeInspections.length)} inspections passed validation`);
    } else {
      console.log('No Envirowize inspections found to validate');
      
      // Show what a correct inspection should look like
      console.log('\n📝 Expected Inspection Structure:');
      console.log(JSON.stringify({
        id: 'AREA_ITEM_123',  // The areaItemId, NOT doc ID
        areaItemId: 'AREA_ITEM_123',  // Backwards compatibility
        siteId: 'SITE_456',  // May differ from areaId
        areaId: 'AREA_789',
        area: {
          id: 'AREA_789',
          name: 'Kitchen Area',
          // ... other area properties
        },
        schedule: {
          id: 'daily',
          name: 'Daily',
          days: 1,
          hours: 24,
          cycleId: 1
        },
        status: 'pass',  // lowercase
        lastStatus: 'Pass',  // Capitalized
        scheduleStatus: 'Pass',  // Capitalized
        itemDescription: 'Floor Cleaning',
        verifiedBy: 'USER_ID',
        verifiedAt: '2024-01-15T10:30:00Z',
        firstInspection: false,  // boolean
        companyId: COMPANIES.ENVIROWIZE,
        // ... other fields
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Test Complete\n');
}

// Helper to create a test inspection with proper structure
async function createTestInspection() {
  const { Timestamp } = require('firebase-admin/firestore');
  
  const testInspection = {
    // Critical: id is the areaItemId for reporting
    id: 'TEST_AREA_ITEM_001',
    areaItemId: 'TEST_AREA_ITEM_001',
    
    // Location with full objects
    siteId: 'TEST_SITE_001',
    areaId: 'TEST_AREA_001', 
    area: {
      id: 'TEST_AREA_001',
      name: 'Test Kitchen Area',
      siteId: 'TEST_SITE_001'
    },
    
    // Schedule with full object
    scheduleId: 'daily',
    schedule: {
      id: 'daily',
      name: 'Daily',
      days: 1,
      hours: 24,
      cycleId: 1
    },
    
    // Item details
    itemDescription: 'Test Floor Cleaning Task',
    
    // Status (ACS format)
    status: 'pass',  // lowercase
    lastStatus: 'Pass',  // Capitalized
    scheduleStatus: 'Pass',  // Capitalized
    
    // User info
    verifiedBy: 'test_user_001',
    user: {
      id: 'test_user_001',
      fullName: 'Test User',
      email: 'test@example.com'
    },
    
    // Timestamps
    verifiedAt: Timestamp.now(),
    date: new Date().toISOString(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    
    // Flags
    firstInspection: true,
    deleted: false,
    serverInspection: true,
    
    // Metadata
    companyId: COMPANIES.ENVIROWIZE,
    createdBy: 'test_user_001',
    scoreWeight: 1
  };
  
  console.log('\n🧪 Test Inspection Structure:');
  const isValid = await validateInspectionStructure(testInspection, 'Test');
  
  return testInspection;
}

// Run the test
if (require.main === module) {
  compareInspections()
    .then(() => createTestInspection())
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { validateInspectionStructure, createTestInspection };