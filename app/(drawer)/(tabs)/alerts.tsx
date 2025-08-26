import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Surface, Text, Card, Avatar, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AlertsScreen() {
  const theme = useTheme();

  const alerts = [
    {
      id: '1',
      type: 'critical',
      title: 'Temperature Excursion',
      message: 'Freezer Unit 3 exceeded safe temperature range',
      time: '2 hours ago',
      icon: 'thermometer-alert',
      color: theme.colors.error,
    },
    {
      id: '2',
      type: 'warning',
      title: 'Audit Due Soon',
      message: 'Monthly kitchen audit due in 2 days',
      time: '5 hours ago',
      icon: 'clipboard-alert',
      color: theme.colors.warning,
    },
    {
      id: '3',
      type: 'info',
      title: 'Document Updated',
      message: 'Hand washing SOP has been revised',
      time: '1 day ago',
      icon: 'file-document-edit',
      color: theme.colors.info,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {alerts.map((alert) => (
        <Card key={alert.id} style={styles.alertCard}>
          <Card.Content style={styles.alertContent}>
            <Avatar.Icon 
              size={48} 
              icon={alert.icon}
              style={{ backgroundColor: `${alert.color}20` }}
              color={alert.color}
            />
            <View style={styles.alertInfo}>
              <Text variant="titleMedium">{alert.title}</Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>{alert.message}</Text>
              <Text variant="labelSmall" style={{ opacity: 0.5, marginTop: 4 }}>{alert.time}</Text>
            </View>
            <IconButton icon="close" size={20} onPress={() => {}} />
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  alertCard: { marginBottom: 12, borderRadius: 12 },
  alertContent: { flexDirection: 'row', alignItems: 'center' },
  alertInfo: { flex: 1, marginLeft: 12 },
});