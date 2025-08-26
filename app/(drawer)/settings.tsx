import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Surface, Text, List } from 'react-native-paper';

export default function SettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Settings</Text>
      </Surface>
      <List.Section>
        <List.Item title="Notifications" left={() => <List.Icon icon="bell" />} />
        <List.Item title="Privacy" left={() => <List.Icon icon="lock" />} />
        <List.Item title="About" left={() => <List.Icon icon="information" />} />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff' },
});