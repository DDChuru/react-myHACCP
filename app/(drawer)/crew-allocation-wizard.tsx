import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Pressable,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  Portal,
  Modal,
  Searchbar,
  Chip,
  useTheme,
  Surface,
  IconButton,
  SegmentedButtons,
  Divider,
  RadioButton,
  Checkbox,
  ProgressBar,
  Avatar,
  List,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import CrewMemberService from '../../services/CrewMemberService';
import { CrewMemberModel } from '../../types/crewMember';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';

// Allocation type matching Firestore structure
interface CrewAllocation {
  id?: string;
  crewMemberId: string;
  crewMemberName: string;
  areaId: string;
  areaName: string;
  siteId: string;
  assignmentType: 'primary' | 'secondary' | 'backup' | 'temporary';
  shift: 'morning' | 'afternoon' | 'night' | 'rotating';
  notes?: string;
  companyId: string;
  createdAt?: Date | Timestamp;
  createdBy: string;
}

// Site Area interface matching Firestore
interface SiteArea {
  id: string;
  name: string;
  siteId: string;
  barcode?: string;
  description?: string;
  [key: string]: any;
}

type WizardStep = 'choose-mode' | 'select-primary' | 'select-secondary' | 'configure' | 'review';
type AllocationMode = 'crew-to-areas' | 'area-to-crews';

