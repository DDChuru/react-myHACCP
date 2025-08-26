import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { 
  Surface, 
  Text, 
  Card, 
  Button, 
  useTheme,
  TextInput,
  Menu,
  Divider,
  Chip,
  ActivityIndicator,
  IconButton,
  List,
  Snackbar,
  ProgressBar
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, storage } from '../../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../../hooks/useAuth';
import { useNotifications } from '../../../hooks/useNotifications';
import { useSync } from '../../../hooks/useSync';
import { useOffline } from '../../../hooks/useOffline';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import ImageAnnotator from '../../../components/ImageAnnotator';
import AreaPicker from '../../../components/AreaPicker';
import { addIssueToInspection } from '../../../services/selfInspectionService';
import { imageUploadQueue } from '../../../services/imageUploadQueue';

interface NCRCategory {
  id: string;
  name: string;
  description?: string;
}

interface NCRSeverity {
  id: string;
  name: string;
  level: number;
  color?: string;
}

interface UserProfile {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  imageUrl?: string;
  legacyId?: number;
  regionId?: string;
  roles?: {
    admin?: boolean;
    hr?: boolean;
    operations?: boolean;
    superAdmin?: boolean;
  };
}

interface IssueImage {
  uri: string;
  annotations: any[];
  type: 'before' | 'after';
  uploadedAt: Date;
}

