import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView,
  Modal,
  TouchableOpacity,
  Keyboard
} from 'react-native';
import { 
  Surface, 
  Text, 
  Searchbar,
  List,
  Divider,
  IconButton,
  useTheme,
  Chip,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Area {
  id: string;
  name: string;
  description?: string;
  siteId: string;
}

interface AreaPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (area: Area) => void;
  areas: Area[];
  selectedAreaId?: string;
  title?: string;
  loading?: boolean;
}

export default function AreaPicker({
  visible = false,
  onDismiss = () => {},
  onSelect = () => {},
  areas = [],
  selectedAreaId,
  title = "Select Area",
  loading = false
}: AreaPickerProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter areas based on debounced search query
  const filteredAreas = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return areas;
    }
    
    const query = debouncedQuery.toLowerCase();
    return areas.filter(area => 
      area.name.toLowerCase().includes(query) ||
      area.description?.toLowerCase().includes(query)
    );
  }, [areas, debouncedQuery]);

  const handleAreaSelect = (area: Area) => {
    Keyboard.dismiss();
    onSelect(area);
    onDismiss();
    // Reset search when closing
    setSearchQuery('');
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onDismiss();
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Surface style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleLarge">{title}</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleClose}
            />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Search areas..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchbar, { backgroundColor: theme.colors.surfaceVariant }]}
              inputStyle={{ color: theme.colors.onSurface }}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              iconColor={theme.colors.onSurfaceVariant}
              icon="magnify"
              clearIcon="close"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Text variant="bodySmall" style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
                {filteredAreas.length} area{filteredAreas.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>

          <Divider />

          {/* Areas List */}
          <ScrollView 
            style={styles.listContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                  Loading areas...
                </Text>
              </View>
            ) : filteredAreas.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="map-marker-off" 
                  size={48} 
                  color={theme.colors.onSurfaceVariant}
                  style={{ opacity: 0.5 }}
                />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {searchQuery ? 'No areas match your search' : 'No areas available'}
                </Text>
                {searchQuery && (
                  <Text variant="bodyMedium" style={styles.emptyHint}>
                    Try a different search term
                  </Text>
                )}
              </View>
            ) : (
              filteredAreas.map((area, index) => (
                <React.Fragment key={area.id}>
                  <TouchableOpacity 
                    onPress={() => handleAreaSelect(area)}
                    activeOpacity={0.7}
                  >
                    <List.Item
                      title={area.name}
                      description={area.description}
                      left={props => (
                        <List.Icon 
                          {...props} 
                          icon="map-marker"
                          color={selectedAreaId === area.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                      )}
                      right={props => 
                        selectedAreaId === area.id ? (
                          <List.Icon 
                            {...props} 
                            icon="check-circle" 
                            color={theme.colors.primary}
                          />
                        ) : null
                      }
                      style={[
                        styles.listItem,
                        selectedAreaId === area.id && styles.selectedItem
                      ]}
                      titleStyle={[
                        { color: theme.colors.onSurface },
                        selectedAreaId === area.id && { color: theme.colors.primary }
                      ]}
                      descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    />
                  </TouchableOpacity>
                  {index < filteredAreas.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </ScrollView>

          {/* Quick Select Chips (optional - for frequently used areas) */}
          {!searchQuery && areas.length > 5 && (
            <>
              <Divider />
              <View style={styles.quickSelectContainer}>
                <Text variant="labelSmall" style={styles.quickSelectLabel}>
                  QUICK SELECT
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipContainer}
                >
                  {areas.slice(0, 5).map(area => (
                    <Chip
                      key={area.id}
                      mode="outlined"
                      selected={selectedAreaId === area.id}
                      onPress={() => handleAreaSelect(area)}
                      style={styles.chip}
                    >
                      {area.name}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchbar: {
    elevation: 0,
  },
  resultCount: {
    marginTop: 4,
    opacity: 0.6,
    paddingHorizontal: 8,
  },
  listContainer: {
    flex: 1,
  },
  listItem: {
    paddingVertical: 8,
  },
  selectedItem: {
    backgroundColor: 'rgba(103, 80, 164, 0.08)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    opacity: 0.7,
  },
  emptyHint: {
    marginTop: 8,
    opacity: 0.5,
  },
  quickSelectContainer: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  quickSelectLabel: {
    paddingHorizontal: 16,
    marginBottom: 8,
    opacity: 0.6,
  },
  chipContainer: {
    paddingHorizontal: 16,
  },
  chip: {
    marginRight: 8,
  },
});