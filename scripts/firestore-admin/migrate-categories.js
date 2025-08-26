const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function migrateCategories() {
  const companyId = '2XTSaqxU41zCTBIVJeXb';
  
  console.log('🔄 Migrating NCR Categories to lowercase collection name...\n');
  
  try {
    // Read from old collection (ncrCategories)
    const oldCollectionRef = db.collection(`companies/${companyId}/ncrCategories`);
    const oldSnapshot = await oldCollectionRef.get();
    
    if (oldSnapshot.empty) {
      console.log('⚠️  No documents found in ncrCategories');
      return;
    }
    
    console.log(`📊 Found ${oldSnapshot.size} documents to migrate\n`);
    
    // Write to new collection (ncrcategories - lowercase)
    const newCollectionRef = db.collection(`companies/${companyId}/ncrcategories`);
    
    for (const doc of oldSnapshot.docs) {
      const data = doc.data();
      await newCollectionRef.doc(doc.id).set({
        ...data,
        migratedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Migrated: ${data.name || doc.id}`);
    }
    
    console.log('\n✅ Migration complete!');
    console.log('📝 Old collection (ncrCategories) still exists - delete manually if needed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// If no documents exist, create them in the correct collection
async function createCategoriesIfNeeded() {
  const companyId = '2XTSaqxU41zCTBIVJeXb';
  const categoriesRef = db.collection(`companies/${companyId}/ncrcategories`);
  
  const snapshot = await categoriesRef.get();
  
  if (snapshot.empty) {
    console.log('\n📝 Creating categories in ncrcategories collection...\n');
    
    const NCR_CATEGORIES = [
      { id: 'temperature-control', name: 'Temperature Control' },
      { id: 'personal-hygiene', name: 'Personal Hygiene' },
      { id: 'cleaning-sanitation', name: 'Cleaning & Sanitation' },
      { id: 'pest-control', name: 'Pest Control' },
      { id: 'allergen-management', name: 'Allergen Management' },
      { id: 'documentation', name: 'Documentation & Records' },
      { id: 'equipment-maintenance', name: 'Equipment & Maintenance' },
      { id: 'training', name: 'Training & Competency' },
      { id: 'supplier-control', name: 'Supplier Control' },
      { id: 'product-labeling', name: 'Product Labeling' },
      { id: 'chemical-control', name: 'Chemical Control' },
      { id: 'foreign-object', name: 'Foreign Object Control' },
      { id: 'water-quality', name: 'Water Quality' },
      { id: 'waste-management', name: 'Waste Management' },
      { id: 'facility-structure', name: 'Facility & Structure' }
    ];
    
    for (const category of NCR_CATEGORIES) {
      await categoriesRef.doc(category.id).set({
        ...category,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Created: ${category.name}`);
    }
    
    console.log('\n✅ All categories created in ncrcategories!');
  } else {
    console.log(`\n✅ ncrcategories already has ${snapshot.size} documents`);
  }
}

async function main() {
  console.log('NCR Categories Collection Migration');
  console.log('====================================\n');
  
  // First try to migrate
  await migrateCategories();
  
  // Then ensure categories exist
  await createCategoriesIfNeeded();
  
  process.exit(0);
}

main();