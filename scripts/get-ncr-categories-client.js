// Client-side script to get NCR categories
// Run this in your React Native app or paste in browser console after authentication

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path as needed

const ENVIROWIZE_ID = '2XTSaqxU41zCTBIVJeXb';

export async function getNCRCategories() {
  console.log('🔍 Fetching NCR Categories for Envirowize');
  console.log(`Collection: companies/${ENVIROWIZE_ID}/ncrCategories`);
  
  try {
    // Try ncrCategories (plural) first
    let querySnapshot = await getDocs(
      collection(db, `companies/${ENVIROWIZE_ID}/ncrCategories`)
    );
    
    if (querySnapshot.empty) {
      console.log('Trying ncrCategory (singular)...');
      // Try ncrCategory (singular)
      querySnapshot = await getDocs(
        collection(db, `companies/${ENVIROWIZE_ID}/ncrCategory`)
      );
    }
    
    if (querySnapshot.empty) {
      console.log('❌ No NCR categories found');
      return [];
    }
    
    const categories = [];
    querySnapshot.forEach((doc) => {
      console.log(`📁 ID: ${doc.id}`);
      console.log('Data:', doc.data());
      categories.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Found ${categories.length} categories`);
    return categories;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If permission denied, user needs to be authenticated
    if (error.code === 'permission-denied') {
      console.log('💡 Make sure you are logged in first');
    }
    
    return [];
  }
}

// For testing in the app
getNCRCategories().then(categories => {
  console.log('Categories:', categories);
});