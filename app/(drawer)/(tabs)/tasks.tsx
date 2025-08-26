import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Surface, Text, Card, Chip, Avatar, useTheme, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TasksScreen() {
  const theme = useTheme();

  const tasks = [
    { id: '1', title: 'Morning Temperature Check', priority: 'high', due: '8:00 AM', status: 'overdue' },
    { id: '2', title: 'Kitchen Deep Clean', priority: 'medium', due: '10:00 AM', status: 'pending' },
    { id: '3', title: 'Supplier Document Review', priority: 'low', due: '2:00 PM', status: 'pending' },
    { id: '4', title: 'Equipment Calibration', priority: 'high', due: '4:00 PM', status: 'pending' },
  ];

  return (
    <>
      <ScrollView style={styles.container}>
        {tasks.map((task) => (
          <Card key={task.id} style={styles.taskCard}>
            <Card.Content style={styles.taskContent}>
              <Avatar.Icon 
                size={40} 
                icon="checkbox-marked-circle-outline"
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
              <View style={styles.taskInfo}>
                <Text variant="titleMedium">{task.title}</Text>
                <View style={styles.taskMeta}>
                  <Chip mode="flat" textStyle={{ fontSize: 10 }} style={styles.priorityChip}>
                    {task.priority}
                  </Chip>
                  <Text variant="bodySmall">Due: {task.due}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
      <FAB icon="plus" style={styles.fab} onPress={() => {}} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  taskCard: { marginBottom: 12, borderRadius: 12 },
  taskContent: { flexDirection: 'row', alignItems: 'center' },
  taskInfo: { flex: 1, marginLeft: 12 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  priorityChip: { height: 24 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});