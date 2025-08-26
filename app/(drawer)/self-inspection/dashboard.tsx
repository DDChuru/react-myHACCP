import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { 
  Surface, 
  Text, 
  Card, 
  useTheme,
  Chip,
  IconButton,
  ActivityIndicator,
  SegmentedButtons,
  Button,
  Badge,
  Avatar,
  List,
  ProgressBar
} from 'react-native-paper';
import { router } from 'expo-router';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

interface Issue {
  id: string;
  inspectionId: string;
  areaName: string;
  category: string;
  severity: string;
  severityLevel: number;
  description: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved';
  responsibleUserId: string;
  responsibleUserName: string;
  proposedActionDate: any;
  acknowledged: boolean;
  acknowledgedAt?: any;
  createdAt: any;
}

interface Inspection {
  id: string;
  siteName: string;
  inspectorName: string;
  issueCount: number;
  completedAt: any;
  resolvedCount: number;
  pendingCount: number;
}

export default function DashboardScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState<'my-issues' | 'my-inspections'>('my-issues');
  
  // Data
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [myInspections, setMyInspections] = useState<Inspection[]>([]);
  const [metrics, setMetrics] = useState({
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    overdue: 0,
    thisWeek: 0,
    completionRate: 0
  });
  
  const companyId = '2XTSaqxU41zCTBIVJeXb'; // Envirowize

  useEffect(() => {
    loadDashboardData();
  }, [view]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (view === 'my-issues') {
        await loadMyIssues();
      } else {
        await loadMyInspections();
      }
      
      calculateMetrics();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMyIssues = async () => {
    // In production, query Firestore for issues assigned to current user
    // Mock data for now
    const mockIssues: Issue[] = [
      {
        id: '1',
        inspectionId: 'insp1',
        areaName: 'Kitchen A',
        category: 'Equipment',
        severity: 'Critical',
        severityLevel: 3,
        description: 'Refrigerator temperature out of range',
        status: 'pending',
        responsibleUserId: user?.uid || '',
        responsibleUserName: user?.displayName || user?.email || '',
        proposedActionDate: new Date(Date.now() - 86400000), // Yesterday (overdue)
        acknowledged: false,
        createdAt: new Date(Date.now() - 172800000)
      },
      {
        id: '2',
        inspectionId: 'insp1',
        areaName: 'Storage Room',
        category: 'Hygiene',
        severity: 'Major',
        severityLevel: 2,
        description: 'Cleaning schedule not updated',
        status: 'acknowledged',
        responsibleUserId: user?.uid || '',
        responsibleUserName: user?.displayName || user?.email || '',
        proposedActionDate: new Date(Date.now() + 86400000), // Tomorrow
        acknowledged: true,
        acknowledgedAt: new Date(),
        createdAt: new Date(Date.now() - 86400000)
      },
      {
        id: '3',
        inspectionId: 'insp2',
        areaName: 'Prep Area',
        category: 'Documentation',
        severity: 'Minor',
        severityLevel: 1,
        description: 'MSDS sheets need updating',
        status: 'resolved',
        responsibleUserId: user?.uid || '',
        responsibleUserName: user?.displayName || user?.email || '',
        proposedActionDate: new Date(),
        acknowledged: true,
        acknowledgedAt: new Date(Date.now() - 43200000),
        createdAt: new Date(Date.now() - 259200000)
      }
    ];
    
    setMyIssues(mockIssues);
  };

  const loadMyInspections = async () => {
    // In production, query Firestore for inspections by current user
    // Mock data for now
    const mockInspections: Inspection[] = [
      {
        id: 'insp1',
        siteName: 'Main Facility',
        inspectorName: user?.displayName || user?.email || '',
        issueCount: 5,
        completedAt: new Date(Date.now() - 86400000),
        resolvedCount: 2,
        pendingCount: 3
      },
      {
        id: 'insp2',
        siteName: 'Warehouse B',
        inspectorName: user?.displayName || user?.email || '',
        issueCount: 3,
        completedAt: new Date(Date.now() - 172800000),
        resolvedCount: 3,
        pendingCount: 0
      }
    ];
    
    setMyInspections(mockInspections);
  };

  const calculateMetrics = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const pending = myIssues.filter(i => i.status === 'pending').length;
    const acknowledged = myIssues.filter(i => i.status === 'acknowledged').length;
    const resolved = myIssues.filter(i => i.status === 'resolved').length;
    const overdue = myIssues.filter(i => 
      i.status !== 'resolved' && 
      new Date(i.proposedActionDate) < now
    ).length;
    const thisWeek = myIssues.filter(i => 
      i.status === 'resolved' && 
      i.acknowledgedAt && 
      new Date(i.acknowledgedAt) > weekAgo
    ).length;
    
    const total = myIssues.length;
    const completionRate = total > 0 ? (resolved / total) * 100 : 0;
    
    setMetrics({
      pending,
      acknowledged,
      resolved,
      overdue,
      thisWeek,
      completionRate
    });
  };

  const handleAcknowledge = async (issueId: string) => {
    // In production, update Firestore
    setMyIssues(myIssues.map(issue => 
      issue.id === issueId 
        ? { ...issue, status: 'acknowledged', acknowledged: true, acknowledgedAt: new Date() }
        : issue
    ));
    calculateMetrics();
  };

  const handleIssuePress = (issue: Issue) => {
    router.push({
      pathname: '/self-inspection/corrective-action',
      params: {
        issueId: issue.id,
        inspectionId: issue.inspectionId
      }
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return theme.colors.error;
      case 'major': return theme.colors.secondary;
      case 'minor': return theme.colors.tertiary;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'acknowledged': return 'check';
      case 'in_progress': return 'progress-wrench';
      case 'resolved': return 'check-circle';
      default: return 'help-circle';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16 }}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Self-Inspection Dashboard</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 4 }}>
          Manage your inspections and issues
        </Text>
      </Surface>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        <SegmentedButtons
          value={view}
          onValueChange={value => setView(value as any)}
          buttons={[
            {
              value: 'my-issues',
              label: 'My Issues',
              icon: 'clipboard-alert',
            },
            {
              value: 'my-inspections',
              label: 'My Inspections',
              icon: 'clipboard-check',
            },
          ]}
        />
      </View>

      {/* Metrics Cards */}
      {view === 'my-issues' && (
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <Card style={[styles.metricCard, { backgroundColor: theme.colors.errorContainer }]}>
              <Card.Content style={styles.metricContent}>
                <Text variant="headlineMedium">{metrics.overdue}</Text>
                <Text variant="bodySmall">Overdue</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.metricCard, { backgroundColor: theme.colors.secondaryContainer }]}>
              <Card.Content style={styles.metricContent}>
                <Text variant="headlineMedium">{metrics.pending}</Text>
                <Text variant="bodySmall">Pending</Text>
              </Card.Content>
            </Card>
          </View>
          
          <View style={styles.metricsRow}>
            <Card style={[styles.metricCard, { backgroundColor: theme.colors.primaryContainer }]}>
              <Card.Content style={styles.metricContent}>
                <Text variant="headlineMedium">{metrics.acknowledged}</Text>
                <Text variant="bodySmall">In Progress</Text>
              </Card.Content>
            </Card>
            <Card style={[styles.metricCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
              <Card.Content style={styles.metricContent}>
                <Text variant="headlineMedium">{metrics.resolved}</Text>
                <Text variant="bodySmall">Resolved</Text>
              </Card.Content>
            </Card>
          </View>

          {/* Completion Rate */}
          <Card style={styles.completionCard}>
            <Card.Content>
              <View style={styles.completionHeader}>
                <Text variant="titleMedium">Completion Rate</Text>
                <Text variant="titleLarge">{metrics.completionRate.toFixed(0)}%</Text>
              </View>
              <ProgressBar 
                progress={metrics.completionRate / 100} 
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 8 }}>
                {metrics.thisWeek} issues resolved this week
              </Text>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {view === 'my-issues' ? (
          <>
            {myIssues.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <MaterialCommunityIcons 
                    name="clipboard-check" 
                    size={48} 
                    color={theme.colors.onSurfaceVariant}
                    style={{ alignSelf: 'center', marginBottom: 16 }}
                  />
                  <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
                    No issues assigned to you
                  </Text>
                  <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.6, marginTop: 8 }}>
                    Issues will appear here when assigned during inspections
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              myIssues.map(issue => (
                <Card 
                  key={issue.id} 
                  style={styles.issueCard}
                  onPress={() => handleIssuePress(issue)}
                >
                  <Card.Content>
                    <View style={styles.issueHeader}>
                      <View style={styles.issueInfo}>
                        <View style={styles.issueTitle}>
                          <MaterialCommunityIcons 
                            name={getStatusIcon(issue.status)} 
                            size={20} 
                            color={issue.status === 'resolved' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                          />
                          <Text variant="titleMedium" style={{ marginLeft: 8 }}>
                            {issue.areaName}
                          </Text>
                        </View>
                        <Chip 
                          mode="flat" 
                          compact
                          style={{ 
                            backgroundColor: getSeverityColor(issue.severity) + '20',
                            marginLeft: 28
                          }}
                        >
                          {issue.severity}
                        </Chip>
                      </View>
                      {issue.status === 'pending' && new Date(issue.proposedActionDate) < new Date() && (
                        <Badge style={styles.overdueBadge}>!</Badge>
                      )}
                    </View>
                    
                    <Text variant="bodyMedium" style={{ marginVertical: 8 }}>
                      {issue.description}
                    </Text>
                    
                    <View style={styles.issueFooter}>
                      <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                        Due: {new Date(issue.proposedActionDate).toLocaleDateString()}
                      </Text>
                      {issue.status === 'pending' && !issue.acknowledged && (
                        <Button
                          mode="contained-tonal"
                          onPress={() => handleAcknowledge(issue.id)}
                          compact
                        >
                          Acknowledge
                        </Button>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            {myInspections.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <MaterialCommunityIcons 
                    name="clipboard-text-outline" 
                    size={48} 
                    color={theme.colors.onSurfaceVariant}
                    style={{ alignSelf: 'center', marginBottom: 16 }}
                  />
                  <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
                    No inspections yet
                  </Text>
                  <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.6, marginTop: 8 }}>
                    Your completed inspections will appear here
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              myInspections.map(inspection => (
                <Card key={inspection.id} style={styles.inspectionCard}>
                  <Card.Content>
                    <View style={styles.inspectionHeader}>
                      <Avatar.Icon 
                        size={40} 
                        icon="domain" 
                        style={{ backgroundColor: theme.colors.primaryContainer }}
                      />
                      <View style={styles.inspectionInfo}>
                        <Text variant="titleMedium">{inspection.siteName}</Text>
                        <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                          {new Date(inspection.completedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.inspectionStats}>
                        <Chip mode="flat" compact>{inspection.issueCount} issues</Chip>
                      </View>
                    </View>
                    
                    <View style={styles.inspectionProgress}>
                      <View style={styles.progressRow}>
                        <Text variant="bodySmall">Resolution Progress</Text>
                        <Text variant="bodySmall">
                          {inspection.resolvedCount}/{inspection.issueCount}
                        </Text>
                      </View>
                      <ProgressBar 
                        progress={inspection.issueCount > 0 ? inspection.resolvedCount / inspection.issueCount : 0}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                      />
                    </View>
                    
                    <View style={styles.inspectionFooter}>
                      <Chip 
                        mode="flat" 
                        compact
                        icon="check"
                        style={{ backgroundColor: theme.colors.tertiaryContainer }}
                      >
                        {inspection.resolvedCount} Resolved
                      </Chip>
                      {inspection.pendingCount > 0 && (
                        <Chip 
                          mode="flat" 
                          compact
                          icon="clock"
                          style={{ backgroundColor: theme.colors.secondaryContainer, marginLeft: 8 }}
                        >
                          {inspection.pendingCount} Pending
                        </Chip>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  viewSelector: {
    padding: 16,
  },
  metricsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
  },
  metricContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  completionCard: {
    marginHorizontal: 6,
    borderRadius: 12,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  emptyCard: {
    marginVertical: 32,
    borderRadius: 12,
  },
  issueCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  issueInfo: {
    flex: 1,
  },
  issueTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  overdueBadge: {
    backgroundColor: '#ff5252',
  },
  inspectionCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inspectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  inspectionStats: {
    alignItems: 'flex-end',
  },
  inspectionProgress: {
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inspectionFooter: {
    flexDirection: 'row',
  },
});