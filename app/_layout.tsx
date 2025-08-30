import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { AuthProfileProvider } from '../hooks/useAuthProfile';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { PaperProvider } from 'react-native-paper';
import { lightTheme, darkTheme } from '../theme/paperTheme';
import { SCIProvider } from '../contexts/SCIContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const InitialLayout = ({ loaded }: { loaded: boolean }) => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  console.log('[InitialLayout] Render:', { 
    loaded, 
    isLoading, 
    user: user?.email || null, 
    segments 
  });

  useEffect(() => {
    console.log('[Navigation] Effect triggered:', { loaded, isLoading, userExists: !!user });
    
    if (!loaded || isLoading) {
      console.log('[Navigation] Waiting for load...', { loaded, isLoading });
      return;
    }

    // Use setTimeout to ensure navigation happens after the layout is mounted
    const timer = setTimeout(() => {
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
      
      console.log('[Navigation] Checking route:', {
        segments,
        inAuthGroup,
        hasUser: !!user,
        firstSegment: segments[0]
      });

      // Only redirect if we're not already in the right place
      if (!user && !inAuthGroup) {
        console.log('[Navigation] Redirecting unauthenticated user to login...');
        router.replace('/login');
      } else if (user && inAuthGroup) {
        // Redirect authenticated users away from auth screens
        console.log('[Navigation] Redirecting authenticated user from auth screen to drawer...');
        router.replace('/(drawer)');
      } else if (user && !segments[0]) {
        // Only redirect to drawer if we have no route at all
        console.log('[Navigation] Redirecting authenticated user to drawer...');
        router.replace('/(drawer)');
      } else {
        console.log('[Navigation] No redirect needed - already in correct location');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [user, loaded, isLoading, segments, router]);

  return (
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  console.log('[RootLayout] Font status:', { loaded, error });
  
  // Log to help debug white screen
  useEffect(() => {
    console.log('[RootLayout] Component mounted, fonts loaded:', loaded);
  }, []);

  useEffect(() => {
    if (error) {
      console.error('[RootLayout] Font error:', error);
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      console.log('[RootLayout] Fonts loaded, hiding splash screen...');
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    console.log('[RootLayout] Waiting for fonts to load...');
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthProfileProvider>
          <PaperProvider theme={colorScheme === 'dark' ? darkTheme : lightTheme}>
            <SCIProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <InitialLayout loaded={loaded} />
                <StatusBar style="auto" />
              </ThemeProvider>
            </SCIProvider>
          </PaperProvider>
        </AuthProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}