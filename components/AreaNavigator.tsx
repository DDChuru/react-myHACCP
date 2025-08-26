import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Keyboard
} from 'react-native';
import { 
  Surface, 
  Text, 
  Searchbar,
  useTheme,
  IconButton,
  Chip,
  List,
  Divider,
  Menu
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Area {
  id: string;
  name: string;
  description?: string;
}

interface AreaNavigatorProps {
  areas: Area[];
  currentAreaIndex: number;
  onAreaChange: (index: number) => void;
  issueCount?: number;
}

export default function AreaNavigator({
  areas,
  currentAreaIndex,
  onAreaChange,
  issueCount = 0
}: AreaNavigatorProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const currentArea = areas[currentAreaIndex];

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter areas based on search
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

  const handleAreaSelect = (index: number) => {
    onAreaChange(index);
    setShowDropdown(false);
    setShowSearch(false);
    setSearchQuery('');
    Keyboard.dismiss();
  };

  const handleNext = () => {
    if (currentAreaIndex < areas.length - 1) {
      onAreaChange(currentAreaIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentAreaIndex > 0) {
      onAreaChange(currentAreaIndex - 1);
    }
  };

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
      Keyboard.dismiss();
    }
  };

  return (
    <Surface style={styles.container} elevation={1}>
      {/* Compact Navigation Bar */}
      {!showSearch ? (
        <View style={styles.navigationBar}>
          <IconButton
            icon="chevron-left"
            size={24}
            disabled={currentAreaIndex === 0}
            onPress={handlePrevious}
          />
          
          <TouchableOpacity 
            style={styles.areaSelector}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.7}
          >
            <View style={styles.areaSelectorContent}>
              <Text variant="titleMedium" numberOfLines={1}>
                {currentArea?.name || 'Select Area'}
              </Text>
              <Text variant="bodySmall" style={styles.areaProgress}>
                {currentAreaIndex + 1} of {areas.length}
              </Text>
            </View>
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={20} 
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <IconButton
              icon="magnify"
              size={24}
              onPress={toggleSearch}
            />
            <IconButton
              icon="chevron-right"
              size={24}
              disabled={currentAreaIndex === areas.length - 1}
              onPress={handleNext}
            />
          </View>
        </View>
      ) : (
        /* Search Mode */
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search areas..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            autoFocus
            onIconPress={toggleSearch}
            icon="arrow-left"
          />
        </View>
      )}

      {/* Area Description and Issue Count */}
      {currentArea && !showSearch && (
        <View style={styles.areaInfo}>
          {currentArea.description && (
            <Text variant="bodySmall" style={styles.areaDescription}>
              {currentArea.description}
            </Text>
          )}
          <Chip mode="flat" compact style={styles.issueChip}>
            {issueCount} issue{issueCount !== 1 ? 's' : ''}
          </Chip>
        </View>
      )}

      {/* Dropdown Menu */}
      <Menu
        visible={showDropdown}
        onDismiss={() => setShowDropdown(false)}
        anchor={{ x: 0, y: 0 }}
        contentStyle={styles.dropdownMenu}
      >
        <ScrollView style={styles.dropdownScroll}>
          {areas.map((area, index) => (
            <React.Fragment key={area.id}>
              <Menu.Item
                onPress={() => handleAreaSelect(index)}
                title={area.name}
                leadingIcon={index === currentAreaIndex ? 'check' : undefined}
                titleStyle={
                  index === currentAreaIndex 
                    ? { color: theme.colors.primary, fontWeight: 'bold' }
                    : undefined
                }
              />
              {index < areas.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </ScrollView>
      </Menu>

      {/* Search Results */}
      {showSearch && searchQuery && (
        <ScrollView style={styles.searchResults}>
          {filteredAreas.length === 0 ? (
            <View style={styles.noResults}>
              <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
                No areas match your search
              </Text>
            </View>
          ) : (
            filteredAreas.map((area, originalIndex) => {
              const index = areas.findIndex(a => a.id === area.id);
              return (
                <TouchableOpacity
                  key={area.id}
                  onPress={() => handleAreaSelect(index)}
                  activeOpacity={0.7}
                >
                  <List.Item
                    title={area.name}
                    description={area.description}
                    left={props => (
                      <List.Icon {...props} icon="map-marker" />
                    )}
                    right={props => 
                      index === currentAreaIndex ? (
                        <List.Icon {...props} icon="check" color={theme.colors.primary} />
                      ) : null
                    }
                    style={
                      index === currentAreaIndex 
                        ? { backgroundColor: theme.colors.primaryContainer + '20' }
                        : undefined
                    }
                  />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  areaSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  areaSelectorContent: {
    flex: 1,
  },
  areaProgress: {
    opacity: 0.6,
    marginTop: 2,
  },
  rightActions: {
    flexDirection: 'row',
  },
  searchContainer: {
    padding: 8,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  areaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  areaDescription: {
    flex: 1,
    opacity: 0.7,
    marginRight: 12,
  },
  issueChip: {
    backgroundColor: '#f0f0f0',
  },
  dropdownMenu: {
    maxHeight: 300,
    minWidth: 250,
  },
  dropdownScroll: {
    maxHeight: 300,
  },
  searchResults: {
    maxHeight: 200,
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
});