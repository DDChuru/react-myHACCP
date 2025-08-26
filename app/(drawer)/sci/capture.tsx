import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSCI } from '../../../contexts/SCIContext';
import { LocalImage, ImageFieldType } from '../../../types/sci';
import { debug, PerfTimer } from '../../../utils/debug';
import ImageAnnotator from '../../../components/ImageAnnotator';

export default function ImageCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { queueImage, updateFieldImage, getFieldImages, selectedDocument } = useSCI();
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [existingImage, setExistingImage] = useState<LocalImage | null>(null);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [annotations, setAnnotations] = useState<any[]>([]);

  // Parse params
  const documentId = params.documentId as string;
  const documentNumber = params.documentNumber as string;
  const fieldType = params.fieldType as ImageFieldType;
  const fieldIndex = parseInt(params.fieldIndex as string, 10);
  const fieldName = params.fieldName as string;

  useEffect(() => {
    console.log('[ImageCapture] Component mounted with params:', {
      documentId,
      documentNumber,
      fieldType,
      fieldIndex,
      fieldName
    });
    checkExistingImage();
    requestPermissions();
  }, []);

  const checkExistingImage = () => {
    // First check if the field already has an image from Firestore
    if (selectedDocument && selectedDocument.content[fieldType]) {
      const fieldItem = selectedDocument.content[fieldType][fieldIndex];
      if (fieldItem && (fieldItem.imageUrl || fieldItem.image)) {
        console.log('[ImageCapture] Field already has image:', fieldItem.imageUrl || fieldItem.image);
        setImageUri(fieldItem.imageUrl || fieldItem.image);
        setExistingImage({
          id: `existing_${documentId}_${fieldType}_${fieldIndex}`,
          documentId,
          documentNumber,
          fieldType,
          fieldIndex,
          fieldName,
          localUri: fieldItem.imageUrl || fieldItem.image,
          syncStatus: 'synced',
          capturedAt: new Date(),
        } as LocalImage);
        return;
      }
    }
    
    // Then check for queued images
    const existingImages = getFieldImages(documentId, fieldType);
    const existing = existingImages.find(img => img.fieldIndex === fieldIndex);
    if (existing) {
      console.log('[ImageCapture] Found queued image:', existing.id);
      setExistingImage(existing);
      setImageUri(existing.localUri);
    }
  };

  const requestPermissions = async () => {
    console.log('[ImageCapture] Requesting permissions...');
    
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    console.log('[ImageCapture] Camera permission:', cameraPermission);
    
    const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    console.log('[ImageCapture] Media library permission:', mediaLibraryPermission);
    
    if (cameraPermission.status !== 'granted' || mediaLibraryPermission.status !== 'granted') {
      console.error('[ImageCapture] Permissions denied:', {
        camera: cameraPermission.status,
        mediaLibrary: mediaLibraryPermission.status
      });
      Alert.alert(
        'Permissions Required',
        `Camera: ${cameraPermission.status}, Media Library: ${mediaLibraryPermission.status}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      console.log('[ImageCapture] All permissions granted');
    }
  };

  const launchCamera = async () => {
    console.log('[ImageCapture] Launching camera...');
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('[ImageCapture] Camera result:', { 
        canceled: result.canceled, 
        hasAssets: result.assets?.length > 0 
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[ImageCapture] Processing image from camera...');
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ImageCapture] Camera launch failed:', error);
      debug.error('Camera launch failed:', error);
      Alert.alert('Error', `Failed to launch camera: ${error.message}`);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      debug.error('Gallery pick failed:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const processImage = async (uri: string) => {
    const timer = new PerfTimer('Process Image');
    setIsProcessing(true);
    
    console.log('[ImageCapture] Processing image:', { uri, fieldType, fieldIndex });
    
    try {
      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Resize to max width of 1200px
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );

      console.log('[ImageCapture] Image processed:', { 
        original: uri, 
        processed: manipulatedImage.uri,
        width: manipulatedImage.width,
        height: manipulatedImage.height
      });

      setImageUri(manipulatedImage.uri);
      debug.success('Image processed successfully');
    } catch (error) {
      console.error('[ImageCapture] Image processing failed:', error);
      debug.error('Image processing failed:', error);
      Alert.alert('Error', `Failed to process image: ${error.message}`);
    } finally {
      setIsProcessing(false);
      timer.end();
    }
  };

  const saveImage = async () => {
    if (!imageUri) {
      Alert.alert('Error', 'No image to save');
      return;
    }

    console.log('[ImageCapture] Starting save process:', { 
      documentId, 
      fieldType, 
      fieldIndex, 
      fieldName,
      imageUri: imageUri?.substring(0, 50) + '...'
    });

    setIsProcessing(true);
    const timer = new PerfTimer('Save Image');

    try {
      // Create local image object with proper categorization
      const localImage: LocalImage = {
        id: `${documentId}_${fieldType}_${fieldIndex}_${Date.now()}`,
        documentId,
        documentNumber,
        fieldType,
        fieldIndex,
        fieldName,
        localUri: imageUri,
        syncStatus: 'pending',
        capturedAt: new Date(),
        retryCount: 0,
        // Add category for 2-pronged approach
        category: fieldType === 'sanitationSteps' ? 'cleaning' : 
                  fieldType === 'postCleaningInspections' ? 'inspection' : 'other',
      };

      console.log('[ImageCapture] Created local image object:', localImage);

      // Queue image for upload
      await queueImage(localImage);
      console.log('[ImageCapture] Image queued successfully');

      // Update field with local URI temporarily
      await updateFieldImage(documentId, fieldType, fieldIndex, imageUri);
      console.log('[ImageCapture] Field updated with local URI');

      debug.success('Image saved to queue');
      
      // Check if device is online
      const { checkNetworkStatus } = require('../../../utils/networkUtils');
      const isOnline = await checkNetworkStatus();
      
      Alert.alert(
        'Success',
        isOnline 
          ? `Image captured for ${fieldName} and uploading to cloud...`
          : `Image captured for ${fieldName}. It will be synced when online.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('[ImageCapture] Failed to save image:', error);
      debug.error('Failed to save image:', error);
      Alert.alert('Error', `Failed to save image: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
      timer.end();
    }
  };

  const handleAnnotate = () => {
    if (!imageUri) {
      Alert.alert('No Image', 'Please capture an image first');
      return;
    }
    setShowAnnotator(true);
  };

  const handleAnnotationSave = (annotatedUri: string, newAnnotations: any[]) => {
    console.log('[ImageCapture] Saved annotated image:', annotatedUri);
    setImageUri(annotatedUri);
    setAnnotations(newAnnotations);
    setShowAnnotator(false);
  };

  const retakeImage = () => {
    const title = existingImage ? 'Replace Image' : 'Retake Image';
    const message = existingImage?.syncStatus === 'synced' 
      ? 'This will replace the existing image. The previous image will be overwritten.'
      : 'Are you sure you want to retake this image?';
    
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: existingImage ? 'Replace' : 'Retake',
          style: existingImage ? 'destructive' : 'default',
          onPress: () => {
            console.log('[ImageCapture] Retaking/replacing image');
            setImageUri(null);
            setExistingImage(null);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.documentNumber}>{documentNumber}</Text>
          <Text style={styles.fieldName} numberOfLines={1}>
            {fieldName}
          </Text>
        </View>
      </View>

      {/* Context Info */}
      <View style={styles.contextContainer}>
        <View style={styles.contextItem}>
          <MaterialCommunityIcons name="file-document" size={20} color="#666" />
          <Text style={styles.contextText}>{selectedDocument?.title}</Text>
        </View>
        <View style={styles.contextItem}>
          <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#666" />
          <Text style={styles.contextText}>
            {fieldType.replace(/([A-Z])/g, ' $1').trim()}
          </Text>
        </View>
        <View style={styles.contextItem}>
          <MaterialCommunityIcons name="numeric" size={20} color="#666" />
          <Text style={styles.contextText}>Item {fieldIndex + 1}</Text>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.capturedImage} />
            {existingImage && (
              <View style={styles.existingBadge}>
                <MaterialCommunityIcons 
                  name={existingImage.syncStatus === 'synced' ? "check-circle" : "clock-outline"} 
                  size={20} 
                  color={existingImage.syncStatus === 'synced' ? "#4CAF50" : "#FF9800"} 
                />
                <Text style={styles.existingText}>
                  {existingImage.syncStatus === 'synced' ? 'Current Image' : 'Pending Upload'}
                </Text>
              </View>
            )}
            {annotations.length > 0 && (
              <View style={styles.annotationBadge}>
                <MaterialCommunityIcons name="draw" size={16} color="#FFF" />
                <Text style={styles.annotationText}>{annotations.length} annotations</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialCommunityIcons name="image-off" size={80} color="#CCC" />
            <Text style={styles.placeholderText}>No image captured</Text>
            <Text style={styles.instructionText}>
              Take a photo or select from gallery
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        {!imageUri ? (
          <View style={styles.captureButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cameraButton]}
              onPress={launchCamera}
              disabled={isProcessing}
            >
              <MaterialCommunityIcons name="camera" size={32} color="#FFF" />
              <Text style={styles.actionButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.galleryButton]}
              onPress={pickFromGallery}
              disabled={isProcessing}
            >
              <MaterialCommunityIcons name="image" size={32} color="#FFF" />
              <Text style={styles.actionButtonText}>From Gallery</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.reviewButtons}>
            <TouchableOpacity
              style={[styles.reviewButton, styles.retakeButton]}
              onPress={retakeImage}
              disabled={isProcessing}
            >
              <MaterialCommunityIcons 
                name={existingImage ? "camera-switch" : "camera-retake"} 
                size={24} 
                color="#666" 
              />
              <Text style={styles.reviewButtonText}>
                {existingImage ? 'Replace' : 'Retake'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.reviewButton, styles.annotateButton]}
              onPress={handleAnnotate}
              disabled={isProcessing}
            >
              <MaterialCommunityIcons name="draw" size={24} color="#007AFF" />
              <Text style={[styles.reviewButtonText, { color: '#007AFF' }]}>
                Annotate
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.reviewButton, styles.saveButton]}
              onPress={saveImage}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check" size={24} color="#FFF" />
                  <Text style={[styles.reviewButtonText, { color: '#FFF' }]}>
                    {existingImage ? 'Update' : 'Save'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for good photos:</Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="lightbulb" size={16} color="#FF9800" />
            <Text style={styles.tipText}>Ensure good lighting</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="focus-field" size={16} color="#FF9800" />
            <Text style={styles.tipText}>Focus on the subject clearly</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="image-frame" size={16} color="#FF9800" />
            <Text style={styles.tipText}>Include all relevant details</Text>
          </View>
        </View>
      </ScrollView>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.processingText}>Processing image...</Text>
        </View>
      )}
      
      {/* Image Annotator */}
      {showAnnotator && imageUri && (
        <ImageAnnotator
          imageUri={imageUri}
          initialAnnotations={annotations}
          onSave={handleAnnotationSave}
          onCancel={() => setShowAnnotator(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  documentNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  fieldName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  contextContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  contextText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  capturedImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  existingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  existingText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  placeholderContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  placeholderText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  captureButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cameraButton: {
    backgroundColor: '#007AFF',
    marginRight: 8,
  },
  galleryButton: {
    backgroundColor: '#34C759',
    marginLeft: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  reviewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retakeButton: {
    backgroundColor: '#FFF',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 0.8,
  },
  annotateButton: {
    backgroundColor: '#FFF',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    marginLeft: 4,
    flex: 0.8,
  },
  annotationBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  annotationText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#666',
  },
  tipsContainer: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 16,
  },
});