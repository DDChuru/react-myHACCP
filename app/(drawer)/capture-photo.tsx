/**
 * Photo Capture Screen for iClean Verification
 * Allows users to capture photos with annotations for verification evidence
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  IconButton,
  TextInput,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { iCleanVerificationService } from '../../services/iCleanVerificationService';

export default function CapturePhotoScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuth();
  
  const itemId = params.itemId as string;
  const itemName = params.itemName as string;
  const areaId = params.areaId as string; // Need to pass this from area-verification
  
  // State management
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // High contrast colors
  const colors = {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    cardBg: '#333333',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#424242',
    primary: theme.colors.primary,
    success: '#4caf50',
    error: '#f44336',
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        setHasPermission(cameraStatus === 'granted' && mediaStatus === 'granted');
      } else {
        setHasPermission(true); // Web doesn't need explicit permissions
      }
    })();
  }, []);

  const takePhoto = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const selectFromGallery = async () => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Gallery permission is required to select photos');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const savePhoto = async () => {
    if (!photo) {
      Alert.alert('No Photo', 'Please capture or select a photo first');
      return;
    }

    if (!areaId) {
      console.error('No areaId provided to save photo');
      Alert.alert('Error', 'Missing area information');
      return;
    }

    setLoading(true);
    try {
      // Initialize verification service if needed
      const verificationService = await iCleanVerificationService.initialize(
        user?.uid || '',
        profile?.companyId || ''
      );
      
      // Add photo to the verification item
      await verificationService.addPhotoToItem(areaId, itemId, photo, notes);
      
      // TODO: Upload to Firebase Storage when online
      // For now, just saved locally with the item
      
      // Navigate back to area-verification screen
      router.back();
      
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo');
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    setNotes('');
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: colors.surface }]} elevation={2}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={colors.text}
          onPress={() => router.back()}
        />
        <View style={styles.headerText}>
          <Text variant="titleLarge" style={{ color: colors.text }}>
            Capture Photo
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
            {itemName}
          </Text>
        </View>
      </Surface>

      {/* Content */}
      <View style={styles.content}>
        {!photo ? (
          <View style={styles.captureSection}>
            <Surface style={[styles.cameraPlaceholder, { backgroundColor: colors.cardBg }]} elevation={1}>
              <MaterialCommunityIcons name="camera-off" size={64} color={colors.textSecondary} />
              <Text variant="titleMedium" style={{ color: colors.text, marginTop: 16 }}>
                No Photo Captured
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                Take a photo or select from gallery to provide verification evidence
              </Text>
            </Surface>

            <View style={styles.captureButtons}>
              <Button
                mode="contained"
                icon="camera"
                onPress={takePhoto}
                style={[styles.button, { backgroundColor: colors.primary }]}
                disabled={!hasPermission}
              >
                Take Photo
              </Button>
              <Button
                mode="outlined"
                icon="image"
                onPress={selectFromGallery}
                style={styles.button}
                textColor={colors.text}
                disabled={!hasPermission}
              >
                Select from Gallery
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.reviewSection}>
            <Surface style={[styles.photoContainer, { backgroundColor: colors.cardBg }]} elevation={2}>
              <Image source={{ uri: photo }} style={styles.photo} />
              
              {/* Annotation overlay placeholder */}
              <View style={styles.annotationOverlay}>
                <View style={[styles.annotationInfo, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                  <Text variant="labelSmall" style={{ color: '#fff' }}>
                    {new Date().toLocaleString()}
                  </Text>
                  <Text variant="labelSmall" style={{ color: '#fff' }}>
                    {user?.email || 'Unknown User'}
                  </Text>
                  <Text variant="labelSmall" style={{ color: '#fff' }}>
                    {itemName}
                  </Text>
                </View>
              </View>
            </Surface>

            <Surface style={[styles.notesContainer, { backgroundColor: colors.surface }]} elevation={1}>
              <Text variant="titleSmall" style={{ color: colors.text, marginBottom: 8 }}>
                Add Notes (Optional)
              </Text>
              <TextInput
                mode="outlined"
                placeholder="Enter any additional notes..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: colors.cardBg }}
                textColor={colors.text}
                placeholderTextColor={colors.textSecondary}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
            </Surface>

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                icon="camera-retake"
                onPress={retakePhoto}
                style={styles.button}
                textColor={colors.text}
              >
                Retake
              </Button>
              <Button
                mode="contained"
                icon="check"
                onPress={savePhoto}
                style={[styles.button, { backgroundColor: colors.success }]}
                loading={loading}
                disabled={loading}
              >
                Save Photo
              </Button>
            </View>
          </View>
        )}

        {/* Info Section */}
        <Surface style={[styles.infoSection, { backgroundColor: colors.surface }]} elevation={1}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
            <Text variant="bodyMedium" style={{ color: colors.text, marginLeft: 8 }}>
              Photo Guidelines
            </Text>
          </View>
          <View style={styles.guidelinesList}>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              • Ensure the area is well-lit
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              • Capture the entire item or area
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              • Show clear evidence of cleanliness
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              • Avoid blurry or out-of-focus images
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
              • Include context when possible
            </Text>
          </View>
        </Surface>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingRight: 16,
  },
  headerText: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  captureSection: {
    marginBottom: 24,
  },
  cameraPlaceholder: {
    height: 250,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  captureButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewSection: {
    marginBottom: 24,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  annotationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  annotationInfo: {
    padding: 8,
  },
  notesContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  infoSection: {
    padding: 16,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  guidelinesList: {
    marginLeft: 28,
    gap: 4,
  },
});