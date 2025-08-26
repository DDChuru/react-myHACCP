import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';

export default function TrainingScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Training Records</Text>
        <Text variant="bodyMedium">Manage staff training and certifications</Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff' },
});