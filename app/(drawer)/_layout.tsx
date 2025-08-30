import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Text, Divider, Surface, Avatar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';

function CustomDrawerContent(props: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Filter out section header items from the drawer list
  const filteredProps = {
    ...props,
    state: {
      ...props.state,
      routes: props.state.routes.filter((route: any) => 
        !route.name.includes('-header')
      ),
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface }}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={{ 
          paddingTop: 0,
          paddingBottom: 100, // Add padding to ensure last items are visible
        }}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
      >
        {/* Header - Improved spacing and balance */}
        <Surface style={[styles.header, { backgroundColor: theme.colors.primaryContainer, paddingTop: insets.top + 24 }]}>
          <Avatar.Text 
            size={56} 
            label={user?.email?.substring(0, 2).toUpperCase() || 'U'} 
            style={styles.avatar}
          />
          <Text variant="titleMedium" style={styles.userName}>
            {user?.email || 'Guest User'}
          </Text>
          <Text variant="bodySmall" style={styles.userRole}>
            HACCP Manager
          </Text>
        </Surface>

        {/* Main Navigation Items */}
        <View style={styles.drawerContent}>
          {/* Dashboard */}
          <DrawerItem
            label="Dashboard"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('(tabs)')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, { marginTop: 8 }]}
          />

          {/* Documents Section */}
          <RNText style={styles.sectionHeader}>DOCUMENTS</RNText>
          <DrawerItem
            label="Documents & SOPs"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="file-document-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('documents')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />
          <DrawerItem
            label="SCI Documents"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="camera-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('sci')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />

          {/* Audits & Inspections Section */}
          <RNText style={styles.sectionHeader}>AUDITS & INSPECTIONS</RNText>
          <DrawerItem
            label="Self Inspection"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="clipboard-check-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('self-inspection')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />
          <DrawerItem
            label="Internal Audit"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="clipboard-list-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('internal-audit')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />
          <DrawerItem
            label="External Inspection"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="shield-check-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('inspection')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />
          <DrawerItem
            label="iClean Verification"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('iclean-verification')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />

          {/* People & Training Section */}
          <RNText style={styles.sectionHeader}>PEOPLE & TRAINING</RNText>
          <DrawerItem
            label="Crew Member"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="account-group-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('crew-members')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />
          <DrawerItem
            label="Training Records"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="school-outline" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('training')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />

          {/* Analytics */}
          <RNText style={styles.sectionHeader}>ANALYTICS</RNText>
          <DrawerItem
            label="Reports & Analytics"
            icon={({ color, size }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            )}
            onPress={() => props.navigation.navigate('reports')}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            style={[styles.drawerItem, styles.indentedItem]}
          />
        </View>
      </DrawerContentScrollView>

      {/* Bottom Section - Fixed at bottom */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 10 }]}>
        <Divider />
        <DrawerItem
          label="Settings"
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" size={size} color={color} />
          )}
          onPress={() => props.navigation.navigate('settings')}
          activeTintColor={theme.colors.primary}
          inactiveTintColor={theme.colors.onSurfaceVariant}
          style={styles.bottomItem}
        />
        <DrawerItem
          label="Help & Support"
          icon={({ color, size }) => (
            <MaterialCommunityIcons name="help-circle-outline" size={size} color={color} />
          )}
          onPress={() => props.navigation.navigate('support')}
          activeTintColor={theme.colors.primary}
          inactiveTintColor={theme.colors.onSurfaceVariant}
          style={styles.bottomItem}
        />
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 280,
        },
        headerStyle: {
          backgroundColor: theme.colors.primaryContainer,
          elevation: 4,
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        headerTintColor: theme.colors.onPrimaryContainer,
        headerTitleStyle: {
          fontFamily: 'SpaceMono',
        },
        headerStatusBarHeight: insets.top,
        // Ensure drawer overlays content properly with higher z-index
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        sceneContainerStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      {/* All screens for navigation - hidden from drawer as we're using custom content */}
      <Drawer.Screen
        name="(tabs)"
        options={{
          title: 'Dashboard',
          headerShown: false,
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="documents"
        options={{
          title: 'Documents & SOPs',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="sci"
        options={{
          title: 'SCI Documents',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="self-inspection"
        options={{
          title: 'Self Inspection',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="internal-audit"
        options={{
          title: 'Internal Audit',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="inspection"
        options={{
          title: 'External Inspection',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="iclean-verification"
        options={{
          title: 'iClean Verification',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="area-verification"
        options={{
          title: 'Area Verification',
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />

      <Drawer.Screen
        name="crew-members"
        options={{
          title: 'Crew Member',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="training"
        options={{
          title: 'Training Records',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="reports"
        options={{
          title: 'Reports & Analytics',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="support"
        options={{
          title: 'Help & Support',
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  avatar: {
    marginBottom: 8,
  },
  userName: {
    marginTop: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  userRole: {
    marginTop: 4,
    opacity: 0.8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  drawerContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    letterSpacing: 0.8,
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  drawerItem: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  indentedItem: {
    paddingLeft: 8,
  },
  bottomSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 8,
    backgroundColor: 'inherit',
  },
  bottomItem: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
});