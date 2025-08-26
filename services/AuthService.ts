import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfileModel } from '../types/userProfile';

/**
 * AuthService - Similar to Angular services
 * Handles authentication and user profile management
 * In React, we use this as a singleton service pattern
 */
class AuthService {
  private currentUserProfile: UserProfileModel | null = null;
  private userProfileListeners: Set<(profile: UserProfileModel | null) => void> = new Set();

  /**
   * Login user and fetch profile
   * Similar to Angular's Observable pattern but using Promises
   */
  async login(email: string, password: string): Promise<UserProfileModel> {
    try {
      console.log('[AuthService] Logging in user:', email);
      
      // Step 1: Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Step 2: Fetch user profile from Firestore
      const profile = await this.fetchUserProfile(user.uid);
      
      if (!profile) {
        // Create profile if it doesn't exist
        const newProfile = await this.createUserProfile(user);
        return newProfile;
      }
      
      return profile;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  /**
   * Signup new user and create profile
   */
  async signup(email: string, password: string, fullName?: string): Promise<UserProfileModel> {
    try {
      console.log('[AuthService] Creating new user:', email);
      
      // Step 1: Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Step 2: Create user profile
      const profile = await this.createUserProfile(user, fullName);
      
      return profile;
    } catch (error) {
      console.error('[AuthService] Signup error:', error);
      throw error;
    }
  }

  /**
   * Fetch user profile from Firestore
   * This is like your Angular service method that gets user details
   */
  async fetchUserProfile(uid: string): Promise<UserProfileModel | null> {
    try {
      console.log('[AuthService] Fetching profile for uid:', uid);
      
      const userDoc = await getDoc(doc(db, 'userProfile', uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const profile: UserProfileModel = {
          id: userDoc.id,
          ...data
        } as UserProfileModel;
        
        // Store in memory (like a BehaviorSubject in RxJS)
        this.currentUserProfile = profile;
        this.notifyListeners(profile);
        
        console.log('[AuthService] Profile fetched:', profile);
        return profile;
      }
      
      console.log('[AuthService] No profile found for uid:', uid);
      return null;
    } catch (error) {
      console.error('[AuthService] Error fetching profile:', error);
      return null;
    }
  }

  /**
   * Create a new user profile in Firestore
   */
  async createUserProfile(user: User, fullName?: string): Promise<UserProfileModel> {
    try {
      console.log('[AuthService] Creating profile for:', user.email);
      
      const profile: UserProfileModel = {
        id: user.uid,
        email: user.email || '',
        fullName: fullName || user.displayName || '',
        companyId: '2XTSaqxU41zCTBIVJeXb', // Default to Envirowize for now
        roles: {
          // Default roles for new users
          auditor: true,
        },
        allocatedSiteIds: [],
        notificationsEnabled: true,
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'userProfile', user.uid), {
        ...profile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      this.currentUserProfile = profile;
      this.notifyListeners(profile);
      
      return profile;
    } catch (error) {
      console.error('[AuthService] Error creating profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(uid: string, updates: Partial<UserProfileModel>): Promise<void> {
    try {
      await setDoc(doc(db, 'userProfile', uid), {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      // Update local cache
      if (this.currentUserProfile?.id === uid) {
        this.currentUserProfile = {
          ...this.currentUserProfile,
          ...updates
        };
        this.notifyListeners(this.currentUserProfile);
      }
    } catch (error) {
      console.error('[AuthService] Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUserProfile = null;
      this.notifyListeners(null);
    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user profile (like a signal in Angular)
   */
  getCurrentProfile(): UserProfileModel | null {
    return this.currentUserProfile;
  }

  /**
   * Set current user profile (for syncing with auth provider)
   */
  setCurrentProfile(profile: UserProfileModel | null): void {
    this.currentUserProfile = profile;
    this.notifyListeners(profile);
  }

  /**
   * Subscribe to profile changes (like Observable.subscribe in RxJS)
   */
  subscribeToProfile(listener: (profile: UserProfileModel | null) => void): () => void {
    this.userProfileListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.userProfileListeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of profile changes
   */
  private notifyListeners(profile: UserProfileModel | null) {
    this.userProfileListeners.forEach(listener => listener(profile));
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: keyof UserProfileModel['roles']): boolean {
    return this.currentUserProfile?.roles?.[role] === true;
  }

  /**
   * Check if user has access to specific site
   */
  hasSiteAccess(siteId: string): boolean {
    if (this.hasRole('admin') || this.hasRole('superAdmin')) {
      return true; // Admins have access to all sites
    }
    
    return this.currentUserProfile?.allocatedSiteIds?.includes(siteId) || false;
  }

  /**
   * Get all sites user has access to
   */
  getUserSites(): string[] {
    if (this.hasRole('admin') || this.hasRole('superAdmin')) {
      return []; // Empty array means all sites
    }
    
    return this.currentUserProfile?.allocatedSiteIds || [];
  }
}

// Export as singleton (like Angular's providedIn: 'root')
export default new AuthService();