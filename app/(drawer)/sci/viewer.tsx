import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSCI } from '../../../contexts/SCIContext';
import { SCIDocument, ImageFieldType } from '../../../types/sci';
import { debug } from '../../../utils/debug';

interface SectionData {
  title: string;
  icon: string;
  fieldType: ImageFieldType | null;
  items: any[];
  color: string;
}

export default function SCIDocumentViewer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { documents, selectedDocument, selectDocument, getFieldImages } = useSCI();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [params.id]);

  const loadDocument = async () => {
    try {
      const docId = params.id as string;
      if (!docId) {
        Alert.alert('Error', 'No document ID provided');
        router.back();
        return;
      }

      // Find document from context
      const doc = documents.find(d => d.id === docId);
      if (doc) {
        selectDocument(doc);
        // Expand first section by default
        setExpandedSections(new Set(['Safety & PPE']));
      } else {
        Alert.alert('Error', 'Document not found');
        router.back();
      }
    } catch (error) {
      debug.error('Failed to load document:', error);
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocument();
    setRefreshing(false);
  };

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle);
    } else {
      newExpanded.add(sectionTitle);
    }
    setExpandedSections(newExpanded);
  };

  const navigateToCapture = (fieldType: ImageFieldType, fieldIndex: number, fieldName: string) => {
    console.log('[SCIViewer] Navigate to capture:', { fieldType, fieldIndex, fieldName });
    
    if (!selectedDocument) {
      console.error('[SCIViewer] No selected document!');
      return;
    }
    
    console.log('[SCIViewer] Pushing to capture screen with params:', {
      documentId: selectedDocument.id,
      documentNumber: selectedDocument.documentNumber,
      fieldType,
      fieldIndex,
      fieldName,
    });
    
    router.push({
      pathname: '/(drawer)/sci/capture',
      params: {
        documentId: selectedDocument.id,
        documentNumber: selectedDocument.documentNumber,
        fieldType,
        fieldIndex,
        fieldName,
      },
    });
  };

  const getSections = (doc: SCIDocument): SectionData[] => {
    const sections: SectionData[] = [];
    
    // Log the entire document structure to see what we're working with
    console.log('[SCIViewer] Document structure:', JSON.stringify(doc, null, 2));
    console.log('[SCIViewer] Content keys:', Object.keys(doc.content || {}));
    console.log('[SCIViewer] ContentKeys array:', doc.contentKeys);

    // Safety & PPE Section
    const safetyItems = [
      ...(doc.content.safetyPrecautions?.map((item, idx) => ({
        ...item,
        fieldType: 'safetyPrecautions' as ImageFieldType,
        fieldIndex: idx,
      })) || []),
      ...(doc.content.ppeRequirements?.map((item, idx) => ({
        ...item,
        fieldType: 'ppeRequirements' as ImageFieldType,
        fieldIndex: idx,
      })) || []),
    ];

    if (safetyItems.length > 0) {
      sections.push({
        title: 'Safety & PPE',
        icon: 'shield-check',
        fieldType: null,
        items: safetyItems,
        color: '#FF6B6B',
      });
    }

    // Equipment Section
    if (doc.content.applicationEquipment?.length > 0) {
      sections.push({
        title: 'Equipment',
        icon: 'tools',
        fieldType: 'applicationEquipment',
        items: doc.content.applicationEquipment.map((item, idx) => ({
          ...item,
          fieldType: 'applicationEquipment',
          fieldIndex: idx,
        })),
        color: '#4ECDC4',
      });
    }

    // Cleaning Steps Section
    if (doc.content.sanitationSteps?.length > 0) {
      sections.push({
        title: 'Cleaning Steps',
        icon: 'broom',
        fieldType: 'sanitationSteps',
        items: doc.content.sanitationSteps.map((item, idx) => ({
          ...item,
          fieldType: 'sanitationSteps',
          fieldIndex: idx,
        })),
        color: '#45B7D1',
      });
    }

    // Inspections Section
    if (doc.content.postCleaningInspections?.length > 0) {
      sections.push({
        title: 'Inspections',
        icon: 'clipboard-check',
        fieldType: 'postCleaningInspections',
        items: doc.content.postCleaningInspections.map((item, idx) => ({
          ...item,
          fieldType: 'postCleaningInspections',
          fieldIndex: idx,
        })),
        color: '#96CEB4',
      });
    }

    return sections;
  };

  const renderFieldItem = (item: any) => {
    const hasImage = item.imageUrl || item.image;
    const queuedImages = getFieldImages(selectedDocument?.id || '', item.fieldType);
    const queuedImage = queuedImages.find(img => img.fieldIndex === item.fieldIndex);
    const displayImageUrl = hasImage || queuedImage?.localUri;

    return (
      <TouchableOpacity
        key={`${item.fieldType}-${item.fieldIndex}`}
        style={styles.fieldItem}
        onPress={() => {
          console.log('[SCIViewer] Field item clicked:', item.name);
          navigateToCapture(item.fieldType, item.fieldIndex, item.name);
        }}
      >
        <View style={styles.fieldContent}>
          <View style={styles.fieldTextContent}>
            <Text style={styles.fieldName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.fieldDescription}>{item.description}</Text>
            )}
            {item.acceptanceCriteria && (
              <Text style={styles.fieldCriteria}>✓ {item.acceptanceCriteria}</Text>
            )}
          </View>
          
          <View style={styles.imageContainer}>
            {displayImageUrl ? (
              <View style={styles.imageThumbnailWrapper}>
                <Image 
                  source={{ uri: displayImageUrl }} 
                  style={styles.imageThumbnail}
                  resizeMode="cover"
                />
                <View style={[
                  styles.imageStatusBadge,
                  { backgroundColor: hasImage ? '#4CAF50' : '#FF9800' }
                ]}>
                  <MaterialCommunityIcons 
                    name={hasImage ? "check" : "clock-outline"} 
                    size={12} 
                    color="#FFF" 
                  />
                </View>
              </View>
            ) : (
              <View style={styles.noImageContainer}>
                <MaterialCommunityIcons name="camera-plus" size={32} color="#999" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (section: SectionData) => {
    const isExpanded = expandedSections.has(section.title);
    const imageCount = section.items.filter(item => item.imageUrl || item.image).length;

    return (
      <View key={section.title} style={styles.section}>
        <TouchableOpacity
          style={[styles.sectionHeader, { borderLeftColor: section.color }]}
          onPress={() => toggleSection(section.title)}
        >
          <View style={styles.sectionHeaderLeft}>
            <MaterialCommunityIcons name={section.icon} size={24} color={section.color} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.imageBadge, { backgroundColor: section.color }]}>
              <Text style={styles.imageBadgeText}>
                {imageCount}/{section.items.length}
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="#666"
          />
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.sectionContent}>
            {section.items.map(renderFieldItem)}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </View>
    );
  }

  if (!selectedDocument) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons name="file-document-outline" size={64} color="#999" />
        <Text style={styles.emptyText}>Document not found</Text>
      </View>
    );
  }

  const sections = getSections(selectedDocument);
  const totalImages = sections.reduce((sum, s) => sum + s.items.length, 0);
  const capturedImages = sections.reduce(
    (sum, s) => sum + s.items.filter(item => item.imageUrl || item.image).length,
    0
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.documentNumber}>{selectedDocument.documentNumber}</Text>
          <Text style={styles.documentTitle} numberOfLines={1}>
            {selectedDocument.title}
          </Text>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Image Capture Progress</Text>
          <Text style={styles.progressCount}>
            {capturedImages} / {totalImages}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(capturedImages / totalImages) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Areas */}
      {selectedDocument.areas && selectedDocument.areas.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areasContainer}>
          {selectedDocument.areas.map((area, index) => {
            const areaName = typeof area === 'string' ? area : area.area || area.name || 'Unknown';
            return (
              <View key={index} style={styles.areaPill}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                <Text style={styles.areaText}>{areaName}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Sections */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {sections.map(renderSection)}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(drawer)/sci/gallery')}
      >
        <MaterialCommunityIcons name="image-multiple" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  documentNumber: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  progressContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginTop: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  areasContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 1,
    maxHeight: 60,
  },
  areaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  areaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderLeftWidth: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  imageBadge: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  imageBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  fieldItem: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  fieldContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldTextContent: {
    flex: 1,
    marginRight: 12,
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  fieldCriteria: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  imageContainer: {
    width: 80,
    height: 80,
  },
  imageThumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  imageStatusBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DDD',
  },
  addPhotoText: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  bottomPadding: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});