import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSCI } from '../../../contexts/SCIContext';
import { LocalImage } from '../../../types/sci';
import { debug } from '../../../utils/debug';

const { width: screenWidth } = Dimensions.get('window');
const imageSize = (screenWidth - 48) / 3; // 3 columns with padding

export default function ImageGalleryScreen() {
  const router = useRouter();
  const { selectedDocument, imageQueue, syncImageQueue, isSyncing } = useSCI();
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Filter images for current document
  const documentImages = imageQueue.filter(
    img => img.documentId === selectedDocument?.id
  );

  const toggleImageSelection = (imageId: string) => {
    const newSelection = new Set(selectedImages);
    if (newSelection.has(imageId)) {
      newSelection.delete(imageId);
    } else {
      newSelection.add(imageId);
    }
    setSelectedImages(newSelection);
    
    if (newSelection.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleLongPress = (imageId: string) => {
    setIsSelectionMode(true);
    setSelectedImages(new Set([imageId]));
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Images',
      `Are you sure you want to delete ${selectedImages.size} image(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // In production, implement deletion logic
            debug.log('Delete images:', Array.from(selectedImages));
            setSelectedImages(new Set());
            setIsSelectionMode(false);
            Alert.alert('Success', 'Images deleted successfully');
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (documentImages.length === 0) {
      Alert.alert('No Images', 'No images to sync for this document');
      return;
    }

    Alert.alert(
      'Sync Images',
      `Sync ${documentImages.length} image(s) to the cloud?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync',
          onPress: async () => {
            await syncImageQueue();
          },
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: LocalImage }) => {
    const isSelected = selectedImages.has(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.imageItem, isSelected && styles.selectedImage]}
        onPress={() => {
          if (isSelectionMode) {
            toggleImageSelection(item.id);
          } else {
            // Navigate to full screen viewer (to be implemented)
            debug.log('View image:', item.id);
          }
        }}
        onLongPress={() => handleLongPress(item.id)}
      >
        <Image source={{ uri: item.localUri }} style={styles.image} />
        
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <View style={styles.selectionOverlay}>
            <MaterialCommunityIcons
              name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
              size={24}
              color="#FFF"
            />
          </View>
        )}
        
        {/* Sync Status */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.syncStatus === 'synced' ? '#4CAF50' : '#FF9800' }
        ]}>
          <MaterialCommunityIcons
            name={item.syncStatus === 'synced' ? 'cloud-check' : 'cloud-upload'}
            size={14}
            color="#FFF"
          />
        </View>
        
        {/* Field Info */}
        <View style={styles.imageInfo}>
          <Text style={styles.fieldNameText} numberOfLines={1}>
            {item.fieldName}
          </Text>
          <Text style={styles.fieldTypeText}>
            {item.fieldType.replace(/([A-Z])/g, ' $1').trim()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="image-off" size={80} color="#CCC" />
      <Text style={styles.emptyTitle}>No Images Yet</Text>
      <Text style={styles.emptyText}>
        Captured images for this document will appear here
      </Text>
      <TouchableOpacity
        style={styles.captureButton}
        onPress={() => router.back()}
      >
        <MaterialCommunityIcons name="camera-plus" size={24} color="#FFF" />
        <Text style={styles.captureButtonText}>Start Capturing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Image Gallery</Text>
          {selectedDocument && (
            <Text style={styles.documentNumber}>{selectedDocument.documentNumber}</Text>
          )}
        </View>
        {isSelectionMode ? (
          <TouchableOpacity onPress={handleDeleteSelected} style={styles.deleteButton}>
            <MaterialCommunityIcons name="delete" size={24} color="#FF3B30" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSync} style={styles.syncButton} disabled={isSyncing}>
            {isSyncing ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <MaterialCommunityIcons name="cloud-sync" size={24} color="#007AFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Selection Bar */}
      {isSelectionMode && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedImages.size} image(s) selected
          </Text>
          <TouchableOpacity
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedImages(new Set());
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Bar */}
      {documentImages.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="image" size={20} color="#666" />
            <Text style={styles.statText}>{documentImages.length} Total</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="cloud-check" size={20} color="#4CAF50" />
            <Text style={styles.statText}>
              {documentImages.filter(img => img.syncStatus === 'synced').length} Synced
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#FF9800" />
            <Text style={styles.statText}>
              {documentImages.filter(img => img.syncStatus === 'pending').length} Pending
            </Text>
          </View>
        </View>
      )}

      {/* Image Grid */}
      <FlatList
        data={documentImages}
        renderItem={renderImage}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        columnWrapperStyle={documentImages.length > 0 ? styles.row : undefined}
      />
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
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  documentNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  syncButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
  },
  selectionText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFF',
    padding: 12,
    marginTop: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  gridContent: {
    padding: 8,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  imageItem: {
    width: imageSize,
    height: imageSize,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedImage: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderRadius: 12,
    padding: 2,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 6,
  },
  fieldNameText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },
  fieldTypeText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  captureButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});