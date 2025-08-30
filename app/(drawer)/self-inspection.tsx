import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Surface, Text, Card, FAB, useTheme, List, Chip, ProgressBar, Avatar, IconButton, Banner, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NotificationBell from '../../components/NotificationBell';
import { useSync } from '../../hooks/useSync';
import { useAuth } from '../../hooks/useAuth';
import { useOffline } from '../../hooks/useOffline';
import { getSelfInspections, SelfInspection } from '../../services/selfInspectionService';
import { getFABPosition } from '../../utils/fabHelper';

export default function SelfInspectionScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { syncing, syncAll, lastSync, syncStatus } = useSync();
  const { isOffline, pendingItems, forceSync, hasPendingChanges } = useOffline();
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const [inspections, setInspections] = useState<SelfInspection[]>([]);
  const [loading, setLoading] = useState(true);
  
  const companyId = user?.companyId || '2XTSaqxU41zCTBIVJeXb'; // Default to Envirowize for dev
  
  const handleDashboardPress = () => {
    router.push('/self-inspection/dashboard');
  };

  const loadInspections = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSelfInspections(companyId);
      setInspections(data);
    } catch (error) {
      console.error('Error loading inspections:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const handleRefresh = useCallback(async () => {
    setShowSyncBanner(true);
    if (!isOffline) {
      await syncAll();
      await forceSync(); // Force sync offline queue
    }
    await loadInspections(); // Reload after sync
    setTimeout(() => setShowSyncBanner(false), 3000);
  }, [syncAll, loadInspections, isOffline, forceSync]);

  const handleInspectionPress = (inspection: SelfInspection) => {
    // Navigate based on status
    if (inspection.status === 'completed') {
      // View completed inspection
      router.push({
        pathname: '/self-inspection/view',
        params: { 
          inspectionId: inspection.id,
          companyId 
        }
      });
    } else {
      // Resume or start inspection
      router.push({
        pathname: '/self-inspection/conduct',
        params: { 
          inspectionId: inspection.id,
          companyId,
          site: inspection.site,
          siteId: inspection.siteId
        }
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Not scheduled';
    
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return `Today, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.primary;
      case 'in_progress':
        return theme.colors.tertiary;
      case 'pending':
        return theme.colors.secondary;
      case 'draft':
        return theme.colors.outline;
      default:
        return theme.colors.surface;
    }
  };

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={syncing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                Self Inspections
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Complete daily checks and inspections
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                {isOffline ? (
                  <>
                    <MaterialCommunityIcons 
                      name="wifi-off" 
                      size={14} 
                      color={theme.colors.error} 
                      style={{ marginRight: 4 }}
                    />
                    <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                      Offline Mode
                    </Text>
                    {hasPendingChanges && (
                      <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: 8 }}>
                        • {pendingItems} pending
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name="wifi" 
                      size={14} 
                      color={theme.colors.primary} 
                      style={{ marginRight: 4 }}
                    />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>
                      {lastSync ? `Synced: ${lastSync.toLocaleTimeString()}` : 'Online'}
                    </Text>
                  </>
                )}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <IconButton
                icon="sync"
                mode="contained-tonal"
                onPress={handleRefresh}
                disabled={syncing}
              />
              <NotificationBell />
              <IconButton
                icon="view-dashboard"
                mode="contained-tonal"
                onPress={handleDashboardPress}
              />
            </View>
          </View>
        </Surface>

        {/* Sync Status Banner */}
        {showSyncBanner && (
          <Banner
            visible={showSyncBanner}
            icon={isOffline ? "wifi-off" : "check-circle"}
            style={{ backgroundColor: isOffline ? theme.colors.errorContainer : theme.colors.primaryContainer }}
          >
            {isOffline 
              ? `Working offline. ${pendingItems} changes will sync when connected.`
              : `Data synced successfully! ${syncStatus.filter(s => s.status === 'success').length} collections updated.`
            }
          </Banner>
        )}

        {/* Offline Persistence Banner */}
        {isOffline && hasPendingChanges && (
          <Banner
            visible={true}
            icon="cloud-off-outline"
            style={{ backgroundColor: theme.colors.tertiaryContainer }}
            actions={[
              {
                label: 'View Pending',
                onPress: () => {
                  // Could navigate to a pending changes screen
                  console.log('View pending changes');
                },
              },
            ]}
          >
            {pendingItems} inspection{pendingItems !== 1 ? 's' : ''} saved locally. Will sync when online.
          </Banner>
        )}

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text variant="bodyLarge" style={{ marginTop: 16 }}>Loading inspections...</Text>
            </View>
          ) : inspections.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons 
                  name="clipboard-text-outline" 
                  size={64} 
                  color={theme.colors.onSurfaceVariant} 
                  style={{ opacity: 0.5 }}
                />
                <Text variant="titleMedium" style={{ marginTop: 16, opacity: 0.7 }}>
                  No inspections scheduled
                </Text>
                <Text variant="bodyMedium" style={{ marginTop: 8, opacity: 0.5, textAlign: 'center' }}>
                  Tap the + button to create a new inspection
                </Text>
              </Card.Content>
            </Card>
          ) : (
            inspections.map((inspection) => (
              <TouchableOpacity 
                key={inspection.id} 
                onPress={() => handleInspectionPress(inspection)}
                activeOpacity={0.7}
              >
                <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <Avatar.Icon 
                        size={40} 
                        icon="clipboard-check" 
                        style={{ 
                          backgroundColor: getStatusColor(inspection.status) + '20'
                        }}
                      />
                      <View style={styles.cardInfo}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                          {inspection.name || 'Inspection'}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
                          {inspection.site}
                        </Text>
                      </View>
                      <Chip 
                        mode="flat" 
                        textStyle={{ fontSize: 11 }}
                        style={{ 
                          backgroundColor: getStatusColor(inspection.status) + '20'
                        }}
                      >
                        {inspection.status.replace('_', ' ')}
                      </Chip>
                    </View>
                    
                    {inspection.issueCount > 0 && (
                      <TouchableOpacity 
                        style={styles.issuesSection}
                        onPress={() => handleInspectionPress(inspection)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons 
                            name="alert-circle" 
                            size={20} 
                            color={theme.colors.error} 
                          />
                          <Text 
                            variant="bodyMedium" 
                            style={{ 
                              color: theme.colors.error, 
                              marginLeft: 8,
                              fontWeight: '500'
                            }}
                          >
                            {inspection.issueCount} issue{inspection.issueCount > 1 ? 's' : ''} found
                          </Text>
                          <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={20} 
                            color={theme.colors.error}
                            style={{ marginLeft: 'auto' }}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                    
                    {inspection.status === 'completed' && inspection.issueCount === 0 && (
                      <View style={styles.completedSection}>
                        <MaterialCommunityIcons 
                          name="check-circle" 
                          size={20} 
                          color={theme.colors.success} 
                        />
                        <Text 
                          variant="bodyMedium" 
                          style={{ 
                            color: theme.colors.success, 
                            marginLeft: 8,
                            fontWeight: '500'
                          }}
                        >
                          Completed - No issues found
                        </Text>
                      </View>
                    )}
                    
                    {inspection.status === 'in_progress' && (
                      <View style={styles.progressSection}>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          In Progress
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={{ marginLeft: 4, color: theme.colors.onSurfaceVariant }}>
                        {formatDate(inspection.scheduledDate)}
                      </Text>
                      {inspection.assignedToName && (
                        <>
                          <MaterialCommunityIcons 
                            name="account" 
                            size={16} 
                            color={theme.colors.onSurfaceVariant} 
                            style={{ marginLeft: 16 }}
                          />
                          <Text variant="bodySmall" style={{ marginLeft: 4, color: theme.colors.onSurfaceVariant }}>
                            {inspection.assignedToName}
                          </Text>
                        </>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, getFABPosition(insets)]}
        onPress={() => router.push('/self-inspection/new')}
        label="New Inspection"
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  progressSection: {
    marginVertical: 12,
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
  },
  issuesSection: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  completedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyCard: {
    marginTop: 32,
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
});