import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Surface, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function QuickCheckScreen() {
  const theme = useTheme();

  const quickActions = [
    { icon: 'thermometer', label: 'Temperature Log', color: '#3b82f6' },
    { icon: 'broom', label: 'Cleaning Check', color: '#10b981' },
    { icon: 'truck', label: 'Delivery Check', color: '#f59e0b' },
    { icon: 'alert', label: 'Report Issue', color: '#ef4444' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Quick Actions</Text>
        <Text variant="bodyMedium">Fast access to common tasks</Text>
      </Surface>
      
      <View style={styles.grid}>
        {quickActions.map((action, index) => (
          <Surface key={index} style={styles.actionCard} elevation={2}>
            <MaterialCommunityIcons name={action.icon} size={48} color={action.color} />
            <Text variant="labelLarge" style={styles.actionLabel}>{action.label}</Text>
          </Surface>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16 },
  actionCard: {
    width: '47%',
    margin: '1.5%',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionLabel: { marginTop: 12, textAlign: 'center' },
});