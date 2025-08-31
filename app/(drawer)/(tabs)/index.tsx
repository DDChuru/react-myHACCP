import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  useTheme,
  Badge,
  ProgressBar,
  Chip,
  Avatar,
} from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { haccpStyles } from '../../../theme/paperTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const moduleIcons = {
  documents: 'file-document-outline',
  selfInspection: 'clipboard-check-outline',
  internalAudit: 'clipboard-search-outline',
  inspection: 'magnify-scan',
  temperature: 'thermometer',
  suppliers: 'truck-outline',
  training: 'school-outline',
  reports: 'chart-box-outline',
};

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const quickAccessModules = [
    {
      id: 'documents',
      title: 'Documents',
      subtitle: 'SOPs & Instructions',
      icon: moduleIcons.documents,
      color: '#667eea',
      route: '/(drawer)/documents',
      badge: null,
    },
    {
      id: 'self-inspection',
      title: 'Self Inspection',
      subtitle: 'Daily checks',
      icon: moduleIcons.selfInspection,
      color: '#10b981',
      route: '/(drawer)/self-inspection',
      badge: '2 pending',
    },
    {
      id: 'internal-audit',
      title: 'Internal Audit',
      subtitle: 'Monthly audits',
      icon: moduleIcons.internalAudit,
      color: '#f59e0b',
      route: '/(drawer)/internal-audit',
      badge: '1 due',
    },
    {
      id: 'inspection',
      title: 'Inspection',
      subtitle: 'External audits',
      icon: moduleIcons.inspection,
      color: '#764ba2',
      route: '/(drawer)/inspection',
      badge: null,
    },
  ];

  const statsCards = [
    {
      title: 'Compliance Rate',
      value: '94%',
      trend: '+2%',
      color: haccpStyles.audit.completed,
      icon: 'shield-check',
    },
    {
      title: 'Open NCRs',
      value: '3',
      trend: '-1',
      color: haccpStyles.audit.requiresAction,
      icon: 'alert-circle',
    },
    {
      title: 'Audits This Month',
      value: '12',
      trend: '+3',
      color: haccpStyles.audit.inProgress,
      icon: 'clipboard-check',
    },
    {
      title: 'Training Due',
      value: '5',
      trend: '2 this week',
      color: haccpStyles.temperature.caution,
      icon: 'school',
    },
  ];

  const recentActivities = [
    {
      type: 'audit',
      title: 'Kitchen Audit Completed',
      time: '2 hours ago',
      status: 'completed',
      user: 'John Doe',
    },
    {
      type: 'temperature',
      title: 'Temperature Alert - Freezer #3',
      time: '3 hours ago',
      status: 'alert',
      user: 'System',
    },
    {
      type: 'document',
      title: 'SOP Updated - Hand Washing',
      time: '5 hours ago',
      status: 'updated',
      user: 'Jane Smith',
    },
    {
      type: 'training',
      title: 'Food Safety Training Completed',
      time: '1 day ago',
      status: 'completed',
      user: 'Mike Johnson',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Welcome Header */}
        <LinearGradient
          colors={[theme.colors.primaryContainer, theme.colors.surface]}
          style={styles.header}
        >
        <View style={styles.headerContent}>
          <View>
            <Text variant="headlineSmall" style={{ color: theme.colors.onPrimaryContainer }}>
              Welcome back!
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => router.push('/(drawer)/(tabs)/alerts')}
            style={styles.notificationButton}
          />
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statsCards.map((stat, index) => (
            <Surface key={index} style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <View style={styles.statHeader}>
                <MaterialCommunityIcons 
                  name={stat.icon} 
                  size={24} 
                  color={stat.color}
                />
                <Text variant="labelSmall" style={[styles.statTrend, { color: stat.trend.startsWith('+') ? '#10b981' : theme.colors.onSurfaceVariant }]}>
                  {stat.trend}
                </Text>
              </View>
              <Text variant="headlineMedium" style={[styles.statValue, { color: theme.colors.onSurface }]}>
                {stat.value}
              </Text>
              <Text variant="bodySmall" style={[styles.statTitle, { color: theme.colors.onSurfaceVariant }]}>
                {stat.title}
              </Text>
            </Surface>
          ))}
        </ScrollView>
      </View>

      {/* Quick Access Modules */}
      <View style={styles.section}>
        <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Quick Access
        </Text>
        <View style={styles.moduleGrid}>
          {quickAccessModules.map((module) => (
            <TouchableOpacity
              key={module.id}
              style={styles.moduleCard}
              onPress={() => router.push(module.route)}
              activeOpacity={0.7}
            >
              <Surface style={[styles.moduleCardSurface, { backgroundColor: theme.colors.surface }]} elevation={2}>
                <View style={[styles.moduleIconContainer, { backgroundColor: `${module.color}20` }]}>
                  <MaterialCommunityIcons 
                    name={module.icon} 
                    size={32} 
                    color={module.color}
                  />
                  {module.badge && (
                    <Badge style={styles.moduleBadge} size={20}>
                      !
                    </Badge>
                  )}
                </View>
                <Text variant="titleSmall" style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>
                  {module.title}
                </Text>
                <Text variant="bodySmall" style={[styles.moduleSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {module.subtitle}
                </Text>
                {module.badge && (
                  <Chip 
                    mode="flat" 
                    textStyle={{ fontSize: 10 }}
                    style={styles.moduleChip}
                  >
                    {module.badge}
                  </Chip>
                )}
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Today's Progress */}
      <Card style={[styles.progressCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.progressHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Today's Progress</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
              View all
            </Text>
          </View>
          <View style={styles.progressItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Daily Checks</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>8/10 completed</Text>
            <ProgressBar progress={0.8} color={theme.colors.primary} style={styles.progressBar} />
          </View>
          <View style={styles.progressItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Temperature Logs</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>12/15 recorded</Text>
            <ProgressBar progress={0.8} color={haccpStyles.temperature.safe} style={styles.progressBar} />
          </View>
          <View style={styles.progressItem}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>Cleaning Tasks</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>5/5 completed</Text>
            <ProgressBar progress={1} color={haccpStyles.audit.completed} style={styles.progressBar} />
          </View>
        </Card.Content>
      </Card>

      {/* Recent Activity */}
      <Card style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text variant="titleMedium" style={[styles.activityTitle, { color: theme.colors.onSurface }]}>
            Recent Activity
          </Text>
          {recentActivities.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <Avatar.Icon 
                size={40} 
                icon={
                  activity.type === 'audit' ? 'clipboard-check' :
                  activity.type === 'temperature' ? 'thermometer' :
                  activity.type === 'document' ? 'file-document' :
                  'school'
                }
                style={{
                  backgroundColor: 
                    activity.status === 'completed' ? haccpStyles.audit.completed :
                    activity.status === 'alert' ? haccpStyles.audit.failed :
                    haccpStyles.audit.inProgress
                }}
              />
              <View style={styles.activityContent}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>{activity.title}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {activity.user} • {activity.time}
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>

        {/* Bottom Spacing */}
        <View style={{ height: Platform.OS === 'android' ? 20 : 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'android' ? 10 : 0,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationButton: {
    margin: 0,
  },
  statsContainer: {
    marginTop: -15,
    paddingHorizontal: 20,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 140,
    // No hardcoded backgroundColor - apply in component
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTrend: {
    fontSize: 11,
    // Color applied dynamically based on trend direction
  },
  statValue: {
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statTitle: {
    // Use theme colors instead of opacity
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  moduleCard: {
    width: (width - 52) / 2,
    marginHorizontal: 6,
    marginBottom: 12,
  },
  moduleCardSurface: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  moduleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  moduleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
  },
  moduleTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  moduleSubtitle: {
    textAlign: 'center',
    // Use theme colors instead of opacity
    marginBottom: 8,
  },
  moduleChip: {
    marginTop: 4,
    height: 24,
  },
  progressCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
  },
  activityCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
  },
  activityTitle: {
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
});