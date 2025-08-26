import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from 'react-native-paper';

export default function SCILayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primaryContainer,
        },
        headerTintColor: theme.colors.onPrimaryContainer,
        headerTitleStyle: {
          fontFamily: 'SpaceMono',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'SCI Documents',
          headerShown: false, // Will use drawer header
        }}
      />
      <Stack.Screen
        name="viewer"
        options={{
          title: 'Document Details',
        }}
      />
      <Stack.Screen
        name="capture"
        options={{
          title: 'Capture Image',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="gallery"
        options={{
          title: 'Image Gallery',
        }}
      />
    </Stack>
  );
}