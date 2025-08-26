// Minimal test app to verify React Native setup
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { PaperProvider, Card, Button } from 'react-native-paper';

export default function TestApp() {
  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Title title="HACCP App Test" />
            <Card.Content>
              <Text>If you can see this, React Native is working!</Text>
              <Text style={styles.success}>✓ React Native components OK</Text>
              <Text style={styles.success}>✓ React Native Paper OK</Text>
              <Text style={styles.success}>✓ No HTML elements issue</Text>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => console.log('Test')}>
                Test Button
              </Button>
            </Card.Actions>
          </Card>
        </View>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    elevation: 4,
  },
  success: {
    color: 'green',
    marginTop: 10,
  },
});