export default function AddIssueScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { scheduleIssueNotifications } = useNotifications();
  const { syncCollection, syncing } = useSync();
  const { isOffline } = useOffline();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  
  // Form fields
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NCRCategory | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<NCRSeverity | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [proposedDate, setProposedDate] = useState(new Date());
  const [images, setImages] = useState<IssueImage[]>([]);
  
  // Dropdowns
  const [categories, setCategories] = useState<NCRCategory[]>([]);
  const [severities, setSeverities] = useState<NCRSeverity[]>([]);
  
  // Users data
  const [siteUsers, setSiteUsers] = useState<UserProfile[]>([]);
  
  // UI state
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showSeverityMenu, setShowSeverityMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<IssueImage | null>(null);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [issuesSavedCount, setIssuesSavedCount] = useState(0);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // Area selection
  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [availableAreas, setAvailableAreas] = useState<any[]>([]);
  
  // Parse params (now we get inspection ID and site info)
  const inspectionId = params.inspectionId as string;
  const siteId = params.siteId as string || 'default-site';
  const siteName = params.siteName as string || 'Main Site';
  const captureBeforeAfter = params.captureBeforeAfter === 'true';
  
  const companyId = '2XTSaqxU41zCTBIVJeXb'; // Envirowize
  
  // Debug logging
  console.log('Add Issue Screen Params:', {
    inspectionId,
    siteId,
    siteName,
    companyId
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async (skipSync = false) => {
    try {
      setLoading(true);
      
      // Optionally sync collections first in dev mode
      if (__DEV__ && !skipSync) {
        console.log('Dev mode: Syncing NCR and user data...');
        await Promise.all([
          syncCollection('ncrcategories'),  // lowercase for consistency
          syncCollection('ncrSeverity'),
          syncCollection('userProfile')
        ]);
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 2000);
      }
      
      // Load NCR categories
      // Using lowercase 'ncrcategories' for consistency across all CSC
      const categoriesSnapshot = await getDocs(
        collection(db, `companies/${companyId}/ncrcategories`)
      );
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NCRCategory));
      setCategories(categoriesData);
      
      // Load NCR severities
      // Note: Legacy naming issue - collection is 'ncrSeverity' (singular)
      const severitiesSnapshot = await getDocs(
        collection(db, `companies/${companyId}/ncrSeverity`)
      );
      const severitiesData = severitiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as NCRSeverity)).sort((a, b) => (b.level || 0) - (a.level || 0));
      setSeverities(severitiesData);
      
      // Load users from userProfile collection
      const usersQuery = query(
        collection(db, 'userProfile'),
        where('companyId', '==', companyId)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserProfile));
      setSiteUsers(usersData);
      
      console.log('Loaded users with fullName:', usersData.map(u => ({ 
        id: u.id, 
        fullName: u.fullName, 
        email: u.email 
      })));
      
      // Load areas for this site
      const areasQuery = query(
        collection(db, `companies/${companyId}/siteAreas`),
        where('siteId', '==', siteId)
      );
      
      const areasSnapshot = await getDocs(areasQuery);
      const areasData = areasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAvailableAreas(areasData);
      
      console.log(`Loaded ${usersData.length} users and ${areasData.length} areas`);
      
    } catch (error) {
      console.error('Error loading form data:', error);
      Alert.alert('Error', 'Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = async (type: 'camera' | 'gallery') => {
    const permissionResult = type === 'camera' 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission required', `Please grant ${type} permission to continue`);
      return;
    }

    const result = type === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          allowsMultipleSelection: true,
          selectionLimit: 5 - images.length,
        });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        annotations: [],
        type: 'before' as const,
        uploadedAt: new Date()
      }));
      
      if (images.length + newImages.length > 5) {
        Alert.alert('Limit reached', 'Maximum 5 images allowed per issue');
        return;
      }
      
      setImages([...images, ...newImages]);
    }
  };

  const handleAnnotateImage = (image: IssueImage) => {
    setAnnotatingImage(image);
  };

  const handleSaveAnnotations = (annotatedUri: string, annotations: any[]) => {
    setImages(images.map(img => 
      img === annotatingImage 
        ? { ...img, uri: annotatedUri, annotations }
        : img
    ));
    setAnnotatingImage(null);
  };

  const handleRemoveImage = (index: number) => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => setImages(images.filter((_, i) => i !== index))
        }
      ]
    );
  };

  const uploadImageToStorage = async (imageUri: string, imageName: string): Promise<string> => {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Create a reference to the storage location
      // Path: companies/{companyId}/inspections/{inspectionId}/issues/{timestamp}_{imageName}
      const storageRef = ref(
        storage, 
        `companies/${companyId}/inspections/${inspectionId}/issues/${Date.now()}_${imageName}`
      );
      
      // Upload the image
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image to Firebase Storage:', error);
      throw error;
    }
  };

  const handleSaveIssue = async () => {
    // Validation
    if (!selectedArea) {
      Alert.alert('Validation Error', 'Please select an area for this issue');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (!selectedSeverity) {
      Alert.alert('Validation Error', 'Please select a severity');
      return;
    }
    if (!selectedUser) {
      Alert.alert('Validation Error', 'Please select a responsible person');
      return;
    }

    try {
      setSaving(true);
      
      // Handle images based on connectivity
      const uploadedImages = [];
      if (images.length > 0) {
        if (isOffline) {
          // When offline, store local URIs for later upload
          console.log('📱 Offline mode: Storing local image URIs');
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            uploadedImages.push({
              url: null, // No URL yet
              localUri: img.uri, // Keep local URI for later upload
              annotations: img.annotations,
              type: img.type,
              uploadedAt: img.uploadedAt,
              pendingUpload: true, // Flag for pending upload
              uploadName: `image_${i + 1}.jpg`
            });
          }
        } else {
          // When online, upload to Firebase Storage
          setUploadingImages(true);
          setUploadProgress(0);
          
          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            try {
              // Update progress
              setUploadProgress(Math.round(((i + 1) / images.length) * 100));
              
              const downloadURL = await uploadImageToStorage(
                img.uri, 
                `image_${i + 1}.jpg`
              );
              uploadedImages.push({
                url: downloadURL,
                localUri: img.uri, // Keep local URI for reference
                annotations: img.annotations,
                type: img.type,
                uploadedAt: img.uploadedAt,
                pendingUpload: false
              });
            } catch (uploadError) {
              console.error(`Failed to upload image ${i + 1}:`, uploadError);
              // If upload fails, save with local URI for later
              uploadedImages.push({
                url: null,
                localUri: img.uri,
                annotations: img.annotations,
                type: img.type,
                uploadedAt: img.uploadedAt,
                pendingUpload: true,
                uploadName: `image_${i + 1}.jpg`
              });
            }
          }
          
          setUploadingImages(false);
          setUploadProgress(0);
        }
      }
      
      // Create issue object with unique ID
      const issue = {
        id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        areaId: selectedArea.id,
        areaName: selectedArea.name,
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        severity: selectedSeverity.name,
        severityId: selectedSeverity.id,
        severityLevel: selectedSeverity.level,
        description,
        images: uploadedImages, // Use uploaded image URLs
        proposedActionDate: proposedDate,
        responsibleUserId: selectedUser.id,
        responsibleUserName: selectedUser.fullName || selectedUser.email, // Use fullName primarily
        responsibleUserFullName: selectedUser.fullName, // Always include fullName
        status: 'pending',
        createdBy: user?.uid,
        createdByName: user?.displayName || user?.email,
        createdAt: new Date(),
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: null
      };
      
      // Persist issue to Firestore immediately
      await addIssueToInspection(inspectionId, issue, companyId);
      console.log('✅ Issue persisted to inspection:', inspectionId);
      
      // If offline and have images with local URIs, queue them for upload
      if (isOffline && images.length > 0) {
        for (let i = 0; i < uploadedImages.length; i++) {
          const img = uploadedImages[i];
          if (img.pendingUpload && img.localUri) {
            await imageUploadQueue.queueImageUpload({
              localUri: img.localUri,
              inspectionId: inspectionId,
              issueId: issue.id,
              imageIndex: i,
              companyId: companyId,
              annotations: img.annotations,
              uploadName: img.uploadName || `image_${i + 1}.jpg`
            });
          }
        }
        console.log(`📤 Queued ${images.length} images for later upload`);
      }
      
      // Schedule notifications for the responsible person
      await scheduleIssueNotifications(issue);
      
      // Update issue count
      setIssuesSavedCount(issuesSavedCount + 1);
      setShowSuccessSnackbar(true);
      setTimeout(() => setShowSuccessSnackbar(false), 3000);
      
      Alert.alert(
        isOffline ? 'Issue Saved Locally' : 'Issue Saved Successfully',
        `Issue #${issuesSavedCount + 1} has been ${isOffline ? 'saved locally and will sync when online' : 'saved'} for ${selectedArea?.name || 'the selected area'}.\n\nWhat would you like to do next?`,
        [
          {
            text: 'Add Another Issue',
            onPress: () => {
              // Reset form but keep area selection
              setDescription('');
              setSelectedCategory(null);
              setSelectedSeverity(null);
              setSelectedUser(null);
              setProposedDate(new Date());
              setImages([]);
              // Keep selectedArea to make it easier to add another issue in same area
            }
          },
          {
            text: 'Inspect Another Area',
            onPress: () => {
              // Navigate directly back to conduct screen
              router.push({
                pathname: '/(drawer)/self-inspection/conduct',
                params: {
                  inspectionId: inspectionId,
                  companyId: companyId,
                  siteId: siteId,
                  site: siteName
                }
              });
            },
            style: 'cancel'
          }
        ],
        { cancelable: false }
      );
      
    } catch (error) {
      console.error('Error saving issue:', error);
      Alert.alert('Error', 'Failed to save issue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  if (annotatingImage) {
    return (
      <ImageAnnotator
        imageUri={annotatingImage.uri}
        initialAnnotations={annotatingImage.annotations}
        onSave={handleSaveAnnotations}
        onCancel={() => setAnnotatingImage(null)}
      />
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={syncing || loading}
          onRefresh={() => loadFormData(false)}
          colors={theme.colors?.primary ? [String(theme.colors.primary)] : ['#6200ee']}
          tintColor={theme.colors?.primary ? String(theme.colors.primary) : '#6200ee'}
        />
      }
    >
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>Add Issue</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {`${siteName} • Inspection #${inspectionId?.slice(-6) || ''}`}
            </Text>
            {isOffline && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialCommunityIcons 
                  name="cloud-off-outline" 
                  size={14} 
                  color={theme.colors.warning} 
                />
                <Text variant="bodySmall" style={{ color: theme.colors.warning, marginLeft: 4 }}>
                  Offline mode - Photos will upload when connected
                </Text>
              </View>
            )}
            {issuesSavedCount > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors?.primary || '#6200ee', marginTop: 2 }}>
                {`${issuesSavedCount} issue${issuesSavedCount > 1 ? 's' : ''} added in this session`}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {issuesSavedCount > 0 && (
              <Chip 
                mode="flat" 
                compact 
                style={{ backgroundColor: theme.colors?.primaryContainer || '#e8def8', marginRight: 8 }}
              >
                {String(issuesSavedCount)}
              </Chip>
            )}
            {__DEV__ && (
              <IconButton
                icon="refresh"
                mode="contained-tonal"
                size={20}
                onPress={() => loadFormData(false)}
                disabled={syncing || loading}
              />
            )}
          </View>
        </View>
      </Surface>

      {/* Sync Success Snackbar */}
      <Snackbar
        visible={showSyncSuccess}
        onDismiss={() => setShowSyncSuccess(false)}
        duration={2000}
        style={{ backgroundColor: theme.colors?.primary || '#6200ee' }}
      >
        NCR data synced successfully!
      </Snackbar>

      <View style={styles.content}>
        {/* Area Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }, selectedArea && { borderColor: theme.colors?.primary || '#6200ee', borderWidth: 1 }]}>
          <Card.Content>
            <View style={styles.row}>
              <Text variant="titleMedium" style={{ flex: 1, color: theme.colors.onSurface }}>Location</Text>
              {selectedArea && (
                <Chip 
                  mode="flat" 
                  compact 
                  icon="check"
                  style={{ backgroundColor: theme.colors?.primaryContainer || '#e8def8' }}
                >
                  Selected
                </Chip>
              )}
            </View>
            <Button
              mode={selectedArea ? "contained-tonal" : "outlined"}
              onPress={() => setShowAreaPicker(true)}
              icon="map-marker"
              contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
              style={{ width: '100%', marginTop: 12 }}
            >
              {selectedArea ? selectedArea.name : 'Select Area *'}
            </Button>
            {selectedArea?.description && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                {selectedArea.description}
              </Text>
            )}
            {selectedArea && (
              <Button
                mode="text"
                onPress={() => setShowAreaPicker(true)}
                style={{ marginTop: 8 }}
                compact
              >
                Change Area
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Description */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <TextInput
              label="Issue Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="Describe the issue found..."
            />
          </Card.Content>
        </Card>

        {/* Category & Severity */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, color: theme.colors.onSurface }}>Classification</Text>
            
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowCategoryMenu(true)}
                      icon="chevron-down"
                      contentStyle={{ flexDirection: 'row-reverse' }}
                    >
                      {selectedCategory?.name || 'Select Category'}
                    </Button>
                  }
                >
                  {categories.map(category => (
                    <Menu.Item
                      key={category.id}
                      onPress={() => {
                        setSelectedCategory(category);
                        setShowCategoryMenu(false);
                      }}
                      title={category.name}
                    />
                  ))}
                </Menu>
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Menu
                  visible={showSeverityMenu}
                  onDismiss={() => setShowSeverityMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowSeverityMenu(true)}
                      icon="chevron-down"
                      contentStyle={{ flexDirection: 'row-reverse' }}
                    >
                      {selectedSeverity?.name || 'Select Severity'}
                    </Button>
                  }
                >
                  {severities.map(severity => (
                    <Menu.Item
                      key={severity.id}
                      onPress={() => {
                        setSelectedSeverity(severity);
                        setShowSeverityMenu(false);
                      }}
                      title={severity.name}
                    />
                  ))}
                </Menu>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Responsible Person & Due Date */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, color: theme.colors.onSurface }}>Assignment</Text>
            
            <Menu
              visible={showUserMenu}
              onDismiss={() => setShowUserMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setShowUserMenu(true)}
                  icon="account"
                  contentStyle={{ flexDirection: 'row-reverse' }}
                  style={{ marginBottom: 12 }}
                >
                  {selectedUser ? selectedUser.fullName : 'Select Responsible Person'}
                </Button>
              }
            >
              <ScrollView style={{ maxHeight: 300 }}>
                {siteUsers.map(user => (
                  <Menu.Item
                    key={user.id}
                    onPress={() => {
                      setSelectedUser(user);
                      setShowUserMenu(false);
                    }}
                    title={user.fullName}
                    description={user.email}
                  />
                ))}
              </ScrollView>
            </Menu>

            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
              contentStyle={{ flexDirection: 'row-reverse' }}
            >
              Due: {proposedDate.toLocaleDateString()}
            </Button>

            {showDatePicker && (
              <DateTimePicker
                value={proposedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setProposedDate(date);
                }}
              />
            )}
          </Card.Content>
        </Card>

        {/* Images */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.imageHeader}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>Evidence Photos</Text>
              <Chip mode="flat" compact>
                {images.length}/5
              </Chip>
            </View>
            
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              {captureBeforeAfter ? 'Capture before/after photos' : 'Add photos of the issue'}
            </Text>

            {/* Image Grid */}
            {images.length > 0 && (
              <View style={styles.imageGrid}>
                {images.map((image, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <TouchableOpacity onPress={() => handleAnnotateImage(image)}>
                      <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                      {image.annotations.length > 0 && (
                        <View style={styles.annotationBadge}>
                          <Text style={styles.annotationBadgeText}>
                            {image.annotations.length}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <IconButton
                      icon="close-circle"
                      size={20}
                      style={styles.removeButton}
                      onPress={() => handleRemoveImage(index)}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Add Image Buttons */}
            {images.length < 5 && (
              <View style={styles.row}>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleImagePicker('camera')}
                  icon="camera"
                  style={{ flex: 1, marginRight: 8 }}
                >
                  Camera
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleImagePicker('gallery')}
                  icon="image"
                  style={{ flex: 1, marginLeft: 8 }}
                >
                  Gallery
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Upload Progress */}
        {uploadingImages && (
          <Card style={[styles.card, { backgroundColor: theme.colors?.primaryContainer || '#e8def8' }]}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 8, color: theme.colors.onSurface }}>
                Uploading Images...
              </Text>
              <ProgressBar 
                progress={uploadProgress / 100} 
                color={theme.colors?.primary || '#6200ee'}
                style={{ height: 8, borderRadius: 4 }}
              />
              <Text variant="bodySmall" style={{ marginTop: 8, textAlign: 'center', color: theme.colors.onSurface }}>
                {uploadProgress}% Complete
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => {
              // Navigate directly back to conduct screen
              router.push({
                pathname: '/(drawer)/self-inspection/conduct',
                params: {
                  inspectionId: inspectionId,
                  companyId: companyId,
                  siteId: siteId,
                  site: siteName
                }
              });
            }}
            style={{ flex: 1, marginRight: 8 }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSaveIssue}
            loading={saving}
            disabled={saving}
            style={{ flex: 1, marginLeft: 8 }}
            icon={uploadingImages ? "cloud-upload" : "check"}
          >
            {uploadingImages ? 'Uploading...' : 'Save Issue'}
          </Button>
        </View>
      </View>

      {/* Area Picker Modal */}
      <AreaPicker
        visible={showAreaPicker}
        onDismiss={() => setShowAreaPicker(false)}
        onSelect={(area) => setSelectedArea(area)}
        areas={availableAreas}
        selectedAreaId={selectedArea?.id}
        title="Select Issue Location"
        loading={loading}
      />

      {/* Success Snackbar */}
      <Snackbar
        visible={showSuccessSnackbar}
        onDismiss={() => setShowSuccessSnackbar(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors?.primary || '#6200ee' }}
        action={{
          label: 'View',
          onPress: () => {
            // Navigate directly back to conduct screen
            router.push({
              pathname: '/(drawer)/self-inspection/conduct',
              params: {
                inspectionId: inspectionId,
                companyId: companyId,
                siteId: siteId,
                site: siteName
              }
            });
          },
        }}
      >
        Issue saved successfully! Total: {issuesSavedCount}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginRight: 8,
    marginBottom: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
  },
  annotationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  annotationBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 32,
  },
});