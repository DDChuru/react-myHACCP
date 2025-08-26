
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthService from '../services/AuthService';

const AuthContext = createContext();

/**
 * Legacy AuthProvider - being migrated to AuthProfileProvider
 * Keeping for backward compatibility
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, 
      async (user) => {
        console.log('[AuthProvider] Auth state changed:', user ? user.email : 'null');
        setUser(user);
        
        // Fetch user profile when auth changes
        if (user) {
          try {
            const profile = await AuthService.fetchUserProfile(user.uid);
            setUserProfile(profile);
            // IMPORTANT: Sync with AuthService singleton for services to use
            AuthService.setCurrentProfile(profile);
            console.log('[AuthProvider] Profile loaded:', profile?.email);
          } catch (error) {
            console.error('[AuthProvider] Error loading profile:', error);
          }
        } else {
          setUserProfile(null);
          // Clear the AuthService singleton profile
          AuthService.setCurrentProfile(null);
        }
        
        setIsLoading(false);
      },
      (error) => {
        console.error('[AuthProvider] Auth error:', error);
        setIsLoading(false);
      }
    );

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('[AuthProvider] Auth timeout - setting loading to false');
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, isLoading }}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
