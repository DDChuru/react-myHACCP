import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';

export default function TemperatureScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Temperature Monitoring</Text>
        <Text variant="bodyMedium">Track and log temperature readings</Text>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff' },
});