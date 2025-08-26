// Firestore Admin Setup for Development & Debugging
// Run scripts with: node scripts/firestore-admin/[script-name].js

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
try {
  // Try to load service account key
  const serviceAccount = require('./serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://iclean-field-service-4bddd.firebaseio.com"
  });
  
  console.log('✅ Firebase Admin initialized with service account');
  console.log('📌 Project:', serviceAccount.project_id);
  
} catch (error) {
  // Fallback to default credentials or environment variables
  console.log('⚠️  No serviceAccountKey.json found, trying default initialization');
  
  admin.initializeApp({
    projectId: 'iclean-field-service-4bddd',
    databaseURL: "https://iclean-field-service-4bddd.firebaseio.com"
  });
}

const db = admin.firestore();

// Company IDs for quick access
const COMPANIES = {
  ENVIROWIZE: '2XTSaqxU41zCTBIVJeXb',
  DEMO: '99nJGmkViPZ4Fl45pWU8'
};

// Document Categories
const CATEGORIES = {
  SCI: 'inxcJO4M5LI7sGZtOyl4',
  MCS: 'JX1ckleMoG3aOpOeaonO'
};

// Helper function for company-scoped collections
function csc(companyId, collectionName) {
  return `companies/${companyId}/${collectionName}`;
}

// Export for use in other scripts
module.exports = {
  admin,
  db,
  COMPANIES,
  CATEGORIES,
  csc
};

console.log('📌 Available companies:', Object.keys(COMPANIES));