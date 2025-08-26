/**
 * NCR Severity Population Script
 * Populates companies/${companyId}/ncrSeverities collection with standard severities
 */

import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase.js';

// Standard NCR Severities for HACCP/Food Safety
const NCR_SEVERITIES = [
  {
    id: 'critical',
    name: 'Critical',
    level: 1,
    color: '#D32F2F', // Red
    description: 'Immediate food safety risk. Product/process must be stopped.',
    responseTime: '0-2 hours',
    escalationRequired: true,
    examples: [
      'Temperature abuse in critical zone',
      'Contamination of product',
      'Allergen cross-contact',
      'Metal/glass/foreign object in product',
      'No handwashing facilities'
    ],
    icon: 'alert-octagon'
  },
  {
    id: 'major',
    name: 'Major',
    level: 2,
    color: '#F57C00', // Orange
    description: 'Significant quality/compliance issue. Requires urgent attention.',
    responseTime: '2-24 hours',
    escalationRequired: true,
    examples: [
      'Documentation missing',
      'Pest activity observed',
      'Equipment not calibrated',
      'Chemical storage violations',
      'Staff training expired'
    ],
    icon: 'alert'
  },
  {
    id: 'minor',
    name: 'Minor',
    level: 3,
    color: '#FBC02D', // Yellow
    description: 'Quality concern. Should be corrected soon.',
    responseTime: '1-7 days',
    escalationRequired: false,
    examples: [
      'Minor cleaning issues',
      'Labeling errors',
      'Minor maintenance needed',
      'Organizational issues',
      'Minor procedural deviations'
    ],
    icon: 'alert-circle'
  },
  {
    id: 'observation',
    name: 'Observation',
    level: 4,
    color: '#388E3C', // Green
    description: 'Improvement opportunity. No immediate risk.',
    responseTime: '7-30 days',
    escalationRequired: false,
    examples: [
      'Best practice suggestions',
      'Process improvements',
      'Efficiency recommendations',
      'Training opportunities',
      'Documentation enhancements'
    ],
    icon: 'information'
  }
];

// NCR Categories (for reference - already created separately)
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

/**
 * Populate NCR Severities for a company
 * @param {string} companyId - The company ID
 */
export async function populateNCRSeverities(companyId = '2XTSaqxU41zCTBIVJeXb') {
  console.log(`Populating NCR severities for company: ${companyId}`);
  
  try {
    const severitiesRef = collection(db, `companies/${companyId}/ncrSeverities`);
    
    for (const severity of NCR_SEVERITIES) {
      const docRef = doc(severitiesRef, severity.id);
      
      await setDoc(docRef, {
        ...severity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true,
        companyId: companyId
      });
      
      console.log(`✅ Created severity: ${severity.name} (${severity.id})`);
    }
    
    console.log('\n✅ All NCR severities populated successfully!');
    console.log('\nSeverity Levels:');
    console.log('1. Critical - Immediate action (Red)');
    console.log('2. Major - Urgent attention (Orange)');
    console.log('3. Minor - Correct soon (Yellow)');
    console.log('4. Observation - Improvement opportunity (Green)');
    
    return NCR_SEVERITIES;
  } catch (error) {
    console.error('❌ Error populating severities:', error);
    throw error;
  }
}

/**
 * Populate NCR Categories for a company
 * @param {string} companyId - The company ID
 */
export async function populateNCRCategories(companyId = '2XTSaqxU41zCTBIVJeXb') {
  console.log(`\nPopulating NCR categories for company: ${companyId}`);
  
  try {
    const categoriesRef = collection(db, `companies/${companyId}/ncrCategories`);
    
    for (const category of NCR_CATEGORIES) {
      const docRef = doc(categoriesRef, category.id);
      
      await setDoc(docRef, {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        active: true,
        companyId: companyId
      });
      
      console.log(`✅ Created category: ${category.name}`);
    }
    
    console.log('\n✅ All NCR categories populated successfully!');
    return NCR_CATEGORIES;
  } catch (error) {
    console.error('❌ Error populating categories:', error);
    throw error;
  }
}

// Run the script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const companyId = process.argv[2] || '2XTSaqxU41zCTBIVJeXb';
  
  console.log('NCR Severity & Category Setup');
  console.log('==============================');
  
  populateNCRSeverities(companyId)
    .then(() => populateNCRCategories(companyId))
    .then(() => {
      console.log('\n✅ Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}