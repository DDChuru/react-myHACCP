/**
 * Area Verification Screen
 * Shows schedule tabs and verification items for a selected area
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  RefreshControl,
  Pressable,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  SegmentedButtons,
  Surface,
  Portal,
  Modal,
  FAB,
  Badge,
  Chip,
  ProgressBar,
  useTheme,
  Switch,
  Divider,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { VerificationService } from '../../services/iCleanVerificationService';
import { 
  LocalVerificationProgress,
  AreaItemProgress,
  ScheduleGroupProgress,
  STATUS_COLORS,
  VerificationStatus,
} from '../../types/iCleanVerification';
import VerificationItemCard from '../../components/VerificationItemCard';
import CompleteInspectionModal from '../../components/CompleteInspectionModal';
import SCIViewerModal from '../../components/SCIViewerModal';

type ScheduleTab = 'daily' | 'weekly' | 'monthly';

export default function AreaVerificationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, userProfile: profile } = useAuth();
  
  const areaId = params.areaId as string;
  const areaName = params.areaName as string;
  const siteId = params.siteId as string;
  
  // State management
  const [activeTab, setActiveTab] = useState<ScheduleTab>('daily');
  const [progress, setProgress] = useState<LocalVerificationProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AreaItemProgress | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue'>('all');
  const [showSCIModal, setShowSCIModal] = useState(false);
  const [selectedSCIId, setSelectedSCIId] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>('');
  const [fabOpen, setFabOpen] = useState(false);
  
  // Initialize service
  const verificationService = new VerificationService(
    profile?.companyId || '',
    user?.uid || ''
  );
  
  // High contrast colors
  const colors = {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    cardBg: '#333333',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#424242',
  };

  useEffect(() => {
    loadProgress();
  }, [areaId]);

  const loadProgress = async () => {
    try {
      const localProgress = await verificationService.getLocalProgress(areaId, false, siteId);
      if (localProgress) {
        setProgress(localProgress);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      Alert.alert('Error', 'Failed to load verification data');
    }
  };

  const handleRefresh = useCallback(async () => {
    console.log('[AreaVerification] Starting pull-to-refresh sync...');
    setRefreshing(true);
    try {
      // Force sync with Firestore
      const freshProgress = await verificationService.syncWithFirestore(areaId, siteId);
      if (freshProgress) {
        setProgress(freshProgress);
        console.log('[AreaVerification] Sync complete. Items loaded:', {
          daily: freshProgress.scheduleGroups.daily.items.length,
          weekly: freshProgress.scheduleGroups.weekly.items.length,
          monthly: freshProgress.scheduleGroups.monthly.items.length,
          siteId: freshProgress.siteId  // Log the siteId to verify it's correct
        });
      }
    } catch (error) {
      console.error('[AreaVerification] Refresh error:', error);
      Alert.alert('Sync Failed', 'Unable to sync data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [areaId, siteId]);

  const getCurrentScheduleGroup = (): ScheduleGroupProgress | null => {
    if (!progress) return null;
    return progress.scheduleGroups[activeTab];
  };

  const getFilteredItems = (): AreaItemProgress[] => {
    const group = getCurrentScheduleGroup();
    if (!group) return [];
    
    let items = [...group.items];
    
    switch (filter) {
      case 'pending':
        items = items.filter(i => i.isDue && i.status === 'pending');
        break;
      case 'overdue':
        items = items.filter(i => i.isOverdue);
        break;
    }
    
    // Sort by priority: overdue first, then due, then others
    items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      if (a.isDue && !b.isDue) return -1;
      if (!a.isDue && b.isDue) return 1;
      return 0;
    });
    
    return items;
  };

  const handleVerifyItem = async (item: AreaItemProgress, status: 'pass' | 'fail', reasonForFailure?: string, actionTaken?: string) => {
    try {
      // Build full context for inspection record (matching ACS/Angular structure)
      const verificationDetails = {
        // Location context
        siteId: siteId || progress?.siteId || areaId,  // Use passed siteId first
        areaId: areaId,
        area: {
          id: areaId,
          name: areaName,
          siteId: siteId,  // Include siteId in area object
          // Add more area details if available in progress
        },
        
        // Item details
        itemDescription: item.itemName,
        
        // Schedule context
        scheduleId: activeTab,
        schedule: {
          id: activeTab,
          name: activeTab === 'daily' ? 'Daily' : activeTab === 'weekly' ? 'Weekly' : 'Monthly',
          days: activeTab === 'daily' ? 1 : activeTab === 'weekly' ? 7 : 30,
          hours: activeTab === 'daily' ? 24 : activeTab === 'weekly' ? 168 : 720,
          cycleId: activeTab === 'daily' ? 1 : activeTab === 'weekly' ? 2 : 3,
        },
        
        // User context
        user: profile ? {
          id: user?.uid,
          fullName: profile.fullName || profile.displayName,
          email: user?.email,
          companyId: profile.companyId,
          roles: profile.roles,
        } : undefined,
        
        // Failure details (aligned with Angular structure)
        reasonForFailure: status === 'fail' ? (reasonForFailure || '') : undefined,
        actionTaken: status === 'fail' ? (actionTaken || '') : undefined,
        notes: reasonForFailure || actionTaken ? `${reasonForFailure}${actionTaken ? '\nAction: ' + actionTaken : ''}` : undefined,
        
        // Item metadata
        scoreWeight: 1,
        firstInspection: !item.verifiedAt,
      };
      
      await verificationService.verifyItem(item.areaItemId, status, verificationDetails);
      
      // Reload progress to show updated status
      await loadProgress();
    } catch (error) {
      console.error('Error verifying item:', error);
      Alert.alert('Error', 'Failed to save verification');
    }
  };

  const handleCompleteInspection = () => {
    const group = getCurrentScheduleGroup();
    if (!group) return;
    
    // Check if there are unverified daily items
    const unverifiedDaily = progress?.scheduleGroups.daily.items.filter(
      i => i.isDue && i.status === 'pending'
    ) || [];
    
    if (unverifiedDaily.length === 0 && activeTab === 'daily') {
      Alert.alert('All Complete', 'All daily items have been verified');
      return;
    }
    
    setShowCompleteModal(true);
  };

  const handleQuickPassAll = async () => {
    const pendingItems = getFilteredItems().filter(i => i.status === 'pending');
    
    Alert.alert(
      'Pass All Pending Items?',
      `This will mark ${pendingItems.length} items as passed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pass All', 
          onPress: async () => {
            setFabOpen(false);
            // Pass all pending items
            for (const item of pendingItems) {
              await handleVerifyItem(item, 'pass', 'Batch verified');
            }
            Alert.alert('Success', `${pendingItems.length} items marked as passed`);
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleBatchPhotoCapture = () => {
    setFabOpen(false);
    Alert.alert(
      'Batch Photo Capture',
      'This feature will allow you to quickly capture photos for multiple items.',
      [{ text: 'OK' }]
    );
    // TODO: Implement batch photo capture workflow
  };

  const confirmCompleteInspection = async () => {
    setShowCompleteModal(false);
    
    try {
      await verificationService.completeInspection(areaId, true);
      await loadProgress();
      
      // Show success but stay on screen for user to continue with weekly/monthly
      Alert.alert(
        'Daily Inspection Complete ✅',
        'Daily items have been auto-passed. You can now verify weekly or monthly items.',
        [
          { 
            text: 'Continue Verifying', 
            onPress: () => {
              // Switch to weekly tab if daily is complete
              if (activeTab === 'daily') {
                setActiveTab('weekly');
              }
            }
          },
          { 
            text: 'Return to Areas', 
            onPress: () => {
              // Navigate explicitly to iclean-verification instead of using back()
              router.replace('/(drawer)/iclean-verification');
            },
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error completing inspection:', error);
      Alert.alert('Error', 'Failed to complete inspection');
    }
  };

  const renderProgressHeader = () => {
    const group = getCurrentScheduleGroup();
    if (!group) return null;
    
    const progressPercentage = group.completionPercentage || 0;
    
    return (
      <Surface style={[styles.progressHeader, { backgroundColor: colors.surface }]} elevation={1}>
        <View style={styles.progressInfo}>
          <Text variant="titleMedium" style={{ color: colors.text }}>
            {areaName}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Items
          </Text>
        </View>
        
        <View style={styles.progressStats}>
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={{ color: colors.text }}>
              {group.completedCount}/{group.totalCount}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Completed
            </Text>
          </View>
          
          {group.failedCount > 0 && (
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={{ color: STATUS_COLORS.fail.background }}>
                {group.failedCount}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                Failed
              </Text>
            </View>
          )}
          
          <View style={styles.statItem}>
            <Text variant="headlineSmall" style={{ color: STATUS_COLORS.pass.background }}>
              {Math.round(progressPercentage)}%
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Complete
            </Text>
          </View>
        </View>
        
        <ProgressBar
          progress={progressPercentage / 100}
          color={progressPercentage === 100 ? STATUS_COLORS.pass.background : theme.colors.primary}
          style={styles.progressBar}
        />
      </Surface>
    );
  };

  const renderScheduleTabs = () => (
    <View style={styles.tabsContainer}>
      <SegmentedButtons
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ScheduleTab)}
        buttons={[
          {
            value: 'daily',
            label: 'Daily',
            icon: () => (
              <View style={styles.tabIconContainer}>
                <MaterialCommunityIcons name="calendar-today" size={20} color={colors.text} />
                {progress?.scheduleGroups.daily.items.filter(i => i.isOverdue).length > 0 && (
                  <Badge size={12} style={styles.tabBadge}>!</Badge>
                )}
              </View>
            ),
          },
          {
            value: 'weekly',
            label: 'Weekly',
            icon: () => (
              <View style={styles.tabIconContainer}>
                <MaterialCommunityIcons name="calendar-week" size={20} color={colors.text} />
                {progress?.scheduleGroups.weekly.items.filter(i => i.isOverdue).length > 0 && (
                  <Badge size={12} style={styles.tabBadge}>!</Badge>
                )}
              </View>
            ),
          },
          {
            value: 'monthly',
            label: 'Monthly',
            icon: () => (
              <View style={styles.tabIconContainer}>
                <MaterialCommunityIcons name="calendar-month" size={20} color={colors.text} />
                {progress?.scheduleGroups.monthly.items.filter(i => i.isOverdue).length > 0 && (
                  <Badge size={12} style={styles.tabBadge}>!</Badge>
                )}
              </View>
            ),
          },
        ]}
        style={{ backgroundColor: colors.surface }}
      />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        <Chip
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          style={[styles.filterChip, { backgroundColor: filter === 'all' ? theme.colors.primary : colors.surface }]}
          textStyle={{ color: colors.text }}
        >
          All Items
        </Chip>
        <Chip
          selected={filter === 'pending'}
          onPress={() => setFilter('pending')}
          style={[styles.filterChip, { backgroundColor: filter === 'pending' ? theme.colors.primary : colors.surface }]}
          textStyle={{ color: colors.text }}
        >
          Pending
        </Chip>
        <Chip
          selected={filter === 'overdue'}
          onPress={() => setFilter('overdue')}
          style={[styles.filterChip, { backgroundColor: filter === 'overdue' ? STATUS_COLORS.overdue.background : colors.surface }]}
          textStyle={{ color: colors.text }}
        >
          Overdue
        </Chip>
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }: { item: AreaItemProgress }) => (
    <VerificationItemCard
      item={item}
      onVerify={(status, reasonForFailure, actionTaken) => handleVerifyItem(item, status, reasonForFailure, actionTaken)}
      onAddPhoto={() => {
        setSelectedItem(item);
        router.push({
          pathname: '/(drawer)/capture-photo',
          params: { itemId: item.areaItemId, itemName: item.itemName }
        });
      }}
      onViewSCI={() => {
        if (item.sciReference) {
          setSelectedSCIId(item.sciReference);
          setSelectedItemName(item.itemName);
          setShowSCIModal(true);
        }
      }}
      colorScheme={STATUS_COLORS[item.status as VerificationStatus]}
      isOffline={progress?.syncStatus !== 'synced'}
    />
  );

  const items = getFilteredItems();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Back Button */}
      <Surface style={[styles.header, { backgroundColor: colors.surface }]} elevation={2}>
        <View style={styles.headerRow}>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.replace('/(drawer)/iclean-verification')}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </Pressable>
          
          <View style={styles.headerContent}>
            <Text variant="titleLarge" style={{ color: colors.text }} numberOfLines={1}>
              {areaName}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              Site: {siteId ? siteId.substring(0, 8) + '...' : 'Unknown'}
            </Text>
          </View>
          
          {/* Menu Button for Additional Options */}
          <Pressable 
            style={styles.menuButton}
            onPress={() => {
              Alert.alert(
                'Area Options',
                'What would you like to do?',
                [
                  { text: 'View Area Details', onPress: () => {} },
                  { text: 'Skip This Area', onPress: () => router.replace('/(drawer)/iclean-verification') },
                  { text: 'Cancel', style: 'cancel' }
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.text} />
          </Pressable>
        </View>
      </Surface>
      
      {renderProgressHeader()}
      {renderScheduleTabs()}
      
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.areaItemId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="checkbox-marked-circle-outline" 
              size={64} 
              color={STATUS_COLORS.pass.background} 
            />
            <Text variant="titleMedium" style={{ color: colors.text, marginTop: 16 }}>
              {filter === 'all' ? 'No items scheduled' : `No ${filter} items`}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8 }}>
              {filter === 'all' 
                ? 'Items will appear based on their schedule'
                : 'Try changing the filter to see more items'}
            </Text>
          </View>
        }
      />
      
      {/* Exit Area FAB - Always visible in top left */}
      <FAB
        icon="exit-to-app"
        size="small"
        onPress={() => {
          Alert.alert(
            'Exit Area Verification?',
            'Your progress has been saved. You can continue where you left off.',
            [
              { text: 'Stay', style: 'cancel' },
              { 
                text: 'Exit to Areas', 
                onPress: () => router.replace('/(drawer)/iclean-verification')
              }
            ]
          );
        }}
        style={[styles.exitFab, { backgroundColor: colors.surface }]}
        color={colors.text}
      />
      
      {/* Complete Inspection FAB - Show when there are pending items */}
      {activeTab === 'daily' && items.length > 0 && (
        <FAB
          icon="check-all"
          label={`Complete ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Inspection`}
          onPress={handleCompleteInspection}
          style={[styles.fab, { 
            backgroundColor: progress?.scheduleGroups[activeTab].completedCount === progress?.scheduleGroups[activeTab].totalCount 
              ? STATUS_COLORS.pass.background 
              : '#ff9800' 
          }]}
          color="#fff"
        />
      )}
      
      {/* Quick Actions FAB Group for Weekly/Monthly */}
      {activeTab !== 'daily' && items.filter(i => i.status === 'pending').length > 0 && (
        <FAB.Group
          open={fabOpen}
          icon={fabOpen ? 'close' : 'lightning-bolt'}
          actions={[
            {
              icon: 'check-all',
              label: 'Pass All Pending',
              onPress: () => handleQuickPassAll(),
              color: STATUS_COLORS.pass.background,
            },
            {
              icon: 'camera-burst',
              label: 'Batch Photo Capture',
              onPress: () => handleBatchPhotoCapture(),
              color: '#2196f3',
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          onPress={() => setFabOpen(!fabOpen)}
          visible={true}
          style={styles.fabGroup}
          color="#fff"
          fabStyle={{ backgroundColor: '#2196f3' }}
        />
      )}
      
      {/* Complete Inspection Modal */}
      <CompleteInspectionModal
        visible={showCompleteModal}
        onConfirm={confirmCompleteInspection}
        onCancel={() => setShowCompleteModal(false)}
        dailyItems={{
          manual: progress?.scheduleGroups.daily.items.filter(i => i.status !== 'pending') || [],
          toAutoPass: progress?.scheduleGroups.daily.items.filter(i => i.isDue && i.status === 'pending') || [],
        }}
        weeklyItems={progress?.scheduleGroups.weekly.items || []}
        monthlyItems={progress?.scheduleGroups.monthly.items || []}
      />
      
      {/* SCI Viewer Modal */}
      <SCIViewerModal
        visible={showSCIModal}
        onDismiss={() => setShowSCIModal(false)}
        documentId={selectedSCIId}
        companyId={profile?.companyId || ''}
        itemName={selectedItemName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 12,
    borderRadius: 8,
  },
  progressHeader: {
    padding: 16,
  },
  progressInfo: {
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabIconContainer: {
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff5722',
  },
  filterChips: {
    marginTop: 12,
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  exitFab: {
    position: 'absolute',
    margin: 16,
    left: 0,
    bottom: 0,
    elevation: 4,
  },
  fabGroup: {
    paddingBottom: 50,
  },
});