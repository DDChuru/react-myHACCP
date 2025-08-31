import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
  Divider,
  Avatar,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CrewMemberService from '../services/CrewMemberService';
import { CrewMemberModel, CrewPosition } from '../types/crewMember';
import { useAuthProfile } from '../hooks/useAuthProfile';

interface CrewMemberFormProps {
  onSuccess?: (crewMember: CrewMemberModel) => void;
  onCancel?: () => void;
  initialData?: Partial<CrewMemberModel>;
  editMode?: boolean;
}

export default function CrewMemberForm({
  onSuccess,
  onCancel,
  initialData,
  editMode = false,
}: CrewMemberFormProps) {
  const { userProfile } = useAuthProfile();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Form fields
  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || '');
  const [position, setPosition] = useState<CrewPosition | undefined>(
    initialData?.position
  );
  const [employeeNumber, setEmployeeNumber] = useState(
    initialData?.employeeNumber || ''
  );
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    initialData?.photoUrl
  );
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>(
    initialData?.primarySiteId
  );

  // UI states
  const [emailError, setEmailError] = useState('');
  const [nameError, setNameError] = useState('');

  const positions = CrewMemberService.getAvailablePositions();
  const isSiteAdmin = userProfile?.roles?.siteAdmin === true;
  const isAdmin = userProfile?.roles?.admin === true;

  // Validation
  const validateForm = (): boolean => {
    let isValid = true;

    if (!fullName.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    // Email is optional but validate format if provided
    if (email && !isValidEmail(email)) {
      setEmailError('Invalid email format');
      isValid = false;
    } else {
      setEmailError('');
    }

    return isValid;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Photo handling
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Camera roll permissions are required to select a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Camera permissions are required to take a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const crewMemberData: Partial<CrewMemberModel> = {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        position,
        employeeNumber: employeeNumber.trim() || undefined,
        photoUrl: photoUri || undefined, // Ensure undefined instead of null
        primarySiteId: selectedSiteId,
      };

      if (editMode && initialData?.id) {
        await CrewMemberService.updateCrewMember(initialData.id, crewMemberData);
        setSnackbarMessage('Crew member updated successfully');
      } else {
        const companyName = userProfile?.companyId === '2XTSaqxU41zCTBIVJeXb' 
          ? 'envirowize' 
          : 'company';
        const newCrewMember = await CrewMemberService.createCrewMember(
          crewMemberData,
          companyName
        );
        
        if (onSuccess) {
          onSuccess(newCrewMember);
        }
        
        setSnackbarMessage('Crew member added successfully');
        
        // Reset form for quick consecutive additions
        if (!editMode) {
          resetForm();
        }
      }
      
      setSnackbarVisible(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save crew member. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setPosition(undefined);
    setEmployeeNumber('');
    setPhotoUri(undefined);
    setSelectedSiteId(undefined);
    setEmailError('');
    setNameError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>
              {editMode ? 'Edit Crew Member' : 'Add Crew Member'}
            </Title>
            
            {/* Photo Section */}
            <View style={styles.photoSection}>
              <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <Avatar.Icon
                    size={100}
                    icon="account"
                    style={styles.photoPlaceholder}
                  />
                )}
              </TouchableOpacity>
              <View style={styles.photoButtons}>
                <Button
                  mode="outlined"
                  onPress={pickImage}
                  icon="image"
                  compact
                  style={styles.photoButton}
                >
                  Gallery
                </Button>
                <Button
                  mode="outlined"
                  onPress={takePhoto}
                  icon="camera"
                  compact
                  style={styles.photoButton}
                >
                  Camera
                </Button>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Required Fields */}
            <Paragraph style={styles.sectionTitle}>Required Information</Paragraph>
            
            <TextInput
              label="Full Name *"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              error={!!nameError}
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
            />
            <HelperText type="error" visible={!!nameError}>
              {nameError}
            </HelperText>

            {/* Optional but High Priority Fields */}
            <Paragraph style={styles.sectionTitle}>Contact Information</Paragraph>
            
            <TextInput
              label="Email (optional)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              error={!!emailError}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              left={<TextInput.Icon icon="email" />}
            />
            <HelperText type="error" visible={!!emailError}>
              {emailError}
            </HelperText>
            {!email && (
              <HelperText type="info" visible={!email}>
                If not provided, will be auto-generated
              </HelperText>
            )}

            <TextInput
              label="Phone Number (optional)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
              left={<TextInput.Icon icon="phone" />}
            />

            {/* Position Selection */}
            <Paragraph style={styles.sectionTitle}>Position</Paragraph>
            <View style={styles.positionContainer}>
              {positions.map((pos) => (
                <Button
                  key={pos}
                  mode={position === pos ? 'contained' : 'outlined'}
                  onPress={() => setPosition(pos)}
                  style={styles.positionButton}
                  compact
                >
                  {pos}
                </Button>
              ))}
            </View>
            {position && (
              <Button
                mode="text"
                onPress={() => setPosition(undefined)}
                style={styles.clearButton}
              >
                Clear Position
              </Button>
            )}

            {/* Additional Fields (collapsed on mobile for speed) */}
            <Paragraph style={styles.sectionTitle}>Additional Information</Paragraph>
            
            <TextInput
              label="Employee Number (optional)"
              value={employeeNumber}
              onChangeText={setEmployeeNumber}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="identifier" />}
            />

            {/* Site Selection for Admin */}
            {isAdmin && !isSiteAdmin && (
              <TextInput
                label="Site Assignment (optional)"
                value={selectedSiteId || ''}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="map-marker" />}
                placeholder="Leave empty for all sites"
              />
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {onCancel && (
                <Button
                  mode="outlined"
                  onPress={onCancel}
                  style={styles.button}
                  disabled={loading}
                >
                  Cancel
                </Button>
              )}
              <Button
                mode="contained"
                onPress={handleSubmit}
                style={styles.button}
                loading={loading}
                disabled={loading}
                icon={editMode ? 'content-save' : 'plus'}
              >
                {editMode ? 'Save Changes' : 'Add Crew Member'}
              </Button>
            </View>

            {!editMode && (
              <HelperText type="info" style={styles.quickAddHint}>
                Quick add: Only name is required. Other fields can be added later.
              </HelperText>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoContainer: {
    marginBottom: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    backgroundColor: '#e0e0e0',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    marginHorizontal: 4,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
    color: '#666',
  },
  input: {
    marginBottom: 8,
  },
  menuAnchor: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  quickAddHint: {
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  positionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  positionButton: {
    marginBottom: 8,
  },
  clearButton: {
    marginTop: -8,
    marginBottom: 8,
  },
});