import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
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
  Avatar,
  SegmentedButtons,
  DataTable,
  Badge,
  Divider,
  List,
  ProgressBar,
  Menu,
  RadioButton,
  Checkbox,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { CrewAllocationService } from '../../services/CrewAllocationService';
import { CrewMemberService } from '../../services/CrewMemberService';
import {
  CrewAreaAllocation,
  CrewAllocationSummary,
  AllocationFilters,
  BulkAllocationRequest,
  TrainingProgressReport,
  SiteArea,
  ASSIGNMENT_TYPES,
  SHIFTS,
  WEEKDAYS,
} from '../../types/crewAllocation';
import { CrewMemberModel } from '../../types/crewMember';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

export default function CrewAllocationScreen() {
  const theme = useTheme();
  const { user, userProfile } = useAuth();
  
  // View modes
  const [viewMode, setViewMode] = useState<'allocations' | 'crew' | 'areas' | 'report'>('allocations');
  
  // State management
  const [allocations, setAllocations] = useState<CrewAreaAllocation[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMemberModel[]>([]);
  const [areas, setAreas] = useState<SiteArea[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected items for bulk operations
  const [selectedCrew, setSelectedCrew] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedAllocations, setSelectedAllocations] = useState<string[]>([]);
  
  // Modals
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Selected items for details
  const [selectedCrewSummary, setSelectedCrewSummary] = useState<CrewAllocationSummary | null>(null);
  const [trainingReport, setTrainingReport] = useState<TrainingProgressReport | null>(null);
  
  // Filters
  const [filters, setFilters] = useState<AllocationFilters>({
    siteId: userProfile?.siteId,
    status: 'active'
  });
  
  // Form state for new allocation
  const [newAllocation, setNewAllocation] = useState<Partial<CrewAreaAllocation>>({
    assignmentType: 'primary',
    shift: 'morning',
    status: 'active',
    isTrainedForArea: false,
  });

  // Initialize services
  const allocationService = new CrewAllocationService(
    userProfile?.companyId || '',
    user?.uid || ''
  );
  
  const crewMemberService = new CrewMemberService(
    userProfile?.companyId || '',
    user?.uid || '',
    userProfile?.role || 'viewer'
  );

  useEffect(() => {
    if (userProfile?.companyId) {
      loadData();
    }
  }, [userProfile, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load allocations
      const allocationsData = await allocationService.getAllocations(filters);
      setAllocations(allocationsData);
      
      // Load crew members
      const crewData = await crewMemberService.getCrewMembers({ 
        siteId: userProfile?.siteId 
      });
      setCrewMembers(crewData);
      
      // Load areas
      await loadAreas();
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAreas = async () => {
    if (!userProfile?.companyId || !userProfile?.siteId) return;
    
    try {
      const areasRef = collection(db, `companies/${userProfile.companyId}/siteAreas`);
      const q = query(areasRef, where('siteId', '==', userProfile.siteId));
      const snapshot = await getDocs(q);
      
      const areasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SiteArea));
      
      setAreas(areasData);
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const handleCreateAllocation = async () => {
    if (!newAllocation.crewMemberId || !newAllocation.areaId) {
      Alert.alert('Error', 'Please select crew member and area');
      return;
    }

    try {
      const crew = crewMembers.find(c => c.id === newAllocation.crewMemberId);
      const area = areas.find(a => a.id === newAllocation.areaId);
      
      await allocationService.createAllocation({
        ...newAllocation,
        crewMemberName: crew?.fullName || '',
        areaName: area?.areaName || '',
        siteId: userProfile?.siteId || '',
        startDate: new Date(),
      } as Omit<CrewAreaAllocation, 'id'>);
      
      Alert.alert('Success', 'Allocation created successfully');
      setShowAllocationModal(false);
      setNewAllocation({
        assignmentType: 'primary',
        shift: 'morning',
        status: 'active',
        isTrainedForArea: false,
      });
      loadData();
    } catch (error) {
      console.error('Error creating allocation:', error);
      Alert.alert('Error', 'Failed to create allocation');
    }
  };

  const handleBulkAllocate = async () => {
    if (selectedCrew.length === 0 || selectedAreas.length === 0) {
      Alert.alert('Error', 'Please select crew members and areas');
      return;
    }

    try {
      const request: BulkAllocationRequest = {
        crewMemberIds: selectedCrew,
        areaIds: selectedAreas,
        assignmentType: 'primary',
        startDate: new Date(),
        shift: 'morning',
        workDays: WEEKDAYS.slice(0, 5), // Monday to Friday
      };
      
      await allocationService.bulkAllocate(request);
      
      Alert.alert('Success', `Created ${selectedCrew.length * selectedAreas.length} allocations`);
      setShowBulkModal(false);
      setSelectedCrew([]);
      setSelectedAreas([]);
      loadData();
    } catch (error) {
      console.error('Error bulk allocating:', error);
      Alert.alert('Error', 'Failed to create allocations');
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
              await allocationService.deleteAllocation(id);
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

  const handleViewCrewDetails = async (crewMemberId: string) => {
    setLoading(true);
    try {
      const summary = await allocationService.getCrewSummary(crewMemberId);
      setSelectedCrewSummary(summary);
      setShowDetailsModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load crew details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!userProfile?.siteId) return;
    
    setLoading(true);
    try {
      const report = await allocationService.generateTrainingReport(userProfile.siteId);
      setTrainingReport(report);
      setShowReportModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const renderAllocationCard = (allocation: CrewAreaAllocation) => {
    const getStatusColor = () => {
      switch (allocation.status) {
        case 'active': return theme.colors.primary;
        case 'inactive': return theme.colors.outline;
        case 'pending': return theme.colors.tertiary;
        case 'expired': return theme.colors.error;
        default: return theme.colors.outline;
      }
    };

    const getTrainingStatusIcon = () => {
      if (allocation.isTrainedForArea) return 'check-circle';
      if (allocation.trainedAreaItems?.length) return 'progress-check';
      return 'alert-circle-outline';
    };

    const getTrainingStatusColor = () => {
      if (allocation.isTrainedForArea) return theme.colors.primary;
      if (allocation.trainedAreaItems?.length) return theme.colors.tertiary;
      return theme.colors.error;
    };

    return (
      <Card key={allocation.id} style={styles.card} onPress={() => {}}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {allocation.crewMemberName}
              </Text>
              <Text variant="bodyMedium" style={styles.cardSubtitle}>
                {allocation.areaName}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <IconButton
                icon={getTrainingStatusIcon()}
                iconColor={getTrainingStatusColor()}
                size={24}
                onPress={() => {}}
              />
              <IconButton
                icon="delete"
                iconColor={theme.colors.error}
                size={20}
                onPress={() => handleDeleteAllocation(allocation.id)}
              />
            </View>
          </View>

          <View style={styles.chipContainer}>
            <Chip 
              mode="flat" 
              compact
              style={[styles.chip, { backgroundColor: getStatusColor() + '20' }]}
              textStyle={{ color: getStatusColor() }}
            >
              {allocation.status}
            </Chip>
            <Chip mode="outlined" compact style={styles.chip}>
              {allocation.assignmentType}
            </Chip>
            {allocation.shift && (
              <Chip mode="outlined" compact style={styles.chip}>
                {allocation.shift}
              </Chip>
            )}
          </View>

          {allocation.trainedAreaItems && allocation.assignedAreaItemsCount && (
            <View style={styles.progressSection}>
              <Text variant="bodySmall" style={styles.progressLabel}>
                Training Progress: {allocation.trainedAreaItems.length}/{allocation.assignedAreaItemsCount} items
              </Text>
              <ProgressBar 
                progress={allocation.trainedAreaItems.length / allocation.assignedAreaItemsCount}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderCrewMemberCard = (crew: CrewMemberModel) => {
    const crewAllocations = allocations.filter(a => a.crewMemberId === crew.id);
    const primaryAreas = crewAllocations.filter(a => a.assignmentType === 'primary').length;
    const trainedAreas = crewAllocations.filter(a => a.isTrainedForArea).length;

    return (
      <Card 
        key={crew.id} 
        style={styles.card}
        onPress={() => handleViewCrewDetails(crew.id)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.crewInfo}>
              <Avatar.Text 
                size={40} 
                label={crew.fullName.split(' ').map(n => n[0]).join('')}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text variant="titleMedium">{crew.fullName}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {crew.position || 'Crew Member'}
                </Text>
              </View>
            </View>
            <Badge size={24}>{crewAllocations.length}</Badge>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="labelSmall">Primary</Text>
              <Text variant="titleSmall">{primaryAreas}</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="labelSmall">Trained</Text>
              <Text variant="titleSmall">{trainedAreas}</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="labelSmall">Completion</Text>
              <Text variant="titleSmall">
                {crewAllocations.length > 0 
                  ? Math.round((trainedAreas / crewAllocations.length) * 100) + '%'
                  : '0%'}
              </Text>
            </View>
          </View>

          <Checkbox.Item
            label="Select for bulk allocation"
            status={selectedCrew.includes(crew.id) ? 'checked' : 'unchecked'}
            onPress={() => {
              setSelectedCrew(prev =>
                prev.includes(crew.id)
                  ? prev.filter(id => id !== crew.id)
                  : [...prev, crew.id]
              );
            }}
            position="leading"
            style={styles.checkbox}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderAreaCard = (area: SiteArea) => {
    const areaAllocations = allocations.filter(a => a.areaId === area.id);
    const trainedCrew = areaAllocations.filter(a => a.isTrainedForArea).length;
    const coverage = areaAllocations.length > 0 ? (trainedCrew / areaAllocations.length) * 100 : 0;

    return (
      <Card key={area.id} style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <Text variant="titleMedium">{area.areaName}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {area.description || 'No description'}
              </Text>
            </View>
            <View style={styles.areaStats}>
              <Badge size={24}>{areaAllocations.length}</Badge>
            </View>
          </View>

          <View style={styles.coverageSection}>
            <Text variant="bodySmall">Coverage: {Math.round(coverage)}%</Text>
            <ProgressBar 
              progress={coverage / 100} 
              color={coverage >= 80 ? theme.colors.primary : theme.colors.error}
              style={styles.progressBar}
            />
          </View>

          <View style={styles.shiftsRow}>
            <Chip 
              mode={areaAllocations.some(a => a.shift === 'morning') ? 'flat' : 'outlined'}
              compact
              style={styles.shiftChip}
            >
              Morning
            </Chip>
            <Chip 
              mode={areaAllocations.some(a => a.shift === 'afternoon') ? 'flat' : 'outlined'}
              compact
              style={styles.shiftChip}
            >
              Afternoon
            </Chip>
            <Chip 
              mode={areaAllocations.some(a => a.shift === 'night') ? 'flat' : 'outlined'}
              compact
              style={styles.shiftChip}
            >
              Night
            </Chip>
          </View>

          <Checkbox.Item
            label="Select for bulk allocation"
            status={selectedAreas.includes(area.id) ? 'checked' : 'unchecked'}
            onPress={() => {
              setSelectedAreas(prev =>
                prev.includes(area.id)
                  ? prev.filter(id => id !== area.id)
                  : [...prev, area.id]
              );
            }}
            position="leading"
            style={styles.checkbox}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" />
        </View>
      );
    }

    switch (viewMode) {
      case 'allocations':
        return (
          <FlatList
            data={allocations.filter(a => 
              a.crewMemberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.areaName.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={({ item }) => renderAllocationCard(item)}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                loadData();
              }} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="account-group-outline" 
                  size={64} 
                  color={theme.colors.outline} 
                />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No allocations found
                </Text>
                <Button mode="contained" onPress={() => setShowAllocationModal(true)}>
                  Create First Allocation
                </Button>
              </View>
            }
          />
        );

      case 'crew':
        return (
          <FlatList
            data={crewMembers.filter(c => 
              c.fullName.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={({ item }) => renderCrewMemberCard(item)}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                loadData();
              }} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge">No crew members found</Text>
              </View>
            }
          />
        );

      case 'areas':
        return (
          <FlatList
            data={areas.filter(a => 
              a.areaName.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={({ item }) => renderAreaCard(item)}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                loadData();
              }} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge">No areas found</Text>
              </View>
            }
          />
        );

      case 'report':
        return (
          <ScrollView 
            contentContainerStyle={styles.reportContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => {
                setRefreshing(true);
                loadData();
              }} />
            }
          >
            <Card style={styles.reportCard}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.reportTitle}>
                  Training Progress Report
                </Text>
                <Button 
                  mode="contained" 
                  onPress={handleGenerateReport}
                  style={styles.generateButton}
                >
                  Generate Report
                </Button>
              </Card.Content>
            </Card>

            {trainingReport && (
              <>
                <Card style={styles.reportCard}>
                  <Card.Content>
                    <Text variant="titleLarge">Overview</Text>
                    <Divider style={styles.divider} />
                    
                    <View style={styles.metricsGrid}>
                      <View style={styles.metricItem}>
                        <Text variant="labelSmall">Total Crew</Text>
                        <Text variant="headlineMedium">{trainingReport.totalCrewMembers}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text variant="labelSmall">Total Areas</Text>
                        <Text variant="headlineMedium">{trainingReport.totalAreas}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text variant="labelSmall">Allocations</Text>
                        <Text variant="headlineMedium">{trainingReport.totalAllocations}</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text variant="labelSmall">Fully Trained</Text>
                        <Text variant="headlineMedium">{trainingReport.fullyTrainedAllocations}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                <Card style={styles.reportCard}>
                  <Card.Content>
                    <Text variant="titleLarge">Training Gaps</Text>
                    <Divider style={styles.divider} />
                    
                    {trainingReport.trainingGaps.map((gap, index) => (
                      <List.Item
                        key={index}
                        title={gap.areaName}
                        description={gap.recommendedAction}
                        left={props => (
                          <List.Icon 
                            {...props} 
                            icon="alert-circle" 
                            color={
                              gap.severity === 'critical' ? theme.colors.error :
                              gap.severity === 'high' ? theme.colors.tertiary :
                              theme.colors.outline
                            }
                          />
                        )}
                      />
                    ))}
                  </Card.Content>
                </Card>
              </>
            )}
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Searchbar
          placeholder="Search..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <SegmentedButtons
          value={viewMode}
          onValueChange={value => setViewMode(value as any)}
          buttons={[
            { value: 'allocations', label: 'Allocations' },
            { value: 'crew', label: 'Crew' },
            { value: 'areas', label: 'Areas' },
            { value: 'report', label: 'Report' },
          ]}
          style={styles.segmentedButtons}
        />
      </Surface>

      {renderContent()}

      {viewMode !== 'report' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            if (viewMode === 'crew' && selectedCrew.length > 0 && selectedAreas.length > 0) {
              setShowBulkModal(true);
            } else {
              setShowAllocationModal(true);
            }
          }}
        />
      )}

      {/* New Allocation Modal */}
      <Portal>
        <Modal
          visible={showAllocationModal}
          onDismiss={() => setShowAllocationModal(false)}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              New Allocation
            </Text>

            <Text variant="labelLarge" style={styles.label}>Crew Member</Text>
            <RadioButton.Group
              onValueChange={value => setNewAllocation(prev => ({ ...prev, crewMemberId: value }))}
              value={newAllocation.crewMemberId || ''}
            >
              {crewMembers.map(crew => (
                <RadioButton.Item
                  key={crew.id}
                  label={crew.fullName}
                  value={crew.id}
                />
              ))}
            </RadioButton.Group>

            <Text variant="labelLarge" style={styles.label}>Area</Text>
            <RadioButton.Group
              onValueChange={value => setNewAllocation(prev => ({ ...prev, areaId: value }))}
              value={newAllocation.areaId || ''}
            >
              {areas.map(area => (
                <RadioButton.Item
                  key={area.id}
                  label={area.areaName}
                  value={area.id}
                />
              ))}
            </RadioButton.Group>

            <Text variant="labelLarge" style={styles.label}>Assignment Type</Text>
            <RadioButton.Group
              onValueChange={value => setNewAllocation(prev => ({ ...prev, assignmentType: value as any }))}
              value={newAllocation.assignmentType || 'primary'}
            >
              <RadioButton.Item label="Primary" value="primary" />
              <RadioButton.Item label="Secondary" value="secondary" />
              <RadioButton.Item label="Backup" value="backup" />
              <RadioButton.Item label="Temporary" value="temporary" />
            </RadioButton.Group>

            <Text variant="labelLarge" style={styles.label}>Shift</Text>
            <RadioButton.Group
              onValueChange={value => setNewAllocation(prev => ({ ...prev, shift: value as any }))}
              value={newAllocation.shift || 'morning'}
            >
              <RadioButton.Item label="Morning" value="morning" />
              <RadioButton.Item label="Afternoon" value="afternoon" />
              <RadioButton.Item label="Night" value="night" />
              <RadioButton.Item label="Rotating" value="rotating" />
            </RadioButton.Group>

            <View style={styles.modalActions}>
              <Button mode="outlined" onPress={() => setShowAllocationModal(false)}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleCreateAllocation}>
                Create
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Bulk Allocation Modal */}
      <Portal>
        <Modal
          visible={showBulkModal}
          onDismiss={() => setShowBulkModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Bulk Allocation
          </Text>
          
          <Text variant="bodyLarge" style={styles.modalBody}>
            Create allocations for {selectedCrew.length} crew members 
            and {selectedAreas.length} areas?
          </Text>
          
          <Text variant="bodyMedium" style={styles.modalBody}>
            This will create {selectedCrew.length * selectedAreas.length} allocations.
          </Text>

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => setShowBulkModal(false)}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleBulkAllocate}>
              Create All
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Crew Details Modal */}
      <Portal>
        <Modal
          visible={showDetailsModal}
          onDismiss={() => setShowDetailsModal(false)}
          contentContainerStyle={[styles.modal, styles.largeModal]}
        >
          {selectedCrewSummary && (
            <ScrollView>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {selectedCrewSummary.crewMemberName}
              </Text>
              
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                {selectedCrewSummary.position}
              </Text>

              <View style={styles.summarySection}>
                <Text variant="titleMedium">Training Summary</Text>
                <Divider style={styles.divider} />
                
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryItem}>
                    <Text variant="labelSmall">Total Areas</Text>
                    <Text variant="headlineSmall">{selectedCrewSummary.totalAreasAssigned}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text variant="labelSmall">Fully Trained</Text>
                    <Text variant="headlineSmall">{selectedCrewSummary.fullyTrainedAreas}</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text variant="labelSmall">Completion</Text>
                    <Text variant="headlineSmall">
                      {Math.round(selectedCrewSummary.trainingCompletionRate)}%
                    </Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text variant="labelSmall">Competency</Text>
                    <Text variant="headlineSmall">
                      {Math.round(selectedCrewSummary.overallCompetencyScore)}%
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.summarySection}>
                <Text variant="titleMedium">Area Assignments</Text>
                <Divider style={styles.divider} />
                
                <Text variant="labelLarge" style={styles.label}>Primary Areas</Text>
                {selectedCrewSummary.primaryAreas.map((area, index) => (
                  <List.Item
                    key={index}
                    title={area.areaName}
                    description={`Training: ${area.trainingStatus} | Progress: ${Math.round(area.itemsTrainingProgress.percentage)}%`}
                    left={props => <List.Icon {...props} icon="map-marker" />}
                  />
                ))}

                {selectedCrewSummary.secondaryAreas.length > 0 && (
                  <>
                    <Text variant="labelLarge" style={styles.label}>Secondary Areas</Text>
                    {selectedCrewSummary.secondaryAreas.map((area, index) => (
                      <List.Item
                        key={index}
                        title={area.areaName}
                        description={`Training: ${area.trainingStatus}`}
                        left={props => <List.Icon {...props} icon="map-marker-outline" />}
                      />
                    ))}
                  </>
                )}
              </View>

              <Button 
                mode="outlined" 
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                Close
              </Button>
            </ScrollView>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  searchbar: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  cardSubtitle: {
    opacity: 0.7,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  progressSection: {
    marginTop: 12,
  },
  progressLabel: {
    marginBottom: 4,
    opacity: 0.7,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  crewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  checkbox: {
    marginTop: 8,
    paddingVertical: 0,
  },
  areaStats: {
    alignItems: 'center',
  },
  coverageSection: {
    marginTop: 12,
  },
  shiftsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  shiftChip: {
    marginRight: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginVertical: 16,
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  largeModal: {
    maxHeight: '90%',
  },
  modalTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
  },
  reportContent: {
    padding: 16,
  },
  reportCard: {
    marginBottom: 16,
  },
  reportTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  generateButton: {
    marginTop: 12,
  },
  divider: {
    marginVertical: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  summarySection: {
    marginTop: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 12,
  },
  closeButton: {
    marginTop: 20,
  },
});