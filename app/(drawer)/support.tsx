import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Surface, Text, List } from 'react-native-paper';

export default function SupportScreen() {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Help & Support</Text>
      </Surface>
      <List.Section>
        <List.Item title="User Guide" left={() => <List.Icon icon="book-open" />} />
        <List.Item title="FAQs" left={() => <List.Icon icon="help-circle" />} />
        <List.Item title="Contact Support" left={() => <List.Icon icon="email" />} />
      </List.Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: '#fff' },
});