export default function CrewAllocationWizardScreen() {
  const theme = useTheme();
  const { user, userProfile } = useAuth();
  
  // Data state
  const [allocations, setAllocations] = useState<CrewAllocation[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMemberModel[]>([]);
  const [siteAreas, setSiteAreas] = useState<SiteArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('choose-mode');
  const [allocationMode, setAllocationMode] = useState<AllocationMode | null>(null);
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [assignmentType, setAssignmentType] = useState<CrewAllocation['assignmentType']>('primary');
  const [shift, setShift] = useState<CrewAllocation['shift']>('morning');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const crewMemberService = CrewMemberService;

  useEffect(() => {
    if (userProfile?.companyId && userProfile?.siteId) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.companyId || !userProfile?.siteId) return;
    
    setLoading(true);
    try {
      // Load site areas
      const areasRef = collection(db, `companies/${userProfile.companyId}/siteAreas`);
      const areasQuery = query(areasRef, where('siteId', '==', userProfile.siteId));
      const areasSnapshot = await getDocs(areasQuery);
      const siteAreasData = areasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SiteArea));
      setSiteAreas(siteAreasData);

      // Load crew members
      const crewData = await crewMemberService.getCrewMembers({ 
        siteId: userProfile.siteId 
      });
      setCrewMembers(crewData);
      
      // Load existing allocations
      const allocationsRef = collection(db, `companies/${userProfile.companyId}/crewAllocations`);
      const allocationsQuery = query(allocationsRef, where('siteId', '==', userProfile.siteId));
      const snapshot = await getDocs(allocationsQuery);
      const allocationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CrewAllocation));
      setAllocations(allocationsData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setWizardStep('choose-mode');
    setAllocationMode(null);
    setSelectedCrew([]);
    setSelectedAreas([]);
    setAssignmentType('primary');
    setShift('morning');
    setNotes('');
    setSearchQuery('');
  };

  const handleNext = () => {
    switch (wizardStep) {
      case 'choose-mode':
        if (!allocationMode) {
          Alert.alert('Select Mode', 'Please choose how you want to create allocations');
          return;
        }
        setWizardStep('select-primary');
        break;
        
      case 'select-primary':
        const primarySelection = allocationMode === 'crew-to-areas' ? selectedCrew : selectedAreas;
        if (primarySelection.length === 0) {
          Alert.alert('Select Items', `Please select at least one ${allocationMode === 'crew-to-areas' ? 'crew member' : 'area'}`);
          return;
        }
        setWizardStep('select-secondary');
        break;
        
      case 'select-secondary':
        const secondarySelection = allocationMode === 'crew-to-areas' ? selectedAreas : selectedCrew;
        if (secondarySelection.length === 0) {
          Alert.alert('Select Items', `Please select at least one ${allocationMode === 'crew-to-areas' ? 'area' : 'crew member'}`);
          return;
        }
        setWizardStep('configure');
        break;
        
      case 'configure':
        setWizardStep('review');
        break;
        
      case 'review':
        handleCreateAllocations();
        break;
    }
  };

  const handleBack = () => {
    switch (wizardStep) {
      case 'select-primary':
        setWizardStep('choose-mode');
        break;
      case 'select-secondary':
        setWizardStep('select-primary');
        break;
      case 'configure':
        setWizardStep('select-secondary');
        break;
      case 'review':
        setWizardStep('configure');
        break;
    }
  };

  const handleCreateAllocations = async () => {
    try {
      setLoading(true);
      const batch = writeBatch(db);
      const allocationsRef = collection(db, `companies/${userProfile?.companyId}/crewAllocations`);
      
      // Create all combinations
      const combinations: CrewAllocation[] = [];
      
      for (const crewId of selectedCrew) {
        const crew = crewMembers.find(c => c.id === crewId);
        
        for (const areaId of selectedAreas) {
          const area = siteAreas.find(a => a.id === areaId);
          
          const newAllocation: CrewAllocation = {
            crewMemberId: crewId,
            crewMemberName: crew?.fullName || '',
            areaId: areaId,
            areaName: area?.name || '',
            siteId: userProfile?.siteId || '',
            assignmentType,
            shift,
            notes,
            companyId: userProfile?.companyId || '',
            createdBy: user?.uid || '',
            createdAt: Timestamp.now(),
          };
          
          combinations.push(newAllocation);
          const docRef = doc(allocationsRef);
          batch.set(docRef, { ...newAllocation, id: docRef.id });
        }
      }
      
      await batch.commit();
      
      Alert.alert(
        'Success', 
        `Created ${combinations.length} allocation${combinations.length > 1 ? 's' : ''}`,
        [{ text: 'OK', onPress: () => {
          setShowWizard(false);
          resetWizard();
          loadData();
        }}]
      );
      
    } catch (error) {
      console.error('Error creating allocations:', error);
      Alert.alert('Error', 'Failed to create allocations');
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    const steps = ['choose-mode', 'select-primary', 'select-secondary', 'configure', 'review'];
    const currentIndex = steps.indexOf(wizardStep);
    return (currentIndex + 1) / steps.length;
  };

  const getStepTitle = () => {
    switch (wizardStep) {
      case 'choose-mode': return 'Choose Allocation Mode';
      case 'select-primary': 
        return allocationMode === 'crew-to-areas' ? 'Select Crew Members' : 'Select Areas';
      case 'select-secondary':
        return allocationMode === 'crew-to-areas' ? 'Select Areas' : 'Select Crew Members';
      case 'configure': return 'Configure Assignment';
      case 'review': return 'Review & Confirm';
      default: return '';
    }
  };

  const renderWizardContent = () => {
    switch (wizardStep) {
      case 'choose-mode':
        return (
          <View style={styles.wizardContent}>
            <Text variant="bodyLarge" style={styles.instructionText}>
              How would you like to create allocations?
            </Text>
            
            <Card 
              style={[
                styles.modeCard,
                allocationMode === 'crew-to-areas' && styles.selectedCard
              ]}
              onPress={() => setAllocationMode('crew-to-areas')}
            >
              <Card.Content style={styles.modeCardContent}>
                <MaterialCommunityIcons 
                  name="account-arrow-right" 
                  size={48} 
                  color={allocationMode === 'crew-to-areas' ? theme.colors.primary : theme.colors.onSurface}
                />
                <Text variant="titleMedium" style={styles.modeTitle}>
                  Assign Crew to Areas
                </Text>
                <Text variant="bodySmall" style={styles.modeDescription}>
                  Select crew members first, then assign them to multiple areas
                </Text>
              </Card.Content>
            </Card>
            
            <Card 
              style={[
                styles.modeCard,
                allocationMode === 'area-to-crews' && styles.selectedCard
              ]}
              onPress={() => setAllocationMode('area-to-crews')}
            >
              <Card.Content style={styles.modeCardContent}>
                <MaterialCommunityIcons 
                  name="map-marker-multiple" 
                  size={48} 
                  color={allocationMode === 'area-to-crews' ? theme.colors.primary : theme.colors.onSurface}
                />
                <Text variant="titleMedium" style={styles.modeTitle}>
                  Assign Areas to Crew
                </Text>
                <Text variant="bodySmall" style={styles.modeDescription}>
                  Select areas first, then assign multiple crew members to them
                </Text>
              </Card.Content>
            </Card>
            
            {allocationMode && (
              <Text variant="bodySmall" style={styles.selectionHint}>
                ✓ {allocationMode === 'crew-to-areas' ? 'Crew to Areas' : 'Areas to Crew'} selected
              </Text>
            )}
          </View>
        );

      case 'select-primary':
        const isPrimaryCrewSelection = allocationMode === 'crew-to-areas';
        const primaryItems = isPrimaryCrewSelection ? crewMembers : siteAreas;
        const primarySelected = isPrimaryCrewSelection ? selectedCrew : selectedAreas;
        const filteredPrimary = primaryItems.filter(item => {
          const name = isPrimaryCrewSelection 
            ? (item as CrewMemberModel).fullName 
            : (item as SiteArea).name;
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        });

        return (
          <View style={styles.wizardContent}>
            <Searchbar
              placeholder={`Search ${isPrimaryCrewSelection ? 'crew members' : 'areas'}...`}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            
            <Text variant="bodyMedium" style={styles.selectionCount}>
              {primarySelected.length} selected
            </Text>
            
            <ScrollView style={styles.selectionList}>
              {filteredPrimary.map(item => {
                const isSelected = primarySelected.includes(item.id);
                const name = isPrimaryCrewSelection 
                  ? (item as CrewMemberModel).fullName 
                  : (item as SiteArea).name;
                const subtitle = isPrimaryCrewSelection 
                  ? (item as CrewMemberModel).position 
                  : (item as SiteArea).barcode;
                
                return (
                  <List.Item
                    key={item.id}
                    title={name}
                    description={subtitle}
                    left={props => isPrimaryCrewSelection ? (
                      <Avatar.Text 
                        {...props} 
                        size={40} 
                        label={name.split(' ').map(n => n[0]).join('')}
                      />
                    ) : (
                      <List.Icon {...props} icon="map-marker" />
                    )}
                    right={() => (
                      <Checkbox
                        status={isSelected ? 'checked' : 'unchecked'}
                        onPress={() => {
                          if (isPrimaryCrewSelection) {
                            setSelectedCrew(prev =>
                              isSelected 
                                ? prev.filter(id => id !== item.id)
                                : [...prev, item.id]
                            );
                          } else {
                            setSelectedAreas(prev =>
                              isSelected 
                                ? prev.filter(id => id !== item.id)
                                : [...prev, item.id]
                            );
                          }
                        }}
                      />
                    )}
                    style={[
                      styles.selectionItem,
                      isSelected && styles.selectedItem
                    ]}
                  />
                );
              })}
            </ScrollView>
          </View>
        );

      case 'select-secondary':
        const isSecondaryCrewSelection = allocationMode === 'area-to-crews';
        const secondaryItems = isSecondaryCrewSelection ? crewMembers : siteAreas;
        const secondarySelected = isSecondaryCrewSelection ? selectedCrew : selectedAreas;
        const filteredSecondary = secondaryItems.filter(item => {
          const name = isSecondaryCrewSelection 
            ? (item as CrewMemberModel).fullName 
            : (item as SiteArea).name;
          return name.toLowerCase().includes(searchQuery.toLowerCase());
        });

        return (
          <View style={styles.wizardContent}>
            <Searchbar
              placeholder={`Search ${isSecondaryCrewSelection ? 'crew members' : 'areas'}...`}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
            />
            
            <Text variant="bodyMedium" style={styles.selectionCount}>
              {secondarySelected.length} selected
            </Text>
            
            <ScrollView style={styles.selectionList}>
              {filteredSecondary.map(item => {
                const isSelected = secondarySelected.includes(item.id);
                const name = isSecondaryCrewSelection 
                  ? (item as CrewMemberModel).fullName 
                  : (item as SiteArea).name;
                const subtitle = isSecondaryCrewSelection 
                  ? (item as CrewMemberModel).position 
                  : (item as SiteArea).barcode;
                
                return (
                  <List.Item
                    key={item.id}
                    title={name}
                    description={subtitle}
                    left={props => isSecondaryCrewSelection ? (
                      <Avatar.Text 
                        {...props} 
                        size={40} 
                        label={name.split(' ').map(n => n[0]).join('')}
                      />
                    ) : (
                      <List.Icon {...props} icon="map-marker" />
                    )}
                    right={() => (
                      <Checkbox
                        status={isSelected ? 'checked' : 'unchecked'}
                        onPress={() => {
                          if (isSecondaryCrewSelection) {
                            setSelectedCrew(prev =>
                              isSelected 
                                ? prev.filter(id => id !== item.id)
                                : [...prev, item.id]
                            );
                          } else {
                            setSelectedAreas(prev =>
                              isSelected 
                                ? prev.filter(id => id !== item.id)
                                : [...prev, item.id]
                            );
                          }
                        }}
                      />
                    )}
                    style={[
                      styles.selectionItem,
                      isSelected && styles.selectedItem
                    ]}
                  />
                );
              })}
            </ScrollView>
          </View>
        );

      case 'configure':
        return (
          <View style={styles.wizardContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Assignment Type
            </Text>
            <RadioButton.Group
              onValueChange={value => setAssignmentType(value as any)}
              value={assignmentType}
            >
              <RadioButton.Item label="Primary" value="primary" labelStyle={styles.radioLabel} />
              <RadioButton.Item label="Secondary" value="secondary" labelStyle={styles.radioLabel} />
              <RadioButton.Item label="Backup" value="backup" labelStyle={styles.radioLabel} />
              <RadioButton.Item label="Temporary" value="temporary" labelStyle={styles.radioLabel} />
            </RadioButton.Group>

            <Divider style={styles.divider} />

            <Text variant="titleMedium" style={styles.sectionTitle}>
              Shift
            </Text>
            <RadioButton.Group
              onValueChange={value => setShift(value as any)}
              value={shift}
            >
              <RadioButton.Item label="Morning" value="morning" labelStyle={styles.radioLabel} />
              <RadioButton.Item label="Afternoon" value="afternoon" labelStyle={styles.radioLabel} />
              <RadioButton.Item label="Night" value="night" labelStyle={styles.radioLabel} />
              <RadioButton.Item label="Rotating" value="rotating" labelStyle={styles.radioLabel} />
            </RadioButton.Group>
          </View>
        );

      case 'review':
        const totalAllocations = selectedCrew.length * selectedAreas.length;
        
        return (
          <View style={styles.wizardContent}>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text variant="titleLarge" style={styles.summaryTitle}>
                  Allocation Summary
                </Text>
                
                <View style={styles.summaryRow}>
                  <Text variant="bodyLarge">Total Allocations:</Text>
                  <Text variant="titleMedium" style={styles.summaryValue}>
                    {totalAllocations}
                  </Text>
                </View>
                
                <Divider style={styles.divider} />
                
                <Text variant="titleSmall" style={styles.summarySubtitle}>
                  Crew Members ({selectedCrew.length})
                </Text>
                {selectedCrew.map(id => {
                  const crew = crewMembers.find(c => c.id === id);
                  return (
                    <Chip key={id} style={styles.summaryChip}>
                      {crew?.fullName}
                    </Chip>
                  );
                })}
                
                <Text variant="titleSmall" style={[styles.summarySubtitle, { marginTop: 12 }]}>
                  Areas ({selectedAreas.length})
                </Text>
                {selectedAreas.map(id => {
                  const area = siteAreas.find(a => a.id === id);
                  return (
                    <Chip key={id} style={styles.summaryChip}>
                      {area?.name}
                    </Chip>
                  );
                })}
                
                <Divider style={styles.divider} />
                
                <View style={styles.summaryDetails}>
                  <Text variant="bodyMedium">
                    <Text style={styles.labelText}>Type:</Text> {assignmentType}
                  </Text>
                  <Text variant="bodyMedium">
                    <Text style={styles.labelText}>Shift:</Text> {shift}
                  </Text>
                </View>
              </Card.Content>
            </Card>
            
            <Text variant="bodySmall" style={styles.confirmText}>
              This will create {totalAllocations} allocation{totalAllocations > 1 ? 's' : ''} in the system
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  const renderAllocationsList = () => {
    const groupedAllocations: { [key: string]: CrewAllocation[] } = {};
    
    allocations.forEach(allocation => {
      const key = allocation.areaName;
      if (!groupedAllocations[key]) {
        groupedAllocations[key] = [];
      }
      groupedAllocations[key].push(allocation);
    });

    return (
      <ScrollView style={styles.container}>
        {Object.entries(groupedAllocations).map(([areaName, areaAllocations]) => (
          <Card key={areaName} style={styles.areaCard}>
            <Card.Title 
              title={areaName}
              subtitle={`${areaAllocations.length} crew assigned`}
              left={(props) => <Avatar.Icon {...props} icon="map-marker" />}
            />
            <Card.Content>
              {areaAllocations.map(allocation => (
                <View key={allocation.id} style={styles.allocationItem}>
                  <View style={styles.allocationInfo}>
                    <Text variant="bodyMedium">{allocation.crewMemberName}</Text>
                    <View style={styles.allocationTags}>
                      <Chip compact style={styles.tag}>{allocation.assignmentType}</Chip>
                      <Chip compact style={styles.tag}>{allocation.shift}</Chip>
                    </View>
                  </View>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={async () => {
                      Alert.alert(
                        'Delete Allocation',
                        'Are you sure?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              if (allocation.id) {
                                await deleteDoc(doc(db, `companies/${userProfile?.companyId}/crewAllocations`, allocation.id));
                                loadData();
                              }
                            }
                          }
                        ]
                      );
                    }}
                  />
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}
        
        {allocations.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group-outline" size={64} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              No allocations yet
            </Text>
            <Button mode="contained" onPress={() => setShowWizard(true)} style={styles.emptyButton}>
              Create Allocations
            </Button>
          </View>
        )}
      </ScrollView>
    );
  };

  if (loading && allocations.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="titleMedium">Crew Allocations</Text>
        <Text variant="bodySmall" style={styles.headerSubtitle}>
          {allocations.length} total | {crewMembers.length} crew | {siteAreas.length} areas
        </Text>
      </Surface>

      {renderAllocationsList()}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowWizard(true)}
      />

      <Portal>
        <Modal
          visible={showWizard}
          onDismiss={() => {
            setShowWizard(false);
            resetWizard();
          }}
          contentContainerStyle={styles.wizardModal}
        >
          <Surface style={styles.wizardContainer}>
            <View style={styles.wizardHeader}>
              <IconButton
                icon="close"
                onPress={() => {
                  setShowWizard(false);
                  resetWizard();
                }}
              />
              <Text variant="titleLarge" style={styles.wizardTitle}>
                {getStepTitle()}
              </Text>
              <View style={{ width: 48 }} />
            </View>
            
            <ProgressBar progress={getStepProgress()} style={styles.progressBar} />
            
            <ScrollView 
              style={styles.wizardScrollView}
              contentContainerStyle={styles.wizardScrollContent}
              showsVerticalScrollIndicator={true}
            >
              {renderWizardContent()}
            </ScrollView>
            
            <View style={styles.wizardFooter}>
              {wizardStep !== 'choose-mode' && (
                <Button 
                  mode="outlined" 
                  onPress={handleBack}
                  style={styles.footerButton}
                >
                  Back
                </Button>
              )}
              
              <Button 
                mode="contained" 
                onPress={handleNext}
                style={styles.footerButton}
                loading={loading}
              >
                {wizardStep === 'review' ? 'Create Allocations' : 'Next'}
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  areaCard: {
    margin: 16,
    marginBottom: 8,
  },
  allocationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  allocationInfo: {
    flex: 1,
  },
  allocationTags: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tag: {
    marginRight: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
  },
  
  // Wizard styles
  wizardModal: {
    margin: 20,
    flex: 1,
    justifyContent: 'center',
  },
  wizardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  wizardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  wizardTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#000',
  },
  progressBar: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  wizardScrollView: {
    flex: 1,
  },
  wizardScrollContent: {
    flexGrow: 1,
  },
  wizardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  wizardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  footerButton: {
    minWidth: 100,
  },
  
  // Step: Choose Mode
  instructionText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
    fontSize: 14,
  },
  modeCard: {
    marginBottom: 12,
    elevation: 1,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  modeCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  modeTitle: {
    marginTop: 8,
    marginBottom: 4,
    color: '#000',
    fontSize: 16,
  },
  modeDescription: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
  },
  selectionHint: {
    textAlign: 'center',
    color: '#4caf50',
    marginTop: 12,
    fontWeight: '600',
  },
  
  // Step: Selection
  searchBar: {
    marginBottom: 12,
  },
  selectionCount: {
    marginBottom: 8,
    color: '#666',
  },
  selectionList: {
    flex: 1,
  },
  selectionItem: {
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 8,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
  },
  
  // Step: Configure
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    color: '#000',
  },
  radioLabel: {
    color: '#000',
  },
  divider: {
    marginVertical: 16,
  },
  
  // Step: Review
  summaryCard: {
    marginBottom: 16,
  },
  summaryTitle: {
    marginBottom: 16,
    color: '#000',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryValue: {
    color: '#6200ee',
  },
  summarySubtitle: {
    marginTop: 12,
    marginBottom: 8,
    color: '#666',
  },
  summaryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  summaryDetails: {
    marginTop: 12,
  },
  labelText: {
    fontWeight: 'bold',
  },
  confirmText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});