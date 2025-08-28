#!/usr/bin/env node
// Verify siteId is correctly set at root level of inspection documents
// Usage: node scripts/firestore-admin/verify-siteid-structure.js

const { db, COMPANIES } = require('./setup');
const { queryDocuments } = require('./crud-operations');

async function verifyInspectionSiteIds() {
  console.log('🔍 Verifying siteId in Inspection Documents\n');
  console.log('=' .repeat(60));
  
  try {
    // Get recent Envirowize inspections
    console.log('📖 Fetching recent Envirowize inspections...');
    const inspections = await queryDocuments(
      `companies/${COMPANIES.ENVIROWIZE}/inspections`,
      'companyId',
      '==',
      COMPANIES.ENVIROWIZE
    );
    
    if (!inspections || inspections.length === 0) {
      console.log('No inspections found');
      return;
    }
    
    console.log(`\nFound ${inspections.length} inspections\n`);
    
    // Analyze each inspection
    let correctCount = 0;
    let incorrectCount = 0;
    const issues = [];
    
    for (const inspection of inspections.slice(0, 5)) { // Check first 5
      console.log(`\n📋 Inspection ${inspection.id}:`);
      console.log(`   Document ID: ${inspection.id}`);
      console.log(`   Root siteId: ${inspection.siteId || '❌ MISSING'}`);
      console.log(`   Root areaId: ${inspection.areaId || '❌ MISSING'}`);
      
      // Check critical fields
      const hasRootSiteId = inspection.siteId !== undefined && inspection.siteId !== null;
      const hasRootAreaId = inspection.areaId !== undefined && inspection.areaId !== null;
      const siteIdNotAreaId = inspection.siteId !== inspection.areaId;
      
      if (!hasRootSiteId) {
        issues.push(`   ❌ Missing root-level siteId`);
        incorrectCount++;
      } else if (!siteIdNotAreaId) {
        issues.push(`   ⚠️  siteId === areaId (${inspection.siteId})`);
        incorrectCount++;
      } else {
        console.log(`   ✅ Correct: siteId (${inspection.siteId}) != areaId (${inspection.areaId})`);
        correctCount++;
      }
      
      // Check nested area object
      if (inspection.area) {
        console.log(`   Area object:`);
        console.log(`     - area.id: ${inspection.area.id || 'missing'}`);
        console.log(`     - area.name: ${inspection.area.name || 'missing'}`);
        console.log(`     - area.siteId: ${inspection.area.siteId || 'missing'}`);
      } else {
        console.log(`   ⚠️  No area object`);
      }
      
      // Check if it matches reporting requirements
      const matchesACS = 
        inspection.id !== inspection._docId && // id is areaItemId, not doc ID
        hasRootSiteId &&
        hasRootAreaId &&
        siteIdNotAreaId;
        
      console.log(`   Reporting Compatible: ${matchesACS ? '✅ YES' : '❌ NO'}`);
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Correct structure: ${correctCount}`);
    console.log(`   ❌ Incorrect structure: ${incorrectCount}`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log(issue));
    }
    
    // Show what correct structure should be
    console.log('\n📝 Expected Structure:');
    console.log(JSON.stringify({
      // Root level - CRITICAL for reporting
      id: 'AREA_ITEM_123',     // The areaItemId (NOT doc ID)
      siteId: 'SITE_456',      // At root level (NOT same as areaId)
      areaId: 'AREA_789',      // At root level
      
      // Nested area object - supplementary
      area: {
        id: 'AREA_789',
        name: 'Kitchen Area',
        siteId: 'SITE_456'     // Also in area object
      },
      
      // Other required fields
      status: 'pass',
      verifiedBy: 'USER_ID',
      verifiedAt: '2024-01-15T10:30:00Z',
      companyId: COMPANIES.ENVIROWIZE,
      // ... rest of fields
    }, null, 2));
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Verification Complete\n');
}

// Run verification
if (require.main === module) {
  verifyInspectionSiteIds()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { verifyInspectionSiteIds };