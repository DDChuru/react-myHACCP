/**
 * SCI Viewer Modal Component
 * Displays Standard Cleaning Instruction documents in a tabbed interface
 * for easy reference during iClean Verification
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Surface,
  IconButton,
  Chip,
  Divider,
  List,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { SCIFirestoreService } from '../services/sciFirestoreService';
import Storage from '../utils/storage';

interface SCIViewerModalProps {
  visible: boolean;
  onDismiss: () => void;
  documentId: string | null;
  companyId: string;
  itemName?: string;
}

interface SCIDocument {
  id: string;
  documentNumber: string;
  title: string;
  content: {
    sanitationSteps?: Array<{
      step: string;
      description: string;
      frequency?: string;
      chemical?: string;
    }>;
    postCleaningInspections?: Array<{
      item: string;
      criteria: string;
      acceptanceLevel?: string;
    }>;
    keyPoints?: Array<{
      point: string;
      importance?: string;
    }>;
    ppeRequirements?: string[];
    safetyPrecautions?: string[];
    applicationEquipment?: string[];
  };
}

type TabValue = 'cleaning' | 'sanitation' | 'inspection';

export default function SCIViewerModal({
  visible,
  onDismiss,
  documentId,
  companyId,
  itemName = 'Item',
}: SCIViewerModalProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabValue>('cleaning');
  const [loading, setLoading] = useState(false);
  const [sciDocument, setSciDocument] = useState<SCIDocument | null>(null);

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
    warning: '#ff9800',
    error: '#f44336',
  };

  useEffect(() => {
    if (visible && documentId) {
      loadSCIDocument();
    }
  }, [visible, documentId]);

  const loadSCIDocument = async () => {
    if (!documentId || !companyId) return;

    setLoading(true);
    try {
      console.log('[SCIModal] Loading SCI document:', documentId);
      
      // First check cache
      const cacheKey = `sci_doc_${documentId}`;
      const cachedData = await Storage.getItem(cacheKey);
      
      if (cachedData) {
        console.log('[SCIModal] Using cached document');
        const cached = JSON.parse(cachedData);
        setSciDocument(cached);
        
        // Still try to fetch fresh data in background
        fetchFromFirestore();
      } else {
        // No cache, fetch from Firestore
        await fetchFromFirestore();
      }
      
    } catch (error) {
      console.error('[SCIModal] Error loading SCI document:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFromFirestore = async () => {
    try {
      // Use the SCIFirestoreService which has proper field mapping
      const sciService = SCIFirestoreService.getInstance();
      
      // Try to fetch by document ID first
      console.log('[SCIModal] Fetching from Firestore with ID:', documentId);
      let sciDoc = await sciService.fetchSCIDocument(documentId, companyId);
      
      // If not found by ID, try as documentNumber
      if (!sciDoc) {
        console.log('[SCIModal] Not found by ID, trying to find by documentNumber...');
        // Query all SCI documents and find by documentNumber
        const allDocs = await sciService.fetchSCIDocuments(companyId);
        sciDoc = allDocs.find(d => 
          d.documentNumber === documentId || 
          d.id === documentId
        ) || null;
      }
      
      if (sciDoc) {
        console.log('[SCIModal] Document found:', sciDoc.documentNumber);
        console.log('[SCIModal] Document content structure:', {
          postCleaningInspections: sciDoc.content.postCleaningInspections?.slice(0, 2), // Log first 2 items
          sanitationSteps: sciDoc.content.sanitationSteps?.slice(0, 2),
          ppeRequirements: sciDoc.content.ppeRequirements?.slice(0, 2),
          safetyPrecautions: sciDoc.content.safetyPrecautions?.slice(0, 2),
          applicationEquipment: sciDoc.content.applicationEquipment?.slice(0, 2),
          keyPoints: sciDoc.content.keyPoints?.slice(0, 2),
          cleaningInstructions: sciDoc.content.cleaningInstructions?.slice(0, 2),
          equipmentColorCoding: sciDoc.content.equipmentColorCoding?.slice(0, 2)
        });
        console.log('[SCIModal] Content fields:', Object.keys(sciDoc.content || {}));
        
        // Transform to our expected format
        const transformedDoc: SCIDocument = {
          id: sciDoc.id,
          documentNumber: sciDoc.documentNumber,
          title: sciDoc.title,
          content: {
            // The service has already mapped fields properly
            sanitationSteps: sciDoc.content.sanitationSteps || sciDoc.content.cleaningSteps || [],
            postCleaningInspections: sciDoc.content.postCleaningInspections || [],
            keyPoints: sciDoc.content.keyPoints || [],
            ppeRequirements: sciDoc.content.ppeRequirements || [],
            safetyPrecautions: sciDoc.content.safetyPrecautions || [],
            applicationEquipment: sciDoc.content.applicationEquipment || [],
            cleaningInstructions: sciDoc.content.cleaningInstructions || [],
            equipmentColorCoding: sciDoc.content.equipmentColorCoding || []
          }
        };
        
        setSciDocument(transformedDoc);
        
        // Cache for offline use
        const cacheKey = `sci_doc_${documentId}`;
        await Storage.setItem(cacheKey, JSON.stringify(transformedDoc));
        
      } else {
        console.log('[SCIModal] No SCI document found for:', documentId);
        // Set a placeholder document for demo
        setSciDocument({
          id: 'placeholder',
          documentNumber: documentId,
          title: 'SCI Document',
          content: {
            sanitationSteps: [
              { step: 'Pre-rinse', description: 'Remove loose debris with water' },
              { step: 'Apply detergent', description: 'Use approved cleaning solution' },
              { step: 'Scrub', description: 'Thoroughly scrub all surfaces' },
              { step: 'Rinse', description: 'Remove all detergent residue' },
              { step: 'Sanitize', description: 'Apply approved sanitizer' }
            ],
            postCleaningInspections: [
              { item: 'Visual check', criteria: 'No visible debris or residue' },
              { item: 'Touch test', criteria: 'Surfaces feel clean and dry' }
            ],
            keyPoints: [
              { point: 'Always wear appropriate PPE', importance: 'High' },
              { point: 'Follow chemical dilution ratios', importance: 'Critical' }
            ],
            ppeRequirements: ['Gloves', 'Safety goggles', 'Apron'],
            safetyPrecautions: ['Ensure proper ventilation', 'Do not mix chemicals'],
            applicationEquipment: ['Scrub brush', 'Spray bottle', 'Cleaning cloths']
          }
        } as SCIDocument);
      }
    } catch (error) {
      console.error('[SCIModal] Firestore fetch error:', error);
      // If fetch fails, still show placeholder
      setSciDocument({
        id: 'placeholder',
        documentNumber: documentId,
        title: 'SCI Document (Offline)',
        content: {
          sanitationSteps: [],
          postCleaningInspections: [],
          keyPoints: [],
          ppeRequirements: [],
          safetyPrecautions: [],
          applicationEquipment: []
        }
      } as SCIDocument);
    }
  };

  const renderCleaningSteps = () => {
    if (!sciDocument?.content?.sanitationSteps) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="broom" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No cleaning steps available
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <List.Section>
          <List.Subheader style={{ color: colors.text }}>
            Sanitation Steps
          </List.Subheader>
          {sciDocument.content.sanitationSteps.map((step, index) => (
            <Surface 
              key={index} 
              style={[styles.stepCard, { backgroundColor: colors.cardBg }]}
              elevation={1}
            >
              <View style={styles.stepHeader}>
                <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {typeof step === 'string' ? step : (step.step || step.name || step.title || 'Step')}
                </Text>
              </View>
              {step.description && (
                <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                  {step.description}
                </Text>
              )}
              {step.frequency && (
                <View style={styles.chipRow}>
                  <Chip 
                    icon="clock-outline" 
                    style={[styles.chip, { backgroundColor: colors.surface }]}
                    textStyle={{ color: colors.text }}
                  >
                    {step.frequency}
                  </Chip>
                  {step.chemical && (
                    <Chip 
                      icon="flask" 
                      style={[styles.chip, { backgroundColor: colors.surface }]}
                      textStyle={{ color: colors.text }}
                    >
                      {step.chemical}
                    </Chip>
                  )}
                </View>
              )}
              {/* Image placeholder or actual image */}
              <View style={styles.imageContainer}>
                {(step.imageUrl || step.image) ? (
                  <Image 
                    source={{ uri: step.imageUrl || step.image }}
                    style={styles.stepImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Surface style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]} elevation={1}>
                    <MaterialCommunityIcons 
                      name="camera-plus" 
                      size={32} 
                      color={colors.textSecondary} 
                    />
                    <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 4 }}>
                      Photo placeholder
                    </Text>
                  </Surface>
                )}
              </View>
            </Surface>
          ))}
        </List.Section>

        {sciDocument.content.ppeRequirements && sciDocument.content.ppeRequirements.length > 0 && (
          <List.Section>
            <List.Subheader style={{ color: colors.text }}>
              PPE Requirements
            </List.Subheader>
            <Surface style={[styles.listCard, { backgroundColor: colors.cardBg }]} elevation={1}>
              {sciDocument.content.ppeRequirements.map((ppeItem, index) => (
                <View key={index} style={styles.listItem}>
                  <MaterialCommunityIcons 
                    name="safety-goggles" 
                    size={20} 
                    color={colors.warning} 
                  />
                  <Text style={[styles.listItemText, { color: colors.text }]}>
                    {typeof ppeItem === 'string' ? ppeItem : (ppeItem.description || ppeItem.name || ppeItem.text || '')}
                  </Text>
                </View>
              ))}
            </Surface>
          </List.Section>
        )}

        {sciDocument.content.safetyPrecautions && sciDocument.content.safetyPrecautions.length > 0 && (
          <List.Section>
            <List.Subheader style={{ color: colors.text }}>
              Safety Precautions
            </List.Subheader>
            <Surface style={[styles.listCard, { backgroundColor: colors.cardBg }]} elevation={1}>
              {sciDocument.content.safetyPrecautions.map((precaution, index) => (
                <View key={index} style={styles.listItem}>
                  <MaterialCommunityIcons 
                    name="alert" 
                    size={20} 
                    color={colors.error} 
                  />
                  <Text style={[styles.listItemText, { color: colors.text }]}>
                    {typeof precaution === 'string' ? precaution : (precaution.description || precaution.name || precaution.text || '')}
                  </Text>
                </View>
              ))}
            </Surface>
          </List.Section>
        )}
      </ScrollView>
    );
  };

  const renderKeySanitation = () => {
    if (!sciDocument?.content) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="key" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Loading document content...
          </Text>
        </View>
      );
    }
    
    const hasContent = 
      (sciDocument.content.keyPoints?.length || 0) > 0 ||
      (sciDocument.content.applicationEquipment?.length || 0) > 0 ||
      (sciDocument.content.ppeRequirements?.length || 0) > 0 ||
      (sciDocument.content.safetyPrecautions?.length || 0) > 0;

    if (!hasContent) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="key" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No safety and equipment information available
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        {/* Key Sanitation Points */}
        {sciDocument.content.keyPoints && sciDocument.content.keyPoints.length > 0 && (
          <List.Section>
            <List.Subheader style={{ color: colors.text }}>
              Key Sanitation Points
            </List.Subheader>
            {sciDocument.content.keyPoints.map((point, index) => (
              <Surface 
                key={index} 
                style={[styles.pointCard, { backgroundColor: colors.cardBg }]}
                elevation={1}
              >
                <View style={styles.pointHeader}>
                  <MaterialCommunityIcons 
                    name="checkbox-marked-circle" 
                    size={24} 
                    color={colors.success} 
                  />
                  <Text style={[styles.pointTitle, { color: colors.text }]}>
                    {point.point}
                  </Text>
                </View>
                {point.importance && (
                  <Text style={[styles.pointImportance, { color: colors.warning }]}>
                    Importance: {point.importance}
                  </Text>
                )}
              </Surface>
            ))}
          </List.Section>
        )}

        {/* Application Equipment */}
        {sciDocument.content.applicationEquipment && sciDocument.content.applicationEquipment.length > 0 && (
          <List.Section>
            <List.Subheader style={{ color: colors.text }}>
              Application Equipment
            </List.Subheader>
            <Surface style={[styles.listCard, { backgroundColor: colors.cardBg }]} elevation={1}>
              {sciDocument.content.applicationEquipment.map((item, index) => (
                <View key={index} style={styles.listItem}>
                  <MaterialCommunityIcons 
                    name="tools" 
                    size={20} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.listItemText, { color: colors.text }]}>
                    {typeof item === 'string' ? item : (item.description || item.name || item.text || '')}
                  </Text>
                </View>
              ))}
            </Surface>
          </List.Section>
        )}

        {/* Cleaning Instructions */}
        {sciDocument.content.cleaningInstructions && sciDocument.content.cleaningInstructions.length > 0 && (
          <List.Section>
            <List.Subheader style={{ color: colors.text }}>
              Cleaning Instructions
            </List.Subheader>
            {sciDocument.content.cleaningInstructions.map((instructionGroup, groupIndex) => {
              // Handle nested structure where each item might have a "Cleaning Steps" array
              const steps = instructionGroup['Cleaning Steps'] || instructionGroup.cleaningSteps || [];
              const title = instructionGroup.Title || instructionGroup.title || `Instructions ${groupIndex + 1}`;
              const description = instructionGroup.Description || instructionGroup.description || '';
              
              // If it's just a string, render it directly
              if (typeof instructionGroup === 'string') {
                return (
                  <Surface key={groupIndex} style={[styles.instructionsCard, { backgroundColor: colors.cardBg }]} elevation={1}>
                    <View style={styles.instructionItem}>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primary} />
                      <Text style={[styles.instructionText, { color: colors.text }]}>
                        {instructionGroup}
                      </Text>
                    </View>
                  </Surface>
                );
              }
              
              // If it has nested steps, render them
              if (steps.length > 0) {
                return (
                  <Surface key={groupIndex} style={[styles.instructionsCard, { backgroundColor: colors.cardBg, marginBottom: 12 }]} elevation={1}>
                    {title && (
                      <View style={styles.instructionHeader}>
                        <Text style={[styles.instructionTitle, { color: colors.text }]}>{title}</Text>
                        {description && (
                          <Text style={[styles.instructionDesc, { color: colors.textSecondary }]}>{description}</Text>
                        )}
                      </View>
                    )}
                    <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
                      {steps.map((step, stepIndex) => (
                        <View key={stepIndex} style={styles.instructionStep}>
                          <View style={[styles.stepBullet, { backgroundColor: colors.primary }]}>
                            <Text style={styles.stepBulletText}>{stepIndex + 1}</Text>
                          </View>
                          <Text style={[styles.instructionStepText, { color: colors.text }]}>
                            {typeof step === 'string' ? step : (step.text || step.description || '')}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>
                  </Surface>
                );
              }
              
              // Otherwise render as a simple item
              return (
                <Surface key={groupIndex} style={[styles.instructionsCard, { backgroundColor: colors.cardBg }]} elevation={1}>
                  <View style={styles.instructionItem}>
                    <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                    <Text style={[styles.instructionText, { color: colors.text }]}>
                      {instructionGroup.text || instructionGroup.description || instructionGroup.instruction || ''}
                    </Text>
                  </View>
                </Surface>
              );
            })}
          </List.Section>
        )}

        {/* Equipment Color Coding */}
        {sciDocument.content.equipmentColorCoding && sciDocument.content.equipmentColorCoding.length > 0 && (
          <List.Section>
            <List.Subheader style={{ color: colors.text }}>
              Equipment Color Coding
            </List.Subheader>
            <Surface style={[styles.colorCodingCard, { backgroundColor: colors.cardBg }]} elevation={1}>
              {sciDocument.content.equipmentColorCoding.map((item, index) => (
                <View key={index} style={styles.colorCodeItem}>
                  <View style={[styles.colorDot, { 
                    backgroundColor: item.color || item.colorCode || '#666' 
                  }]} />
                  <View style={styles.colorCodeInfo}>
                    <Text style={[styles.colorCodeLabel, { color: colors.text }]}>
                      {typeof item === 'string' 
                        ? item 
                        : (item.equipment || item.name || item.area || 'Equipment')}
                    </Text>
                    {item.description && (
                      <Text style={[styles.colorCodeDesc, { color: colors.textSecondary }]}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Surface>
          </List.Section>
        )}
      </ScrollView>
    );
  };

  const renderInspectionPoints = () => {
    if (!sciDocument?.content?.postCleaningInspections) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="clipboard-check" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No inspection points available
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <List.Section>
          <List.Subheader style={{ color: colors.text }}>
            Post Cleaning Inspection Points
          </List.Subheader>
          {sciDocument.content.postCleaningInspections.map((inspection, index) => (
            <Surface 
              key={index} 
              style={[styles.inspectionCard, { backgroundColor: colors.cardBg }]}
              elevation={1}
            >
              <View style={styles.inspectionHeader}>
                <MaterialCommunityIcons 
                  name="magnify" 
                  size={24} 
                  color={colors.primary} 
                />
                <Text style={[styles.inspectionItem, { color: colors.text }]}>
                  {typeof inspection === 'string' 
                    ? inspection 
                    : (inspection.item || inspection.name || inspection.description || 'Inspection Point')}
                </Text>
              </View>
              {(inspection.criteria || inspection.acceptanceCriteria) && (
                <Text style={[styles.inspectionCriteria, { color: colors.textSecondary }]}>
                  Criteria: {inspection.criteria || inspection.acceptanceCriteria || ''}
                </Text>
              )}
              {inspection.acceptanceLevel && (
                <View style={[styles.acceptanceLevel, { backgroundColor: colors.success + '20' }]}>
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={16} 
                    color={colors.success} 
                  />
                  <Text style={[styles.acceptanceText, { color: colors.success }]}>
                    {inspection.acceptanceLevel}
                  </Text>
                </View>
              )}
              {/* Image placeholder or actual image */}
              <View style={styles.imageContainer}>
                {(inspection.imageUrl || inspection.image) ? (
                  <Image 
                    source={{ uri: inspection.imageUrl || inspection.image }}
                    style={styles.inspectionImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Surface style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]} elevation={1}>
                    <MaterialCommunityIcons 
                      name="image-plus" 
                      size={32} 
                      color={colors.textSecondary} 
                    />
                    <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 4 }}>
                      No image available
                    </Text>
                  </Surface>
                )}
              </View>
            </Surface>
          ))}
        </List.Section>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'cleaning':
        return renderCleaningSteps();
      case 'sanitation':
        return renderKeySanitation();
      case 'inspection':
        return renderInspectionPoints();
      default:
        return null;
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      >
        <Surface style={[styles.modal, { backgroundColor: colors.surface }]} elevation={3}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="file-document" size={24} color={colors.primary} />
              <View style={styles.headerText}>
                <Text variant="titleLarge" style={{ color: colors.text }}>
                  SCI Reference
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {itemName} - {sciDocument?.documentNumber || 'Loading...'}
                </Text>
              </View>
            </View>
            <IconButton
              icon="close"
              size={24}
              iconColor={colors.text}
              onPress={onDismiss}
            />
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <SegmentedButtons
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabValue)}
              buttons={[
                {
                  value: 'cleaning',
                  label: 'Cleaning Steps',
                  icon: 'broom',
                },
                {
                  value: 'sanitation',
                  label: 'Key Sanitation',
                  icon: 'key',
                },
                {
                  value: 'inspection',
                  label: 'Inspection Points',
                  icon: 'clipboard-check',
                },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading SCI document...
                </Text>
              </View>
            ) : (
              renderContent()
            )}
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 600,
    height: '90%',
    maxHeight: Dimensions.get('window').height * 0.85,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  tabContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    // Styles for segmented buttons
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: 'center',
  },
  stepCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  stepDescription: {
    marginLeft: 40,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 40,
    gap: 8,
  },
  chip: {
    height: 28,
  },
  listCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  listItemText: {
    marginLeft: 12,
    flex: 1,
  },
  pointCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  pointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pointTitle: {
    marginLeft: 12,
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  pointImportance: {
    marginLeft: 36,
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
  },
  inspectionCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  inspectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionItem: {
    marginLeft: 12,
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  inspectionCriteria: {
    marginLeft: 36,
    lineHeight: 20,
  },
  acceptanceLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 36,
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  acceptanceText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  imageContainer: {
    marginTop: 12,
    marginLeft: 36,
  },
  stepImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  inspectionImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  imagePlaceholder: {
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  instructionsCard: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  instructionText: {
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  instructionHeader: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  stepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepBulletText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  instructionStepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  colorCodingCard: {
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  colorCodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorCodeInfo: {
    flex: 1,
  },
  colorCodeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorCodeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
});