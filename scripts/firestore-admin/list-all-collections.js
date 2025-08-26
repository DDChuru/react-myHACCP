const { db, COMPANIES } = require('./setup');

async function listAllCollections() {
  const companyRef = db.doc(`companies/${COMPANIES.ENVIROWIZE}`);
  const collections = await companyRef.listCollections();
  
  console.log('\n📂 All collections for Envirowize:');
  console.log('=' .repeat(50));
  
  for (const collection of collections) {
    const snapshot = await collection.limit(1).get();
    console.log(`  - ${collection.id} (${snapshot.size} docs sampled)`);
  }
}

listAllCollections().then(() => process.exit(0));
