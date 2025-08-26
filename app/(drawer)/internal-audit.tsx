import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Surface, Text, Card, FAB, useTheme, DataTable, Chip, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function InternalAuditScreen() {
  const theme = useTheme();

  const audits = [
    {
      id: '1',
      title: 'Monthly HACCP Audit',
      department: 'Kitchen Operations',
      dueDate: '2025-08-30',
      status: 'scheduled',
      auditor: 'John Smith',
      score: null,
    },
    {
      id: '2',
      title: 'Supplier Verification Audit',
      department: 'Procurement',
      dueDate: '2025-08-25',
      status: 'in-progress',
      auditor: 'Jane Doe',
      score: null,
    },
    {
      id: '3',
      title: 'Food Safety Audit',
      department: 'All Areas',
      dueDate: '2025-08-15',
      status: 'completed',
      auditor: 'Mike Johnson',
      score: 92,
    },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'completed': return theme.colors.success;
      case 'in-progress': return theme.colors.warning;
      case 'scheduled': return theme.colors.info;
      default: return theme.colors.onSurface;
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <Surface style={styles.header} elevation={1}>
          <Text variant="headlineSmall">Internal Audits</Text>
          <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
            Manage and track internal audit processes
          </Text>
        </Surface>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="clipboard-check" size={24} color={theme.colors.primary} />
              <Text variant="headlineMedium">3</Text>
              <Text variant="bodySmall">This Month</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="chart-line" size={24} color={theme.colors.success} />
              <Text variant="headlineMedium">89%</Text>
              <Text variant="bodySmall">Avg Score</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="alert-circle" size={24} color={theme.colors.warning} />
              <Text variant="headlineMedium">2</Text>
              <Text variant="bodySmall">Pending</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.content}>
          {audits.map((audit) => (
            <Card key={audit.id} style={styles.auditCard}>
              <Card.Content>
                <View style={styles.auditHeader}>
                  <Avatar.Text 
                    size={40} 
                    label={audit.auditor.split(' ').map(n => n[0]).join('')}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  />
                  <View style={styles.auditInfo}>
                    <Text variant="titleMedium">{audit.title}</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                      {audit.department} • {audit.auditor}
                    </Text>
                  </View>
                </View>

                <View style={styles.auditDetails}>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodySmall" style={{ marginLeft: 4 }}>
                      Due: {audit.dueDate}
                    </Text>
                  </View>
                  
                  <Chip 
                    mode="flat" 
                    textStyle={{ fontSize: 11 }}
                    style={{ 
                      backgroundColor: `${getStatusColor(audit.status)}20`,
                    }}
                  >
                    {audit.status}
                  </Chip>
                  
                  {audit.score && (
                    <View style={styles.scoreContainer}>
                      <Text variant="titleMedium" style={{ color: theme.colors.success }}>
                        {audit.score}%
                      </Text>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
        label="Schedule Audit"
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 0,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  content: {
    padding: 16,
  },
  auditCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  auditInfo: {
    flex: 1,
    marginLeft: 12,
  },
  auditDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    marginLeft: 'auto',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});