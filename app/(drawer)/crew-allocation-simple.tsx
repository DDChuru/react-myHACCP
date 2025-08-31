import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
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
  TextInput,
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
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';

// Simplified allocation type
interface SimpleAllocation {
  id?: string;
  crewMemberId: string;
  crewMemberName: string;
  areaName: string; // Free text input instead of selecting from list
  assignmentType: 'primary' | 'secondary' | 'backup' | 'temporary';
  shift: 'morning' | 'afternoon' | 'night' | 'rotating';
  workDays?: string[];
  notes?: string;
  companyId: string;
  createdAt?: Date | Timestamp;
  createdBy: string;
}

// Predefined areas for quick selection
const COMMON_AREAS = [
  'Kitchen',
  'Prep Area',
  'Cold Storage',
  'Dry Storage',
  'Receiving Area',
  'Dining Area',
  'Restrooms',
  'Office',
  'Production Line 1',
  'Production Line 2',
  'Packaging Area',
  'Shipping Dock',
  'Quality Control Lab',
  'Break Room',
  'Equipment Room',
];

export default function CrewAllocationSimpleScreen() {
  const theme = useTheme();
  const { user, userProfile } = useAuth();
  
  // State
  const [allocations, setAllocations] = useState<SimpleAllocation[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMemberModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'by-crew' | 'by-area'>('list');
  
  // Form state
  const [formData, setFormData] = useState<Partial<SimpleAllocation>>({
    assignmentType: 'primary',
    shift: 'morning',
    areaName: '',
  });
  const [customArea, setCustomArea] = useState('');
  
  const crewMemberService = CrewMemberService;

  useEffect(() => {
    if (userProfile?.companyId) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.companyId) return;
    
    setLoading(true);
    try {
      // Load crew members
      const crewData = await crewMemberService.getCrewMembers({ 
        siteId: userProfile?.siteId 
      });
      setCrewMembers(crewData);
      
      // Load allocations
      const allocationsRef = collection(db, `companies/${userProfile.companyId}/crewAllocations`);
      const snapshot = await getDocs(allocationsRef);
      const allocationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SimpleAllocation));
      setAllocations(allocationsData);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAllocation = async () => {
    if (!formData.crewMemberId || !formData.areaName) {
      Alert.alert('Error', 'Please select crew member and enter area name');
      return;
    }

    try {
      const crew = crewMembers.find(c => c.id === formData.crewMemberId);
      
      const newAllocation: SimpleAllocation = {
        ...formData as SimpleAllocation,
        crewMemberName: crew?.fullName || '',
        companyId: userProfile?.companyId || '',
        createdBy: user?.uid || '',
        createdAt: Timestamp.now(),
      };
      
      const allocationsRef = collection(db, `companies/${userProfile?.companyId}/crewAllocations`);
      await addDoc(allocationsRef, newAllocation);
      
      Alert.alert('Success', 'Allocation created successfully');
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating allocation:', error);
      Alert.alert('Error', 'Failed to create allocation');
    }
  };

  const handleDeleteAllocation = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this allocation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, `companies/${userProfile?.companyId}/crewAllocations`, id));
              Alert.alert('Success', 'Allocation deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete allocation');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      assignmentType: 'primary',
      shift: 'morning',
      areaName: '',
    });
    setCustomArea('');
  };

  const renderAllocationCard = (allocation: SimpleAllocation) => {
    return (
      <Card key={allocation.id} style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {allocation.crewMemberName}
              </Text>
              <Text variant="bodyMedium" style={styles.areaText}>
                📍 {allocation.areaName}
              </Text>
            </View>
            <IconButton
              icon="delete"
              iconColor={theme.colors.error}
              size={20}
              onPress={() => allocation.id && handleDeleteAllocation(allocation.id)}
            />
          </View>
          
          <View style={styles.chipContainer}>
            <Chip mode="flat" compact style={styles.chip}>
              {allocation.assignmentType}
            </Chip>
            <Chip mode="outlined" compact style={styles.chip}>
              {allocation.shift}
            </Chip>
          </View>
          
          {allocation.notes && (
            <Text variant="bodySmall" style={styles.notes}>
              Note: {allocation.notes}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  const getGroupedData = () => {
    if (viewMode === 'by-crew') {
      const grouped: { [key: string]: SimpleAllocation[] } = {};
      allocations.forEach(allocation => {
        if (!grouped[allocation.crewMemberName]) {
          grouped[allocation.crewMemberName] = [];
        }
        grouped[allocation.crewMemberName].push(allocation);
      });
      return grouped;
    } else if (viewMode === 'by-area') {
      const grouped: { [key: string]: SimpleAllocation[] } = {};
      allocations.forEach(allocation => {
        if (!grouped[allocation.areaName]) {
          grouped[allocation.areaName] = [];
        }
        grouped[allocation.areaName].push(allocation);
      });
      return grouped;
    }
    return null;
  };

  const renderGroupedView = () => {
    const grouped = getGroupedData();
    if (!grouped) return null;

    return (
      <ScrollView style={styles.scrollView}>
        {Object.entries(grouped).map(([key, items]) => (
          <View key={key} style={styles.groupSection}>
            <Text variant="titleMedium" style={styles.groupTitle}>
              {viewMode === 'by-crew' ? `👤 ${key}` : `📍 ${key}`}
            </Text>
            <Text variant="bodySmall" style={styles.groupCount}>
              {items.length} allocation{items.length !== 1 ? 's' : ''}
            </Text>
            {items.map(item => (
              <View key={item.id} style={styles.groupItem}>
                <Text variant="bodyMedium">
                  {viewMode === 'by-crew' ? `📍 ${item.areaName}` : `👤 ${item.crewMemberName}`}
                </Text>
                <View style={styles.groupItemChips}>
                  <Chip mode="flat" compact style={styles.miniChip}>
                    {item.shift}
                  </Chip>
                  <Chip mode="outlined" compact style={styles.miniChip}>
                    {item.assignmentType}
                  </Chip>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading allocations...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Searchbar
          placeholder="Search crew or area..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <SegmentedButtons
          value={viewMode}
          onValueChange={value => setViewMode(value as any)}
          buttons={[
            { value: 'list', label: 'List' },
            { value: 'by-crew', label: 'By Crew' },
            { value: 'by-area', label: 'By Area' },
          ]}
          style={styles.segmentedButtons}
        />
      </Surface>

      {viewMode === 'list' ? (
        <FlatList
          data={allocations.filter(a => 
            a.crewMemberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.areaName.toLowerCase().includes(searchQuery.toLowerCase())
          )}
          renderItem={({ item }) => renderAllocationCard(item)}
          keyExtractor={item => item.id || ''}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="account-group-outline" 
                size={64} 
                color={theme.colors.outline} 
              />
              <Text variant="bodyLarge" style={styles.emptyText}>
                No allocations yet
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Tap the + button to assign crew members to areas
              </Text>
            </View>
          }
        />
      ) : (
        renderGroupedView()
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowModal(true)}
      />

      {/* Create Allocation Modal */}
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => {
            setShowModal(false);
            resetForm();
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              New Crew Allocation
            </Text>

            <Text variant="labelLarge" style={styles.label}>Select Crew Member</Text>
            <RadioButton.Group
              onValueChange={value => setFormData(prev => ({ ...prev, crewMemberId: value }))}
              value={formData.crewMemberId || ''}
            >
              {crewMembers.map(crew => (
                <RadioButton.Item
                  key={crew.id}
                  label={`${crew.fullName} ${crew.position ? `(${crew.position})` : ''}`}
                  value={crew.id}
                />
              ))}
            </RadioButton.Group>

            <Text variant="labelLarge" style={styles.label}>Select Area</Text>
            <View style={styles.areaSelection}>
              {COMMON_AREAS.slice(0, 6).map(area => (
                <Chip
                  key={area}
                  mode={formData.areaName === area ? 'flat' : 'outlined'}
                  onPress={() => setFormData(prev => ({ ...prev, areaName: area }))}
                  style={styles.areaChip}
                >
                  {area}
                </Chip>
              ))}
            </View>
            
            <TextInput
              label="Or enter custom area"
              value={customArea}
              onChangeText={text => {
                setCustomArea(text);
                setFormData(prev => ({ ...prev, areaName: text }));
              }}
              mode="outlined"
              style={styles.input}
            />

            <Text variant="labelLarge" style={styles.label}>Assignment Type</Text>
            <RadioButton.Group
              onValueChange={value => setFormData(prev => ({ ...prev, assignmentType: value as any }))}
              value={formData.assignmentType || 'primary'}
            >
              <RadioButton.Item label="Primary" value="primary" />
              <RadioButton.Item label="Secondary" value="secondary" />
              <RadioButton.Item label="Backup" value="backup" />
              <RadioButton.Item label="Temporary" value="temporary" />
            </RadioButton.Group>

            <Text variant="labelLarge" style={styles.label}>Shift</Text>
            <RadioButton.Group
              onValueChange={value => setFormData(prev => ({ ...prev, shift: value as any }))}
              value={formData.shift || 'morning'}
            >
              <RadioButton.Item label="Morning" value="morning" />
              <RadioButton.Item label="Afternoon" value="afternoon" />
              <RadioButton.Item label="Night" value="night" />
              <RadioButton.Item label="Rotating" value="rotating" />
            </RadioButton.Group>

            <TextInput
              label="Notes (optional)"
              value={formData.notes || ''}
              onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Button 
                mode="outlined" 
                onPress={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleCreateAllocation}
              >
                Create Allocation
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  searchbar: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  areaText: {
    marginTop: 4,
    color: '#666',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  miniChip: {
    marginRight: 6,
  },
  notes: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#666',
  },
  groupSection: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  groupTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  groupCount: {
    color: '#666',
    marginBottom: 12,
  },
  groupItem: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  groupItemChips: {
    flexDirection: 'row',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: '#ffffff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '85%',
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    marginTop: 8,
  },
  areaSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  areaChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});