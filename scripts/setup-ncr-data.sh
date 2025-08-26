#!/bin/bash

# NCR Data Setup Script
echo "======================================"
echo "NCR Severities & Categories Setup"
echo "======================================"

# Default company ID
COMPANY_ID="${1:-2XTSaqxU41zCTBIVJeXb}"

echo "Setting up for company: $COMPANY_ID"
echo ""

# Create a Node.js script to run
cat > /tmp/setup-ncr.mjs << 'EOF'
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config (from your firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyDxTQQHrzdStBfT3xVft6904V0NnyuORIs",
  authDomain: "iclean-field-service-4bddd.firebaseapp.com",
  projectId: "iclean-field-service-4bddd",
  storageBucket: "iclean-field-service-4bddd.appspot.com",
  messagingSenderId: "56483628989",
  appId: "1:56483628989:web:650863793197768f",
  databaseURL: "https://iclean-field-service-4bddd.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// NCR Severities
const NCR_SEVERITIES = [
  {
    id: 'critical',
    name: 'Critical',
    level: 1,
    color: '#D32F2F',
    description: 'Immediate food safety risk. Product/process must be stopped.',
    responseTime: '0-2 hours',
    escalationRequired: true
  },
  {
    id: 'major',
    name: 'Major',
    level: 2,
    color: '#F57C00',
    description: 'Significant quality/compliance issue. Requires urgent attention.',
    responseTime: '2-24 hours',
    escalationRequired: true
  },
  {
    id: 'minor',
    name: 'Minor',
    level: 3,
    color: '#FBC02D',
    description: 'Quality concern. Should be corrected soon.',
    responseTime: '1-7 days',
    escalationRequired: false
  },
  {
    id: 'observation',
    name: 'Observation',
    level: 4,
    color: '#388E3C',
    description: 'Improvement opportunity. No immediate risk.',
    responseTime: '7-30 days',
    escalationRequired: false
  }
];

// Get company ID from command line
const companyId = process.argv[2] || '2XTSaqxU41zCTBIVJeXb';

async function setupNCRSeverities() {
  console.log('Setting up NCR severities...');
  
  for (const severity of NCR_SEVERITIES) {
    try {
      const docRef = doc(db, `companies/${companyId}/ncrSeverities`, severity.id);
      await setDoc(docRef, {
        ...severity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true
      });
      console.log(`✅ Created: ${severity.name} (Level ${severity.level})`);
    } catch (error) {
      console.error(`❌ Error creating ${severity.name}:`, error.message);
    }
  }
}

setupNCRSeverities()
  .then(() => {
    console.log('\n✅ NCR Severities setup complete!');
    console.log('\nAccess in app: companies/${companyId}/ncrSeverities');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
EOF

# Run the setup
echo "Running setup..."
node /tmp/setup-ncr.mjs "$COMPANY_ID"

echo ""
echo "======================================"
echo "To use in your app:"
echo "======================================"
echo "Collection: companies/\${companyId}/ncrSeverities"
echo ""
echo "Severities:"
echo "1. Critical (Red) - Immediate action"
echo "2. Major (Orange) - Urgent (24hr)"
echo "3. Minor (Yellow) - Soon (1 week)"
echo "4. Observation (Green) - Improvement"