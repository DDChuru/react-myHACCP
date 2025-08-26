import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import AuthService from '../services/AuthService';
import { UserProfileModel } from '../types/userProfile';
import { RolesModel } from '../types/roles';

/**
 * AuthContext with UserProfile
 * This is like Angular's dependency injection but using React Context
 */
interface AuthContextType {
  // Firebase Auth user
  authUser: User | null;
  // Full user profile from Firestore
  userProfile: UserProfileModel | null;
  // Loading states
  isLoading: boolean;
  isProfileLoading: boolean;
  // Auth methods
  login: (email: string, password: string) => Promise<UserProfileModel>;
  signup: (email: string, password: string, fullName?: string) => Promise<UserProfileModel>;
  logout: () => Promise<void>;
  // Profile methods
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfileModel>) => Promise<void>;
  // Role checking methods (like Angular guards)
  hasRole: (role: keyof RolesModel) => boolean;
  hasSiteAccess: (siteId: string) => boolean;
  getUserSites: () => string[];
  // Helper methods
  isAdmin: () => boolean;
  isSiteAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider Component
 * This wraps your app and provides auth state everywhere
 * Similar to Angular's AppModule providers
 */
export const AuthProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  /**
   * Initialize auth listener
   * This is like ngOnInit in Angular
   */
  useEffect(() => {
    console.log('[AuthProfileProvider] Setting up auth listener...');
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthProfileProvider] Auth state changed:', user?.email || 'null');
      setAuthUser(user);
      
      if (user) {
        // Fetch user profile when auth state changes
        setIsProfileLoading(true);
        try {
          const profile = await AuthService.fetchUserProfile(user.uid);
          setUserProfile(profile);
          // IMPORTANT: Also update the AuthService singleton so services can access it
          AuthService.setCurrentProfile(profile);
        } catch (error) {
          console.error('[AuthProfileProvider] Error fetching profile:', error);
        } finally {
          setIsProfileLoading(false);
        }
      } else {
        setUserProfile(null);
        // Clear the AuthService singleton profile
        AuthService.setCurrentProfile(null);
      }
      
      setIsLoading(false);
    });

    // Subscribe to profile changes from AuthService
    // This is like subscribing to a BehaviorSubject in RxJS
    const unsubscribeProfile = AuthService.subscribeToProfile((profile) => {
      console.log('[AuthProfileProvider] Profile updated:', profile?.email);
      setUserProfile(profile);
    });

    // Cleanup (like ngOnDestroy in Angular)
    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
    };
  }, []);

  /**
   * Login method
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsProfileLoading(true);
    try {
      const profile = await AuthService.login(email, password);
      setUserProfile(profile);
      return profile;
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  /**
   * Signup method
   */
  const signup = useCallback(async (email: string, password: string, fullName?: string) => {
    setIsProfileLoading(true);
    try {
      const profile = await AuthService.signup(email, password, fullName);
      setUserProfile(profile);
      return profile;
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  /**
   * Logout method
   */
  const logout = useCallback(async () => {
    await AuthService.logout();
    setAuthUser(null);
    setUserProfile(null);
  }, []);

  /**
   * Refresh user profile from Firestore
   */
  const refreshProfile = useCallback(async () => {
    if (authUser) {
      setIsProfileLoading(true);
      try {
        const profile = await AuthService.fetchUserProfile(authUser.uid);
        setUserProfile(profile);
      } finally {
        setIsProfileLoading(false);
      }
    }
  }, [authUser]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates: Partial<UserProfileModel>) => {
    if (authUser) {
      await AuthService.updateUserProfile(authUser.uid, updates);
      await refreshProfile();
    }
  }, [authUser, refreshProfile]);

  /**
   * Role checking methods
   * These are like Angular route guards
   */
  const hasRole = useCallback((role: keyof RolesModel) => {
    return userProfile?.roles?.[role] === true;
  }, [userProfile]);

  const hasSiteAccess = useCallback((siteId: string) => {
    return AuthService.hasSiteAccess(siteId);
  }, []);

  const getUserSites = useCallback(() => {
    return AuthService.getUserSites();
  }, []);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isSiteAdmin = useCallback(() => hasRole('siteAdmin'), [hasRole]);
  const isSuperAdmin = useCallback(() => hasRole('superAdmin'), [hasRole]);

  const value: AuthContextType = {
    authUser,
    userProfile,
    isLoading,
    isProfileLoading,
    login,
    signup,
    logout,
    refreshProfile,
    updateProfile,
    hasRole,
    hasSiteAccess,
    getUserSites,
    isAdmin,
    isSiteAdmin,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 * This is how components access auth state
 * Similar to injecting AuthService in Angular components
 */
export const useAuthProfile = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthProfile must be used within an AuthProfileProvider');
  }
  return context;
};

/**
 * HOC for protecting routes (like Angular guards)
 * Usage: withAuth(YourComponent)
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: keyof RolesModel
) => {
  return (props: P) => {
    const { userProfile, isLoading } = useAuthProfile();

    if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Loading...</Text>
        </View>
      );
    }

    if (!userProfile) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Please login</Text>
        </View>
      );
    }

    if (requiredRole && !userProfile.roles?.[requiredRole]) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Access denied. Required role: {requiredRole}</Text>
        </View>
      );
    }

    return <Component {...props} />;
  };
};