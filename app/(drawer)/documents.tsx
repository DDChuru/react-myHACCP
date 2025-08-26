import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import {
  Surface,
  Text,
  Card,
  IconButton,
  useTheme,
  Searchbar,
  Chip,
  FAB,
  Portal,
  Dialog,
  Button,
  TextInput,
  List,
  Avatar,
  Badge,
  Menu,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

interface Document {
  id: string;
  title: string;
  category: string;
  type: 'sop' | 'instruction' | 'form' | 'checklist';
  lastModified: string;
  images: string[];
  status: 'active' | 'draft' | 'review';
  version: string;
}

export default function DocumentsScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});
  const [imageDialogVisible, setImageDialogVisible] = useState(false);

  const categories = [
    { id: 'all', label: 'All Documents', icon: 'file-multiple' },
    { id: 'cleaning', label: 'Cleaning', icon: 'broom' },
    { id: 'food-safety', label: 'Food Safety', icon: 'food-apple' },
    { id: 'equipment', label: 'Equipment', icon: 'tools' },
    { id: 'training', label: 'Training', icon: 'school' },
  ];

  const documents: Document[] = [
    {
      id: '1',
      title: 'Hand Washing Procedure',
      category: 'cleaning',
      type: 'sop',
      lastModified: '2 days ago',
      images: [],
      status: 'active',
      version: '2.1',
    },
    {
      id: '2',
      title: 'Kitchen Deep Clean Checklist',
      category: 'cleaning',
      type: 'checklist',
      lastModified: '1 week ago',
      images: ['image1.jpg', 'image2.jpg'],
      status: 'active',
      version: '1.3',
    },
    {
      id: '3',
      title: 'Temperature Monitoring Form',
      category: 'food-safety',
      type: 'form',
      lastModified: '3 days ago',
      images: [],
      status: 'review',
      version: '3.0',
    },
    {
      id: '4',
      title: 'Equipment Sanitization Guide',
      category: 'equipment',
      type: 'instruction',
      lastModified: '1 month ago',
      images: ['equipment1.jpg'],
      status: 'active',
      version: '1.5',
    },
    {
      id: '5',
      title: 'Allergen Management SOP',
      category: 'food-safety',
      type: 'sop',
      lastModified: '2 weeks ago',
      images: [],
      status: 'draft',
      version: '1.0',
    },
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Handle the selected image
      console.log('Image selected:', result.assets[0].uri);
      Alert.alert('Success', 'Photo added to document successfully!');
      setImageDialogVisible(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Handle the taken photo
      console.log('Photo taken:', result.assets[0].uri);
      Alert.alert('Success', 'Photo added to document successfully!');
      setImageDialogVisible(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sop': return 'file-document';
      case 'instruction': return 'book-open-variant';
      case 'form': return 'clipboard-text';
      case 'checklist': return 'checkbox-marked-outline';
      default: return 'file';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return theme.colors.success;
      case 'draft': return theme.colors.onSurfaceVariant;
      case 'review': return theme.colors.warning;
      default: return theme.colors.onSurface;
    }
  };

  return (
    <>
      <ScrollView style={styles.container} stickyHeaderIndices={[0]}>
        {/* Search and Filter Header */}
        <Surface style={styles.header} elevation={1}>
          <Searchbar
            placeholder="Search documents..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            icon="magnify"
          />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((category) => (
              <Chip
                key={category.id}
                icon={category.icon}
                selected={selectedCategory === category.id}
                onPress={() => setSelectedCategory(category.id)}
                style={styles.categoryChip}
                mode="outlined"
              >
                {category.label}
              </Chip>
            ))}
          </ScrollView>
        </Surface>

        {/* Documents List */}
        <View style={styles.documentsContainer}>
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} style={styles.documentCard} onPress={() => setSelectedDocument(doc)}>
              <Card.Content>
                <View style={styles.documentHeader}>
                  <Avatar.Icon 
                    size={40} 
                    icon={getTypeIcon(doc.type)}
                    style={{ backgroundColor: theme.colors.primaryContainer }}
                  />
                  <View style={styles.documentInfo}>
                    <View style={styles.titleRow}>
                      <Text variant="titleMedium" style={styles.documentTitle}>
                        {doc.title}
                      </Text>
                      <Menu
                        visible={menuVisible[doc.id] || false}
                        onDismiss={() => setMenuVisible({ ...menuVisible, [doc.id]: false })}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            size={20}
                            onPress={() => setMenuVisible({ ...menuVisible, [doc.id]: true })}
                          />
                        }
                      >
                        <Menu.Item 
                          onPress={() => {
                            setSelectedDocument(doc);
                            setImageDialogVisible(true);
                            setMenuVisible({ ...menuVisible, [doc.id]: false });
                          }} 
                          title="Add Photo" 
                          leadingIcon="camera-plus"
                        />
                        <Menu.Item 
                          onPress={() => {
                            setMenuVisible({ ...menuVisible, [doc.id]: false });
                          }} 
                          title="Edit" 
                          leadingIcon="pencil"
                        />
                        <Menu.Item 
                          onPress={() => {
                            setMenuVisible({ ...menuVisible, [doc.id]: false });
                          }} 
                          title="Share" 
                          leadingIcon="share-variant"
                        />
                        <Divider />
                        <Menu.Item 
                          onPress={() => {
                            setMenuVisible({ ...menuVisible, [doc.id]: false });
                          }} 
                          title="Archive" 
                          leadingIcon="archive"
                        />
                      </Menu>
                    </View>
                    <View style={styles.documentMeta}>
                      <Chip 
                        mode="flat" 
                        textStyle={{ fontSize: 10 }}
                        style={[styles.statusChip, { backgroundColor: `${getStatusColor(doc.status)}20` }]}
                      >
                        {doc.status}
                      </Chip>
                      <Text variant="bodySmall" style={styles.versionText}>
                        v{doc.version}
                      </Text>
                      <Text variant="bodySmall" style={styles.modifiedText}>
                        {doc.lastModified}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Image Preview */}
                {doc.images.length > 0 && (
                  <View style={styles.imagePreview}>
                    <View style={styles.imageContainer}>
                      <MaterialCommunityIcons name="image" size={16} color={theme.colors.primary} />
                      <Text variant="bodySmall" style={styles.imageCount}>
                        {doc.images.length} photo{doc.images.length > 1 ? 's' : ''} attached
                      </Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {doc.images.map((image, index) => (
                        <Surface key={index} style={styles.imageThumbnail} elevation={1}>
                          <MaterialCommunityIcons name="image" size={24} color={theme.colors.onSurfaceVariant} />
                        </Surface>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Document Actions */}
                <View style={styles.documentActions}>
                  <Button 
                    mode="text" 
                    icon="eye"
                    onPress={() => {}}
                    compact
                  >
                    View
                  </Button>
                  <Button 
                    mode="text" 
                    icon="download"
                    onPress={() => {}}
                    compact
                  >
                    Download
                  </Button>
                  <Button 
                    mode="text" 
                    icon="camera-plus"
                    onPress={() => {
                      setSelectedDocument(doc);
                      setImageDialogVisible(true);
                    }}
                    compact
                  >
                    Add Photo
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Empty State */}
        {filteredDocuments.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={64} 
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No documents found
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB for New Document */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setDialogVisible(true)}
        label="New Document"
      />

      {/* Image Upload Dialog */}
      <Portal>
        <Dialog visible={imageDialogVisible} onDismiss={() => setImageDialogVisible(false)}>
          <Dialog.Title>Add Photo to Document</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Add a photo to "{selectedDocument?.title}"
            </Text>
            <View style={styles.imageOptions}>
              <TouchableOpacity style={styles.imageOption} onPress={takePhoto}>
                <Avatar.Icon 
                  size={64} 
                  icon="camera" 
                  style={{ backgroundColor: theme.colors.primaryContainer }}
                />
                <Text variant="labelMedium" style={styles.imageOptionText}>
                  Take Photo
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageOption} onPress={pickImage}>
                <Avatar.Icon 
                  size={64} 
                  icon="image-multiple" 
                  style={{ backgroundColor: theme.colors.secondaryContainer }}
                />
                <Text variant="labelMedium" style={styles.imageOptionText}>
                  Choose from Gallery
                </Text>
              </TouchableOpacity>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setImageDialogVisible(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>

        {/* New Document Dialog */}
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Create New Document</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Document Title"
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Category"
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Description"
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={() => setDialogVisible(false)} mode="contained">
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    marginRight: 8,
  },
  documentsContainer: {
    padding: 16,
  },
  documentCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentTitle: {
    flex: 1,
    fontWeight: 'bold',
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  statusChip: {
    height: 24,
  },
  versionText: {
    opacity: 0.7,
  },
  modifiedText: {
    opacity: 0.7,
    marginLeft: 'auto',
  },
  imagePreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageCount: {
    marginLeft: 4,
    opacity: 0.7,
  },
  imageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    opacity: 0.7,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  dialogInput: {
    marginBottom: 12,
  },
  imageOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  imageOption: {
    alignItems: 'center',
  },
  imageOptionText: {
    marginTop: 8,
  },
});