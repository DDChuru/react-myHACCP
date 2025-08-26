#!/usr/bin/env node
// CRUD Operations for Firestore Debugging
// Usage: node scripts/firestore-admin/crud-operations.js [operation] [collection] [data]

const { db, COMPANIES, csc } = require('./setup');

// ============= CREATE OPERATIONS =============

async function createDocument(collection, data, docId = null) {
  try {
    const ref = db.collection(collection);
    if (docId) {
      await ref.doc(docId).set(data);
      console.log(`✅ Created document with ID: ${docId}`);
      return docId;
    } else {
      const docRef = await ref.add(data);
      console.log(`✅ Created document with ID: ${docRef.id}`);
      return docRef.id;
    }
  } catch (error) {
    console.error('❌ Error creating document:', error);
  }
}

// ============= READ OPERATIONS =============

async function getDocument(collection, docId) {
  try {
    const doc = await db.collection(collection).doc(docId).get();
    if (doc.exists) {
      console.log('📄 Document data:', JSON.stringify(doc.data(), null, 2));
      return doc.data();
    } else {
      console.log('❌ No such document!');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting document:', error);
  }
}

async function listDocuments(collection, limit = 10) {
  try {
    const snapshot = await db.collection(collection).limit(limit).get();
    console.log(`📚 Found ${snapshot.size} documents:`);
    snapshot.forEach(doc => {
      console.log(`  - ${doc.id}:`, JSON.stringify(doc.data()).substring(0, 100) + '...');
    });
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error listing documents:', error);
  }
}

async function queryDocuments(collection, field, operator, value) {
  try {
    const snapshot = await db.collection(collection)
      .where(field, operator, value)
      .get();
    console.log(`🔍 Found ${snapshot.size} matching documents`);
    const results = [];
    snapshot.forEach(doc => {
      console.log(`  - ${doc.id}`);
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  } catch (error) {
    console.error('❌ Error querying documents:', error);
  }
}

// ============= UPDATE OPERATIONS =============

async function updateDocument(collection, docId, updates) {
  try {
    await db.collection(collection).doc(docId).update(updates);
    console.log(`✅ Updated document: ${docId}`);
  } catch (error) {
    console.error('❌ Error updating document:', error);
  }
}

async function mergeDocument(collection, docId, data) {
  try {
    await db.collection(collection).doc(docId).set(data, { merge: true });
    console.log(`✅ Merged document: ${docId}`);
  } catch (error) {
    console.error('❌ Error merging document:', error);
  }
}

// ============= DELETE OPERATIONS =============

async function deleteDocument(collection, docId) {
  try {
    await db.collection(collection).doc(docId).delete();
    console.log(`✅ Deleted document: ${docId}`);
  } catch (error) {
    console.error('❌ Error deleting document:', error);
  }
}

async function deleteCollection(collection, batchSize = 100) {
  try {
    const query = db.collection(collection).limit(batchSize);
    return await deleteQueryBatch(query, batchSize);
  } catch (error) {
    console.error('❌ Error deleting collection:', error);
  }
}

async function deleteQueryBatch(query, batchSize) {
  const snapshot = await query.get();
  
  if (snapshot.size === 0) {
    console.log('✅ Collection deleted');
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`🗑️ Deleted ${snapshot.size} documents`);

  if (snapshot.size === batchSize) {
    await deleteQueryBatch(query, batchSize);
  }

  return snapshot.size;
}

// ============= BATCH OPERATIONS =============

async function batchWrite(operations) {
  try {
    const batch = db.batch();
    
    operations.forEach(op => {
      const ref = db.collection(op.collection).doc(op.docId || db.collection(op.collection).doc().id);
      
      switch(op.type) {
        case 'create':
        case 'set':
          batch.set(ref, op.data);
          break;
        case 'update':
          batch.update(ref, op.data);
          break;
        case 'delete':
          batch.delete(ref);
          break;
      }
    });
    
    await batch.commit();
    console.log(`✅ Batch write completed: ${operations.length} operations`);
  } catch (error) {
    console.error('❌ Error in batch write:', error);
  }
}

// ============= EXPORT ALL FUNCTIONS =============

module.exports = {
  createDocument,
  getDocument,
  listDocuments,
  queryDocuments,
  updateDocument,
  mergeDocument,
  deleteDocument,
  deleteCollection,
  batchWrite
};

// ============= CLI INTERFACE =============

if (require.main === module) {
  const args = process.argv.slice(2);
  const operation = args[0];
  
  console.log('🔧 Firestore CRUD Tool');
  console.log('📌 Operation:', operation || 'none specified');
  
  // Example CLI usage
  switch(operation) {
    case 'list':
      const collection = args[1] || csc(COMPANIES.ENVIROWIZE, 'ncrSeverity');
      listDocuments(collection).then(() => process.exit(0));
      break;
    
    case 'get':
      const getCollection = args[1];
      const docId = args[2];
      if (!getCollection || !docId) {
        console.log('Usage: node crud-operations.js get [collection] [docId]');
        process.exit(1);
      }
      getDocument(getCollection, docId).then(() => process.exit(0));
      break;
    
    case 'query':
      const queryCollection = args[1];
      const field = args[2];
      const operator = args[3];
      const value = args[4];
      if (!queryCollection || !field || !operator || !value) {
        console.log('Usage: node crud-operations.js query [collection] [field] [operator] [value]');
        process.exit(1);
      }
      queryDocuments(queryCollection, field, operator, value).then(() => process.exit(0));
      break;
    
    default:
      console.log(`
Available operations:
  list [collection]                          - List documents
  get [collection] [docId]                   - Get specific document
  query [collection] [field] [op] [value]    - Query documents
  
Example:
  node crud-operations.js list companies/${COMPANIES.ENVIROWIZE}/ncrSeverity
  node crud-operations.js get companies/${COMPANIES.ENVIROWIZE}/documents abc123
  node crud-operations.js query companies/${COMPANIES.ENVIROWIZE}/documents status == active
      `);
      process.exit(0);
  }
}