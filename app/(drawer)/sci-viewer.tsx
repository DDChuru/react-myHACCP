/**
 * SCI Viewer Screen
 * Fallback screen for viewing SCI documents (redirects to use modal)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function SCIViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const sciId = params.sciId as string;
  const itemName = params.itemName as string;

  useEffect(() => {
    // This screen should not be accessed directly anymore
    // Redirect back to area verification
    console.log('SCI Viewer accessed directly, redirecting...');
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        SCI Document Viewer
      </Text>
      <Text variant="bodyMedium" style={styles.message}>
        Please access SCI documents through the iClean Verification screen
      </Text>
      <Button
        mode="contained"
        onPress={() => router.back()}
        style={styles.button}
      >
        Go Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  title: {
    color: '#ffffff',
    marginBottom: 16,
  },
  message: {
    color: '#b3b3b3',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
  },
});