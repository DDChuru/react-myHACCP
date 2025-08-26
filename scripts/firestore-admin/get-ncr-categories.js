#!/usr/bin/env node
// Get NCR categories for Envirowize
// Usage: node get-ncr-categories.js

const { db, COMPANIES, csc } = require('./setup');

async function getNCRCategories(companyId = COMPANIES.ENVIROWIZE) {
  console.log('\n🔍 Fetching NCR Categories');
  console.log('=' .repeat(60));
  console.log(`📍 Company: ${companyId === COMPANIES.ENVIROWIZE ? 'Envirowize' : 'Demo'}`);
  console.log(`📂 Path: companies/${companyId}/ncrCategories`);
  console.log('');
  
  try {
    // Try ncrCategories (plural)
    let collectionPath = csc(companyId, 'ncrCategories');
    let snapshot = await db.collection(collectionPath).get();
    
    if (snapshot.empty) {
      console.log('⚠️  No documents in ncrCategories, trying ncrCategory (singular)...\n');
      
      // Try ncrCategory (singular)
      collectionPath = csc(companyId, 'ncrCategory');
      snapshot = await db.collection(collectionPath).get();
    }
    
    if (snapshot.empty) {
      console.log('❌ No NCR categories found in either collection\n');
      console.log('💡 You may need to create NCR categories first');
      console.log('   Run: node quick-scripts.js setup-ncr-categories\n');
      return [];
    }
    
    console.log(`✅ Found ${snapshot.size} NCR categories:\n`);
    
    const categories = [];
    
    // Display each category
    snapshot.forEach(doc => {
      const data = doc.data();
      categories.push({
        id: doc.id,
        ...data
      });
      
      console.log(`📁 Category: ${doc.id}`);
      console.log(`   Name: ${data.name || 'N/A'}`);
      console.log(`   Description: ${data.description || 'N/A'}`);
      
      // Show all fields
      const otherFields = Object.keys(data).filter(k => !['name', 'description'].includes(k));
      if (otherFields.length > 0) {
        console.log(`   Other fields: ${otherFields.join(', ')}`);
      }
      
      console.log('   ---');
    });
    
    console.log('\n📊 Summary:');
    console.log(`   Total Categories: ${categories.length}`);
    console.log(`   Collection Used: ${collectionPath}`);
    
    // Return as JSON for potential piping
    if (process.argv.includes('--json')) {
      console.log('\n📄 JSON Output:');
      console.log(JSON.stringify(categories, null, 2));
    }
    
    return categories;
    
  } catch (error) {
    console.error('❌ Error fetching NCR categories:', error.message);
    
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      console.log('\n🔐 Authentication Issue:');
      console.log('   1. Download service account key from Firebase Console');
      console.log('   2. Save as: scripts/firestore-admin/serviceAccountKey.json');
      console.log('   3. Run this script again\n');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check internet connection');
      console.log('   - Verify Firebase project status');
      console.log('   - Ensure collection exists\n');
    }
    
    return [];
  }
}

// CLI execution
if (require.main === module) {
  const companyId = process.argv[2] || COMPANIES.ENVIROWIZE;
  
  getNCRCategories(companyId)
    .then(() => {
      console.log('\n✨ Done!\n');
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { getNCRCategories };