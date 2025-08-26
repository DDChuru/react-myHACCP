const { db, COMPANIES } = require('./setup');

async function getNCRCategories() {
  const snapshot = await db.collection(`companies/${COMPANIES.ENVIROWIZE}/ncrcategories`).get();
  
  console.log('\n📂 NCR Categories for Envirowize (csc/ncrcategories)');
  console.log('=' .repeat(60));
  console.log(`Found ${snapshot.size} categories:\n`);
  
  const categories = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    categories.push({
      id: doc.id,
      ...data
    });
    
    console.log(`\n📁 ID: ${doc.id}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Description: ${data.description}`);
  });
  
  console.log('\n\n📄 Full JSON Output:');
  console.log(JSON.stringify(categories, null, 2));
}

getNCRCategories().then(() => process.exit(0));
