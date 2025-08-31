import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Surface, Text, Avatar, List, Button, useTheme, Card } from 'react-native-paper';
import { useAuth } from '../../../hooks/useAuth';
import { auth } from '../../../firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { checkForAppUpdates, getUpdateInfo } from '../../../utils/checkForUpdates';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Avatar.Text size={80} label={user?.email?.substring(0, 2).toUpperCase() || 'U'} />
        <Text variant="headlineSmall" style={styles.userName}>{user?.email || 'Guest User'}</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>HACCP Manager</Text>
      </Surface>

      <Card style={styles.statsCard}>
        <Card.Content style={styles.statsContent}>
          <View style={styles.statItem}>
            <Text variant="headlineMedium">28</Text>
            <Text variant="bodySmall">Audits</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium">96%</Text>
            <Text variant="bodySmall">Compliance</Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="headlineMedium">142</Text>
            <Text variant="bodySmall">Tasks</Text>
          </View>
        </Card.Content>
      </Card>

      <List.Section>
        <List.Item
          title="Edit Profile"
          left={() => <List.Icon icon="account-edit" />}
          onPress={() => {}}
        />
        <List.Item
          title="Certifications"
          left={() => <List.Icon icon="certificate" />}
          onPress={() => {}}
        />
        <List.Item
          title="Training History"
          left={() => <List.Icon icon="school" />}
          onPress={() => {}}
        />
        <List.Item
          title="Settings"
          left={() => <List.Icon icon="cog" />}
          onPress={() => {}}
        />
        <List.Item
          title="Check for Updates"
          description={(() => {
            const info = getUpdateInfo();
            return `Channel: ${info.channel} | Version: ${info.runtimeVersion}`;
          })()}
          left={() => <List.Icon icon="cloud-download" />}
          onPress={() => checkForAppUpdates(true)}
        />
      </List.Section>

      <View style={styles.logoutContainer}>
        <Button mode="contained" onPress={handleLogout} style={styles.logoutButton}>
          Logout
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 30, alignItems: 'center', backgroundColor: '#fff' },
  userName: { marginTop: 16, fontWeight: 'bold' },
  statsCard: { margin: 16, borderRadius: 12 },
  statsContent: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 },
  statItem: { alignItems: 'center' },
  logoutContainer: { padding: 20 },
  logoutButton: { borderRadius: 8 },
});