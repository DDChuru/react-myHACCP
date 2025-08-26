import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import {
  Surface,
  Text,
  Card,
  Searchbar,
  Chip,
  FAB,
  useTheme,
  IconButton,
  Badge,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSCI } from '../../../contexts/SCIContext';
import { SCIDocument } from '../../../types/sci';

export default function SCIDocumentListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { documents, loadDocuments, isLoading, imageQueue, isSyncing, syncImageQueue } = useSCI();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey] = useState(Math.random()); // Force refresh

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Get unique areas from all documents
  const allAreas = Array.from(
    new Set(documents.flatMap(doc => {
      if (!doc.areas) return [];
      return doc.areas.map(area => 
        typeof area === 'string' ? area : area.area || area.name || 'Unknown'
      );
    }))
  );

  // Filter documents based on search and area
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesArea = 
      selectedArea === 'all' || 
      (doc.areas && doc.areas.some(area => {
        const areaName = typeof area === 'string' ? area : area.area || area.name || 'Unknown';
        return areaName === selectedArea;
      }));
    
    return matchesSearch && matchesArea;
  });

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  // Navigate to document viewer
  const navigateToDocument = (document: SCIDocument) => {
    console.log('[SCI] Navigating to document:', document.id, document.documentNumber);
    router.push({
      pathname: '/(drawer)/sci/viewer',
      params: { id: document.id }
    });
  };

  // Render document card
  const renderDocumentCard = ({ item }: { item: SCIDocument }) => {
    const progressPercentage = item.imageStats.total > 0 
      ? (item.imageStats.captured / item.imageStats.total) * 100 
      : 0;
    
    const pendingImages = imageQueue.filter(img => img.documentId === item.id).length;

    return (
      <Card 
        style={styles.documentCard} 
        onPress={() => navigateToDocument(item)}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleSection}>
              <View style={styles.documentHeaderRow}>
                <Text variant="labelLarge" style={styles.documentNumber}>
                  {item.documentNumber}
                </Text>
                {pendingImages > 0 && (
                  <Badge style={styles.inlineBadge}>{pendingImages} pending</Badge>
                )}
              </View>
              <Text variant="titleMedium" numberOfLines={2} style={styles.documentTitle}>
                {item.title}
              </Text>
            </View>
            <View style={styles.cardStats}>
              <View style={[styles.progressCircle, { borderColor: theme.colors.primary }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                  {Math.round(progressPercentage)}%
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.metaInfo}>
              <View style={styles.areaContainer}>
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={14} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.areaText} numberOfLines={1}>
                  {item.areas?.map((area, index) => {
                    const areaName = typeof area === 'string' ? area : area.area || area.name || 'Unknown';
                    return index === 0 ? areaName : `, ${areaName}`;
                  }).join('') || 'No areas assigned'}
                </Text>
              </View>
              
              <View style={styles.imageStats}>
                <MaterialCommunityIcons 
                  name="camera" 
                  size={14} 
                  color={theme.colors.onSurfaceVariant} 
                />
                <Text variant="bodySmall" style={styles.imageStatsText}>
                  {item.imageStats.captured}/{item.imageStats.total}
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && documents.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>
          Loading REAL SCI documents (v4.25)...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with search and filters */}
      <Surface style={styles.header} elevation={1}>
        <Searchbar
          placeholder="Search SCI documents..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
        >
          <View style={styles.filterSection}>
            <Chip
              selected={selectedArea === 'all'}
              onPress={() => setSelectedArea('all')}
              style={styles.filterChip}
              mode="outlined"
            >
              All Areas
            </Chip>
            {allAreas.map(area => (
              <Chip
                key={area}
                selected={selectedArea === area}
                onPress={() => setSelectedArea(area)}
                style={styles.filterChip}
                mode="outlined"
              >
                {area}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </Surface>

      {/* Sync status bar */}
      {imageQueue.length > 0 && (
        <Surface style={styles.syncBar} elevation={1}>
          <View style={styles.syncContent}>
            <MaterialCommunityIcons 
              name="cloud-upload-outline" 
              size={20} 
              color={theme.colors.primary} 
            />
            <Text variant="bodyMedium" style={styles.syncText}>
              {imageQueue.length} images pending sync
            </Text>
            <IconButton
              icon="sync"
              size={20}
              onPress={syncImageQueue}
              disabled={isSyncing}
              animated
            />
          </View>
        </Surface>
      )}

      {/* Document list */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocumentCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={64} 
              color={theme.colors.onSurfaceVariant} 
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No documents found
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {searchQuery || selectedArea !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'SCI documents will appear here'}
            </Text>
          </View>
        }
      />

      {/* FAB for quick actions */}
      <FAB
        icon="qrcode-scan"
        style={styles.fab}
        onPress={() => {
          // Future: QR code scanning for quick document access
          alert('QR scanning coming soon!');
        }}
        label="Scan QR"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  searchBar: {
    marginBottom: 8,
    elevation: 0,
    height: 40,
  },
  filterScrollView: {
    maxHeight: 40,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterChip: {
    marginRight: 8,
    height: 32,
  },
  syncBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  syncContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    flex: 1,
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  documentCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  documentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  documentNumber: {
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8,
  },
  inlineBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    height: 20,
  },
  documentTitle: {
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
  },
  cardStats: {
    alignItems: 'center',
    position: 'relative',
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  metaInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  areaText: {
    marginLeft: 4,
    opacity: 0.7,
    flex: 1,
  },
  imageStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageStatsText: {
    marginLeft: 4,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});