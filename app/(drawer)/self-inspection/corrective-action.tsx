import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { 
  Surface, 
  Text, 
  Card, 
  Button, 
  useTheme,
  TextInput,
  Chip,
  ActivityIndicator,
  IconButton,
  Divider
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import ImageAnnotator from '../../../components/ImageAnnotator';
import SignatureCapture from '../../../components/SignatureCapture';

interface AfterImage {
  uri: string;
  annotations: any[];
  uploadedAt: Date;
}

export default function CorrectiveActionScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issue, setIssue] = useState<any>(null);
  
  // Form fields
  const [acknowledged, setAcknowledged] = useState(false);
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [completionDate, setCompletionDate] = useState(new Date());
  const [afterImages, setAfterImages] = useState<AfterImage[]>([]);
  
  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [annotatingImage, setAnnotatingImage] = useState<AfterImage | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [userSignature, setUserSignature] = useState<string | null>(null);
  
  // Parse params
  const issueId = params.issueId as string;
  const inspectionId = params.inspectionId as string;
  
  const companyId = '2XTSaqxU41zCTBIVJeXb'; // Envirowize

  useEffect(() => {
    loadIssueData();
    fetchUserSignature();
  }, []);

  const loadIssueData = async () => {
    try {
      setLoading(true);
      // In a real app, fetch from Firestore
      // const issueDoc = await getDoc(doc(db, `companies/${companyId}/self_inspections/${inspectionId}/issues/${issueId}`));
      // setIssue(issueDoc.data());
      
      // Mock data for now
      setIssue({
        id: issueId,
        description: 'Temperature gauge not calibrated properly',
        category: 'Equipment',
        severity: 'Major',
        areaName: 'Kitchen A',
        responsibleUserName: 'John Doe',
        proposedActionDate: new Date(),
        status: 'pending'
      });
    } catch (error) {
      console.error('Error loading issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSignature = async () => {
    try {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userData?.signatureUrl) {
          setUserSignature(userData.signatureUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching user signature:', error);
    }
  };

  const handleAcknowledge = () => {
    if (!acknowledged) {
      Alert.alert(
        'Acknowledge Issue',
        'By acknowledging, you confirm that you have reviewed this issue and will take corrective action.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Acknowledge', 
            onPress: () => {
              setAcknowledged(true);
              // In production, update Firestore
            }
          }
        ]
      );
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
          selectionLimit: 5 - afterImages.length,
        });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => ({
        uri: asset.uri,
        annotations: [],
        uploadedAt: new Date()
      }));
      
      if (afterImages.length + newImages.length > 5) {
        Alert.alert('Limit reached', 'Maximum 5 images allowed');
        return;
      }
      
      setAfterImages([...afterImages, ...newImages]);
    }
  };

  const handleAnnotateImage = (image: AfterImage) => {
    setAnnotatingImage(image);
  };

  const handleSaveAnnotations = (annotatedUri: string, annotations: any[]) => {
    setAfterImages(afterImages.map(img => 
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
          onPress: () => setAfterImages(afterImages.filter((_, i) => i !== index))
        }
      ]
    );
  };

  const handleCompleteAction = () => {
    // Validation
    if (!acknowledged) {
      Alert.alert('Error', 'Please acknowledge the issue first');
      return;
    }
    if (!correctiveAction.trim()) {
      Alert.alert('Error', 'Please describe the corrective action taken');
      return;
    }
    if (afterImages.length === 0) {
      Alert.alert('Error', 'Please add at least one photo showing the corrective action');
      return;
    }
    
    // Show signature modal
    setShowSignature(true);
  };

  const handleSignatureSave = async (signature: string) => {
    setShowSignature(false);
    
    try {
      setSaving(true);
      
      // Create corrective action data
      const actionData = {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy: user?.uid,
        correctiveAction: correctiveAction,
        completionDate: completionDate,
        afterImages: afterImages,
        responsibleSignature: signature,
        signedAt: serverTimestamp(),
        status: 'resolved',
        resolvedBy: user?.uid,
        resolvedByName: user?.displayName || user?.email
      };
      
      // In production, update the issue in Firestore
      // await updateDoc(doc(db, `companies/${companyId}/self_inspections/${inspectionId}/issues/${issueId}`), actionData);
      
      Alert.alert(
        'Success',
        'Corrective action completed successfully',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      console.error('Error saving corrective action:', error);
      Alert.alert('Error', 'Failed to save corrective action');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16 }}>Loading issue...</Text>
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
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">Corrective Action</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 4 }}>
          Resolve issue and document action taken
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Issue Details */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.issueHeader}>
              <Text variant="titleMedium">Issue Details</Text>
              <Chip 
                mode="flat"
                style={{ 
                  backgroundColor: 
                    issue?.severity === 'Critical' ? theme.colors.errorContainer :
                    issue?.severity === 'Major' ? theme.colors.secondaryContainer :
                    theme.colors.secondaryContainer
                }}
              >
                {issue?.severity}
              </Chip>
            </View>
            
            <Divider style={{ marginVertical: 12 }} />
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>Area:</Text>
              <Text variant="bodyMedium">{issue?.areaName}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>Category:</Text>
              <Text variant="bodyMedium">{issue?.category}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>Description:</Text>
            </View>
            <Text variant="bodyMedium" style={{ marginTop: 4 }}>
              {issue?.description}
            </Text>
            
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={{ opacity: 0.6 }}>Due Date:</Text>
              <Text variant="bodyMedium">
                {issue?.proposedActionDate?.toLocaleDateString()}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Acknowledgement */}
        {!acknowledged ? (
          <Card style={[styles.card, styles.acknowledgeCard]}>
            <Card.Content>
              <Text variant="titleMedium">Step 1: Acknowledge Issue</Text>
              <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 8 }}>
                Confirm that you have reviewed this issue and will take action
              </Text>
              <Button
                mode="contained"
                onPress={handleAcknowledge}
                style={{ marginTop: 16 }}
                icon="check"
              >
                Acknowledge Issue
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Card style={[styles.card, styles.acknowledgedCard]}>
            <Card.Content>
              <View style={styles.acknowledgedHeader}>
                <IconButton
                  icon="check-circle"
                  size={24}
                  iconColor={theme.colors.primary}
                />
                <Text variant="titleMedium">Issue Acknowledged</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Corrective Action */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12 }}>
              Step 2: Document Corrective Action
            </Text>
            
            <TextInput
              label="Corrective Action Taken"
              value={correctiveAction}
              onChangeText={setCorrectiveAction}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="Describe the action taken to resolve this issue..."
              disabled={!acknowledged}
            />
            
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
              contentStyle={{ flexDirection: 'row-reverse' }}
              style={{ marginTop: 12 }}
              disabled={!acknowledged}
            >
              Completion Date: {completionDate.toLocaleDateString()}
            </Button>
            
            {showDatePicker && (
              <DateTimePicker
                value={completionDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setCompletionDate(date);
                }}
              />
            )}
          </Card.Content>
        </Card>

        {/* After Images */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.imageHeader}>
              <Text variant="titleMedium">Step 3: After Photos</Text>
              <Chip mode="flat" compact>
                {afterImages.length}/5
              </Chip>
            </View>
            
            <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 12 }}>
              Add photos showing the completed corrective action (minimum 1 required)
            </Text>

            {/* Image Grid */}
            {afterImages.length > 0 && (
              <View style={styles.imageGrid}>
                {afterImages.map((image, index) => (
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
            {afterImages.length < 5 && (
              <View style={styles.row}>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleImagePicker('camera')}
                  icon="camera"
                  style={{ flex: 1, marginRight: 8 }}
                  disabled={!acknowledged}
                >
                  Camera
                </Button>
                <Button
                  mode="contained-tonal"
                  onPress={() => handleImagePicker('gallery')}
                  icon="image"
                  style={{ flex: 1, marginLeft: 8 }}
                  disabled={!acknowledged}
                >
                  Gallery
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={{ flex: 1, marginRight: 8 }}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleCompleteAction}
            loading={saving}
            disabled={saving || !acknowledged || !correctiveAction || afterImages.length === 0}
            style={{ flex: 1, marginLeft: 8 }}
            icon="check-circle"
          >
            Complete Action
          </Button>
        </View>
      </View>

      {/* Signature Modal */}
      <SignatureCapture
        visible={showSignature}
        onDismiss={() => setShowSignature(false)}
        onSave={handleSignatureSave}
        title="Responsible Person Signature"
        description="Sign to confirm corrective action completion"
        existingSignature={userSignature || undefined}
      />
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
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  acknowledgeCard: {
    backgroundColor: '#fff3e0',
  },
  acknowledgedCard: {
    backgroundColor: '#e8f5e9',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  acknowledgedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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