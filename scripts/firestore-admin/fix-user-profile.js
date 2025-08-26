// Script to check and create user profile if missing
// Run with: node scripts/fix-user-profile.js

const admin = require('firebase-admin');
const serviceAccount = require('./firestore-admin/serviceAccountKey.json');

// Initialize admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();
const auth = admin.auth();

async function checkAndFixUserProfile(email) {
  try {
    console.log(`\nChecking user: ${email}`);
    
    // Get user from Auth
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found auth user: ${userRecord.uid}`);
    
    // Check if profile exists
    const profileDoc = await db.collection('userProfiles').doc(userRecord.uid).get();
    
    if (!profileDoc.exists) {
      console.log('❌ Profile does not exist in Firestore');
      
      // Create profile
      const newProfile = {
        id: userRecord.uid,
        email: userRecord.email,
        fullName: userRecord.displayName || email.split('@')[0],
        companyId: '2XTSaqxU41zCTBIVJeXb', // Envirowize
        roles: {
          admin: true,
          siteAdmin: true,
          auditor: true,
        },
        allocatedSiteIds: [],
        notificationsEnabled: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      await db.collection('userProfiles').doc(userRecord.uid).set(newProfile);
      console.log('✅ Profile created successfully');
      console.log('Profile data:', newProfile);
    } else {
      console.log('✅ Profile exists');
      const data = profileDoc.data();
      console.log('Profile data:', {
        email: data.email,
        fullName: data.fullName,
        companyId: data.companyId,
        roles: data.roles,
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('=== User Profile Checker ===\n');
  
  // Check the specific user
  await checkAndFixUserProfile('quality@tpenvirowize.co.za');
  
  // Optional: Check other common test users
  const otherUsers = [
    'test@envirowize.com',
    'admin@envirowize.com',
  ];
  
  for (const email of otherUsers) {
    try {
      await checkAndFixUserProfile(email);
    } catch (error) {
      console.log(`User ${email} not found in Auth`);
    }
  }
  
  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(console.error);