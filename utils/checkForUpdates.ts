import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

export async function checkForAppUpdates(showAlert: boolean = true) {
  if (!Updates.isEnabled) {
    if (showAlert) {
      Alert.alert('Updates Disabled', 'Updates are not enabled in this build');
    }
    return false;
  }

  try {
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      if (showAlert) {
        Alert.alert(
          'Update Available',
          'A new update is available. Would you like to download and apply it?',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update Now',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Update Downloaded',
                    'The app will now reload to apply the update.',
                    [
                      {
                        text: 'OK',
                        onPress: () => Updates.reloadAsync()
                      }
                    ]
                  );
                } catch (error) {
                  Alert.alert('Update Failed', `Error: ${error}`);
                }
              }
            }
          ]
        );
      } else {
        // Silent update
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
      return true;
    } else {
      if (showAlert) {
        Alert.alert('No Updates', 'Your app is up to date!');
      }
      return false;
    }
  } catch (error) {
    console.error('Error checking for updates:', error);
    if (showAlert) {
      Alert.alert('Update Check Failed', `Error: ${error}`);
    }
    return false;
  }
}

export function getUpdateInfo() {
  return {
    isEnabled: Updates.isEnabled,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    updateId: Updates.updateId,
    createdAt: Updates.createdAt,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
  };
}