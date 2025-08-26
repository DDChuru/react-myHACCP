import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';

export default function ReportsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Reports & Analytics</Text>
        <Text variant="bodyMedium">View compliance reports and trends</Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff' },
});