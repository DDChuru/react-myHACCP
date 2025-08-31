import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { useTheme, Badge } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 49 + insets.bottom : 56 + insets.bottom,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : insets.bottom > 0 ? insets.bottom : 5,
          paddingTop: 5,
          position: 'absolute',
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'SpaceMono',
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
        },
        headerStyle: {
          backgroundColor: theme.colors.primaryContainer,
        },
        headerTintColor: theme.colors.onPrimaryContainer,
        headerLeft: () => <DrawerToggleButton tintColor={theme.colors.onPrimaryContainer} />,
        headerStatusBarHeight: insets.top,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
          tabBarBadge: 3, // Shows notification count
        }}
      />
      
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-list-outline" size={size} color={color} />
          ),
          tabBarBadge: 5,
        }}
      />

      <Tabs.Screen
        name="quick-check"
        options={{
          title: 'Quick Check',
          tabBarLabel: 'Quick Check',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MaterialCommunityIcons name="lightning-bolt" size={size} color={color} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
          tabBarBadge: 2,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}