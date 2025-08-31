import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Image,
  Modal as RNModal,
} from 'react-native';
import {
  FAB,
  Card,
  Title,
  Paragraph,
  Searchbar,
  Chip,
  Avatar,
  IconButton,
  Menu,
  Divider,
  Text,
  Button,
  ActivityIndicator,
  Modal,
  useTheme,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CrewMemberService from '../../services/CrewMemberService';
import { CrewMemberModel, CrewMemberFilters, CrewPosition } from '../../types/crewMember';
import { useAuthProfile } from '../../hooks/useAuthProfile';
import CrewMemberForm from '../../components/CrewMemberForm';
import { getFABPosition, getListPaddingForFAB } from '../../utils/fabHelper';

export default function CrewMembersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuthProfile();
  const [crewMembers, setCrewMembers] = useState<CrewMemberModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<CrewPosition | undefined>();
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CrewMemberModel | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const isSiteAdmin = userProfile?.roles?.siteAdmin === true;
  const isAdmin = userProfile?.roles?.admin === true;
  const canManageCrewMembers = isSiteAdmin || isAdmin;
  
  console.log('[CrewMembers] User roles:', { 
    email: userProfile?.email,
    roles: userProfile?.roles,
    isSiteAdmin,
    isAdmin,
    canManage: canManageCrewMembers,
    userProfileExists: !!userProfile,
    rolesObject: JSON.stringify(userProfile?.roles)
  });

  const positions = CrewMemberService.getAvailablePositions();

  // Load crew members
  const loadCrewMembers = useCallback(async () => {
    try {
      console.log('[CrewMembers] Loading with profile:', userProfile?.email);
      const filters: CrewMemberFilters = {
        searchTerm: searchQuery,
        position: selectedPosition,
        isActive: showActiveOnly ? true : undefined,
      };

      const members = await CrewMemberService.getCrewMembers(filters);
      console.log('[CrewMembers] Loaded members:', members.length);
      setCrewMembers(members);
    } catch (error) {
      console.error('[CrewMembers] Error loading crew members:', error);
      // Don't show alert on initial load if auth is still loading
      if (!loading) {
        Alert.alert('Error', 'Failed to load crew members');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedPosition, showActiveOnly, userProfile, loading]);

  useEffect(() => {
    // Only load crew members if we have a user profile
    if (userProfile) {
      loadCrewMembers();
    }
  }, [loadCrewMembers, userProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCrewMembers();
  };

  const handleDelete = async (member: CrewMemberModel) => {
    Alert.alert(
      'Delete Crew Member',
      `Are you sure you want to delete ${member.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CrewMemberService.deleteCrewMember(member.id);
              loadCrewMembers();
              Alert.alert('Success', 'Crew member deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete crew member');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (member: CrewMemberModel) => {
    try {
      await CrewMemberService.updateCrewMember(member.id, {
        isActive: !member.isActive,
      });
      loadCrewMembers();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update crew member');
    }
  };

  const renderCrewMember = ({ item }: { item: CrewMemberModel }) => {
    const isActive = item.isActive !== false;
    
    return (
      <Card style={[styles.card, !isActive && styles.inactiveCard]}>
        <Card.Content>
          <View style={styles.memberHeader}>
            <View style={styles.memberInfo}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={styles.memberPhoto} />
              ) : (
                <Avatar.Icon
                  size={48}
                  icon="account"
                  style={styles.memberAvatar}
                />
              )}
              <View style={styles.memberDetails}>
                <Title style={styles.memberName}>{item.fullName}</Title>
                {item.position && (
                  <Chip
                    mode="flat"
                    compact
                    style={styles.positionChip}
                    textStyle={styles.positionChipText}
                  >
                    {item.position}
                  </Chip>
                )}
              </View>
            </View>
            
            {canManageCrewMembers && (
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    onPress={() => setMenuVisible(item.id)}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedMember(item);
                    setMenuVisible(null);
                    setShowAddModal(true);
                  }}
                  title="Edit"
                  leadingIcon="pencil"
                />
                <Menu.Item
                  onPress={() => {
                    handleToggleActive(item);
                    setMenuVisible(null);
                  }}
                  title={isActive ? 'Deactivate' : 'Activate'}
                  leadingIcon={isActive ? 'eye-off' : 'eye'}
                />
                <Divider />
                <Menu.Item
                  onPress={() => {
                    handleDelete(item);
                    setMenuVisible(null);
                  }}
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{ color: '#d32f2f' }}
                />
              </Menu>
            )}
          </View>

          <View style={styles.memberContactInfo}>
            {item.email && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="email" size={16} color="#666" />
                <Text style={styles.contactText}>{item.email}</Text>
              </View>
            )}
            {item.phoneNumber && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="phone" size={16} color="#666" />
                <Text style={styles.contactText}>{item.phoneNumber}</Text>
              </View>
            )}
            {item.employeeNumber && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="identifier" size={16} color="#666" />
                <Text style={styles.contactText}>#{item.employeeNumber}</Text>
              </View>
            )}
          </View>

          {!isActive && (
            <Chip
              mode="flat"
              style={styles.inactiveChip}
              textStyle={styles.inactiveChipText}
            >
              Inactive
            </Chip>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group" size={64} color="#ccc" />
      <Title style={styles.emptyTitle}>No Crew Members</Title>
      <Paragraph style={styles.emptyText}>
        {searchQuery || selectedPosition
          ? 'No crew members match your filters'
          : 'Start by adding your first crew member'}
      </Paragraph>
      {canManageCrewMembers && !searchQuery && !selectedPosition && (
        <Button
          mode="contained"
          onPress={() => setShowAddModal(true)}
          style={styles.emptyButton}
          icon="plus"
        >
          Add First Crew Member
        </Button>
      )}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[
          { id: 'active', label: showActiveOnly ? 'Active Only' : 'All Members' },
          ...positions.map(pos => ({ id: pos, label: pos })),
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Chip
            mode={
              item.id === 'active'
                ? 'flat'
                : selectedPosition === item.id
                ? 'flat'
                : 'outlined'
            }
            selected={
              item.id === 'active'
                ? showActiveOnly
                : selectedPosition === item.id
            }
            onPress={() => {
              if (item.id === 'active') {
                setShowActiveOnly(!showActiveOnly);
              } else {
                setSelectedPosition(
                  selectedPosition === item.id ? undefined : (item.id as CrewPosition)
                );
              }
            }}
            style={styles.filterChip}
          >
            {item.label}
          </Chip>
        )}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search by name, email, or phone..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        icon="magnify"
      />

      {renderFilters()}

      <FlatList
        data={crewMembers}
        renderItem={renderCrewMember}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: getListPaddingForFAB(insets) }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {canManageCrewMembers && (
        <FAB
          icon="plus"
          style={[styles.fab, getFABPosition(insets)]}
          onPress={() => {
            console.log('[CrewMembers] FAB pressed, opening modal');
            setSelectedMember(null);
            setShowAddModal(true);
          }}
          label="Add Crew"
          extended
        />
      )}

      <RNModal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          console.log('[CrewMembers] Modal close requested');
          setShowAddModal(false);
          setSelectedMember(null);
        }}
      >
        <View style={styles.modalContainer}>
          <CrewMemberForm
            initialData={selectedMember || undefined}
            editMode={!!selectedMember}
            onSuccess={(newMember) => {
              console.log('[CrewMembers] Crew member created successfully');
              setShowAddModal(false);
              setSelectedMember(null);
              loadCrewMembers();
            }}
            onCancel={() => {
              console.log('[CrewMembers] Form cancelled');
              setShowAddModal(false);
              setSelectedMember(null);
            }}
          />
        </View>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    margin: 16,
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  memberPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberAvatar: {
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    marginBottom: 4,
  },
  positionChip: {
    alignSelf: 'flex-start',
    minHeight: 28,
    backgroundColor: '#e3f2fd',
    paddingVertical: 2,
  },
  positionChipText: {
    fontSize: 12,
    color: '#1976d2',
    lineHeight: 14,
  },
  memberContactInfo: {
    marginTop: 12,
    marginLeft: 60,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  inactiveChip: {
    position: 'absolute',
    top: 12,
    right: 48,
    backgroundColor: '#ffebee',
  },
  inactiveChipText: {
    color: '#c62828',
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    color: '#666',
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#999',
  },
  emptyButton: {
    marginTop: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});