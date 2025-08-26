import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Surface, Text, Card, FAB, useTheme, List, Chip, Avatar, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InspectionScreen() {
  const theme = useTheme();

  const inspections = [
    {
      id: '1',
      title: 'FDA Inspection',
      inspector: 'External - FDA',
      date: '2025-09-15',
      status: 'upcoming',
      type: 'regulatory',
      lastScore: 95,
    },
    {
      id: '2',
      title: 'Customer Audit - ABC Corp',
      inspector: 'External - Customer',
      date: '2025-08-28',
      status: 'scheduled',
      type: 'customer',
      lastScore: 88,
    },
    {
      id: '3',
      title: 'Third-Party Certification',
      inspector: 'SGS Auditor',
      date: '2025-08-10',
      status: 'completed',
      type: 'certification',
      lastScore: 91,
    },
  ];

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'regulatory': return theme.colors.error;
      case 'customer': return theme.colors.primary;
      case 'certification': return theme.colors.tertiary;
      default: return theme.colors.onSurface;
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Surface style={styles.header} elevation={1}>
          <Text variant="headlineSmall">External Inspections</Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            Manage external audits and regulatory inspections
          </Text>
        </Surface>

        {/* Upcoming Alert */}
        <Card style={[styles.alertCard, { backgroundColor: theme.colors.warningContainer }]}>
          <Card.Content style={styles.alertContent}>
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={24} 
              color={theme.colors.onWarningContainer} 
            />
            <View style={styles.alertText}>
              <Text variant="titleMedium" style={{ color: theme.colors.onWarningContainer }}>
                Upcoming FDA Inspection
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onWarningContainer, opacity: 0.8 }}>
                Scheduled for September 15, 2025 - 24 days remaining
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.content}>
          {inspections.map((inspection) => (
            <Card key={inspection.id} style={styles.inspectionCard}>
              <Card.Content>
                <View style={styles.inspectionHeader}>
                  <Avatar.Icon 
                    size={48} 
                    icon="magnify-scan" 
                    style={{ backgroundColor: `${getTypeColor(inspection.type)}20` }}
                    color={getTypeColor(inspection.type)}
                  />
                  <View style={styles.inspectionInfo}>
                    <Text variant="titleMedium">{inspection.title}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                      {inspection.inspector}
                    </Text>
                    <View style={styles.chipRow}>
                      <Chip 
                        mode="flat" 
                        textStyle={{ fontSize: 10 }}
                        style={[styles.typeChip, { backgroundColor: `${getTypeColor(inspection.type)}20` }]}
                      >
                        {inspection.type}
                      </Chip>
                      <Chip 
                        mode="flat" 
                        textStyle={{ fontSize: 10 }}
                        style={styles.statusChip}
                      >
                        {inspection.status}
                      </Chip>
                    </View>
                  </View>
                  {inspection.lastScore && (
                    <View style={styles.scoreContainer}>
                      <Text variant="bodySmall" style={{ opacity: 0.7 }}>Last Score</Text>
                      <Text variant="headlineSmall" style={{ 
                        color: inspection.lastScore >= 90 ? theme.colors.success : theme.colors.warning 
                      }}>
                        {inspection.lastScore}%
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.dateContainer}>
                  <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ marginLeft: 4, opacity: 0.7 }}>
                    {inspection.date}
                  </Text>
                </View>

                {inspection.status === 'upcoming' && (
                  <View style={styles.preparationSection}>
                    <Text variant="labelMedium">Preparation Progress</Text>
                    <ProgressBar progress={0.7} color={theme.colors.primary} style={styles.progressBar} />
                    <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
                      70% ready - Review remaining checklist items
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Preparation Checklist */}
        <Card style={styles.checklistCard}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12 }}>
              Inspection Preparation Checklist
            </Text>
            <List.Item
              title="Document Review"
              description="Ensure all SOPs are up to date"
              left={() => <List.Icon icon="checkbox-marked-circle" color={theme.colors.success} />}
            />
            <List.Item
              title="Training Records"
              description="Verify all staff certifications"
              left={() => <List.Icon icon="checkbox-marked-circle" color={theme.colors.success} />}
            />
            <List.Item
              title="Equipment Calibration"
              description="Check calibration certificates"
              left={() => <List.Icon icon="checkbox-blank-circle-outline" />}
            />
            <List.Item
              title="Mock Inspection"
              description="Conduct internal walkthrough"
              left={() => <List.Icon icon="checkbox-blank-circle-outline" />}
            />
          </Card.Content>
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB
        icon="calendar-plus"
        style={styles.fab}
        onPress={() => {}}
        label="Schedule"
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
    backgroundColor: '#fff',
  },
  alertCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    marginLeft: 12,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  inspectionCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inspectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  typeChip: {
    height: 24,
  },
  statusChip: {
    height: 24,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  preparationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  progressBar: {
    marginTop: 8,
    height: 6,
    borderRadius: 3,
  },
  checklistCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});