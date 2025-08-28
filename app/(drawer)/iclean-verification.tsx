/**
 * iClean Verification Entry Screen
 * Entry point with QR scanner and area selection
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Portal,
  Modal,
  Searchbar,
  Badge,
  useTheme,
  Surface,
  IconButton,
} from 'react-native-paper';
import { Platform } from 'react-native';
// Camera modules temporarily disabled - barcode scanner needs reinstall
const Camera = null; // Platform.OS !== 'web' ? require('expo-camera').Camera : null;
const BarCodeScanner = null; // Platform.OS !== 'web' ? require('expo-barcode-scanner').BarCodeScanner : null;
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { VerificationService } from '../../services/iCleanVerificationService';
import { QRCodeData, LocalVerificationProgress } from '../../types/iCleanVerification';

export default function ICleanVerificationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, userProfile: profile } = useAuth();
  
  // State management
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showAreaList, setShowAreaList] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaProgress, setAreaProgress] = useState<Map<string, LocalVerificationProgress>>(new Map());
  
  // Initialize service
  const verificationService = new VerificationService(
    profile?.companyId || '',
    user?.uid || ''
  );

  // High contrast colors to address white-cards issue
  const colors = {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    cardBg: '#333333',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#424242',
    pending: '#757575',
    pass: '#4caf50',
    fail: '#f44336',
    overdue: '#ff5722',
  };

  useEffect(() => {
    // Request camera permissions (only on native)
    if (Platform.OS !== 'web' && Camera) {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    } else {
      // On web or when Camera is not available, set permission to false
      // but still allow the screen to render
      setHasPermission(false);
    }
  }, []);

  useEffect(() => {
    // Load site areas when profile is available
    if (profile?.companyId && profile?.siteId) {
      loadSiteAreas();
    }
  }, [profile]);

  const loadSiteAreas = async () => {
    if (!profile?.companyId || !profile?.siteId) {
      console.log('[iClean] Missing profile data:', { 
        companyId: profile?.companyId, 
        siteId: profile?.siteId 
      });
      return;
    }
    
    console.log('[iClean] Loading areas for:', { 
      companyId: profile.companyId, 
      siteId: profile.siteId 
    });
    
    setLoading(true);
    try {
      // Fetch site areas from Firestore (company-scoped collection)
      const areasRef = collection(db, `companies/${profile.companyId}/siteAreas`);
      const q = query(
        areasRef,
        where('siteId', '==', profile.siteId)
        // Removed isActive filter - may not exist in your data
      );
      
      console.log('[iClean] Querying:', `companies/${profile.companyId}/siteAreas where siteId == ${profile.siteId}`);
      
      const snapshot = await getDocs(q);
      const areasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('[iClean] Areas loaded:', areasData.length);
      
      // If no areas found, try without siteId filter to see if there's any data
      if (areasData.length === 0) {
        console.log('[iClean] No areas found with siteId filter, checking collection...');
        const allAreasSnapshot = await getDocs(collection(db, `companies/${profile.companyId}/siteAreas`));
        console.log('[iClean] Total areas in collection:', allAreasSnapshot.size);
        if (allAreasSnapshot.size > 0) {
          console.log('[iClean] Sample area data:', allAreasSnapshot.docs[0].data());
        }
      }
      
      setAreas(areasData);
      
      // Load progress for each area
      const progressMap = new Map();
      for (const area of areasData) {
        const progress = await verificationService.getLocalProgress(area.id, refreshing);
        if (progress) {
          progressMap.set(area.id, progress);
        }
      }
      setAreaProgress(progressMap);
    } catch (error) {
      console.error('Error loading areas:', error);
      Alert.alert('Error', 'Failed to load areas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    console.log('[iClean] Pull-to-refresh triggered');
    setRefreshing(true);
    await loadSiteAreas();
  };

  const handleQRCodeScanned = ({ data }: { data: string }) => {
    try {
      const qrData: QRCodeData = JSON.parse(data);
      
      if (qrData.type !== 'area') {
        Alert.alert('Invalid QR Code', 'This QR code is not for an area');
        return;
      }
      
      if (qrData.siteId !== profile?.siteId) {
        Alert.alert('Wrong Site', 'This QR code is for a different site');
        return;
      }
      
      setShowQRScanner(false);
      navigateToAreaVerification(qrData.areaId, qrData.areaName);
    } catch (error) {
      Alert.alert('Invalid QR Code', 'Could not read QR code data');
    }
  };

  const navigateToAreaVerification = (areaId: string, areaName: string) => {
    // Pass siteId from profile to ensure correct site context
    router.push({
      pathname: '/(drawer)/area-verification',
      params: { 
        areaId, 
        areaName,
        siteId: profile?.siteId || ''  // Pass the actual site ID
      }
    });
  };

  const getAreaStats = (areaId: string) => {
    const progress = areaProgress.get(areaId);
    if (!progress) return { pending: 0, completed: 0, failed: 0, overdue: 0 };
    
    const daily = progress.scheduleGroups.daily;
    const weekly = progress.scheduleGroups.weekly;
    const monthly = progress.scheduleGroups.monthly;
    
    const allItems = [
      ...daily.items,
      ...weekly.items,
      ...monthly.items
    ];
    
    return {
      pending: allItems.filter(i => i.status === 'pending').length,
      completed: allItems.filter(i => i.status === 'pass').length,
      failed: allItems.filter(i => i.status === 'fail').length,
      overdue: allItems.filter(i => i.isOverdue).length,
    };
  };

  const filteredAreas = areas.filter(area =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Only show loading spinner on native while checking camera permissions
  if (Platform.OS !== 'web' && hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.pass} />
      </View>
    );
  }

  // Check if user has required profile data
  if (!profile?.companyId || !profile?.siteId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Surface style={[styles.header, { backgroundColor: colors.surface }]} elevation={2}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons name="alert-circle" size={32} color={colors.fail} />
              <View style={styles.headerText}>
                <Text variant="headlineMedium" style={{ color: colors.text }}>
                  Setup Required
                </Text>
                <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                  Please contact your administrator to assign you to a site
                </Text>
              </View>
            </View>
          </Surface>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="domain" size={64} color={colors.textSecondary} />
            <Text variant="titleMedium" style={{ color: colors.text, marginTop: 16 }}>
              No Site Assigned
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
              Your profile needs to be assigned to a company and site to use iClean Verification.
            </Text>
            {profile?.companyId && !profile?.siteId && (
              <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 16 }}>
                Company: {profile.companyId}
              </Text>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.pass]}
            tintColor={colors.pass}
            title="Pull to sync data..."
            titleColor={colors.textSecondary}
          />
        }>
        {/* Header Section */}
        <Surface style={[styles.header, { backgroundColor: colors.surface }]} elevation={2}>
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="clipboard-check" size={32} color={colors.pass} />
            <View style={styles.headerText}>
              <Text variant="headlineMedium" style={{ color: colors.text }}>
                iClean Verification
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                Verify cleaning and sanitation activities
              </Text>
              {!loading && areas.length > 0 && (
                <Text variant="labelSmall" style={{ color: colors.textSecondary, marginTop: 4 }}>
                  {refreshing ? 'Syncing...' : 'Pull down to sync data'}
                </Text>
              )}
            </View>
          </View>
        </Surface>

        {/* Entry Options */}
        <View style={styles.entrySection}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: colors.text }]}>
            Select Entry Method
          </Text>
          
          <View style={styles.entryButtons}>
            <Card
              style={[styles.entryCard, { backgroundColor: colors.cardBg }]}
              onPress={() => {
                if (hasPermission) {
                  setShowQRScanner(true);
                } else {
                  Alert.alert('Permission Required', 'Camera permission is required for QR scanning');
                }
              }}
            >
              <Card.Content style={styles.entryCardContent}>
                <MaterialCommunityIcons name="qrcode-scan" size={48} color={colors.pass} />
                <Text variant="titleMedium" style={{ color: colors.text, marginTop: 8 }}>
                  Scan QR Code
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Quick area entry
                </Text>
              </Card.Content>
            </Card>

            <Card
              style={[styles.entryCard, { backgroundColor: colors.cardBg }]}
              onPress={() => setShowAreaList(!showAreaList)}
            >
              <Card.Content style={styles.entryCardContent}>
                <MaterialCommunityIcons name="format-list-bulleted" size={48} color={theme.colors.primary} />
                <Text variant="titleMedium" style={{ color: colors.text, marginTop: 8 }}>
                  Select Area
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Manual selection
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Area List Section */}
        {showAreaList && (
          <View style={styles.areaListSection}>
            <Searchbar
              placeholder="Search areas..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={[styles.searchBar, { backgroundColor: colors.surface }]}
              inputStyle={{ color: colors.text }}
              iconColor={colors.textSecondary}
              placeholderTextColor={colors.textSecondary}
            />

            {loading ? (
              <ActivityIndicator size="large" color={colors.pass} style={{ marginTop: 20 }} />
            ) : areas.length === 0 ? (
              <Surface style={[styles.emptyAreaState, { backgroundColor: colors.cardBg }]} elevation={1}>
                <MaterialCommunityIcons name="map-marker-off" size={48} color={colors.textSecondary} />
                <Text variant="titleMedium" style={{ color: colors.text, marginTop: 16 }}>
                  No Areas Found
                </Text>
                <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  No areas have been configured for your site yet.
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 16, textAlign: 'center' }}>
                  Site ID: {profile?.siteId}
                </Text>
              </Surface>
            ) : filteredAreas.length === 0 ? (
              <Surface style={[styles.emptyAreaState, { backgroundColor: colors.cardBg }]} elevation={1}>
                <MaterialCommunityIcons name="magnify-close" size={48} color={colors.textSecondary} />
                <Text variant="titleMedium" style={{ color: colors.text, marginTop: 16 }}>
                  No Matching Areas
                </Text>
                <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
                  Try adjusting your search term
                </Text>
              </Surface>
            ) : (
              filteredAreas.map((area) => {
                const stats = getAreaStats(area.id);
                
                return (
                  <Pressable
                    key={area.id}
                    onPress={() => navigateToAreaVerification(area.id, area.name)}
                  >
                    <Card style={[styles.areaCard, { backgroundColor: colors.cardBg }]}>
                      <Card.Content>
                        <View style={styles.areaCardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text variant="titleMedium" style={{ color: colors.text }}>
                              {area.name}
                            </Text>
                            <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                              {area.type} • Risk Level: {area.riskLevel}
                            </Text>
                          </View>
                          <MaterialCommunityIcons 
                            name="chevron-right" 
                            size={24} 
                            color={colors.textSecondary} 
                          />
                        </View>
                        
                        <View style={styles.statsRow}>
                          {stats.overdue > 0 && (
                            <Badge size={20} style={[styles.badge, { backgroundColor: colors.overdue }]}>
                              {stats.overdue} Overdue
                            </Badge>
                          )}
                          {stats.pending > 0 && (
                            <Badge size={20} style={[styles.badge, { backgroundColor: colors.pending }]}>
                              {stats.pending} Pending
                            </Badge>
                          )}
                          {stats.completed > 0 && (
                            <Badge size={20} style={[styles.badge, { backgroundColor: colors.pass }]}>
                              {stats.completed} Complete
                            </Badge>
                          )}
                          {stats.failed > 0 && (
                            <Badge size={20} style={[styles.badge, { backgroundColor: colors.fail }]}>
                              {stats.failed} Failed
                            </Badge>
                          )}
                        </View>
                      </Card.Content>
                    </Card>
                  </Pressable>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* QR Scanner Modal */}
      <Portal>
        <Modal
          visible={showQRScanner}
          onDismiss={() => setShowQRScanner(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.scannerContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.webFallback}>
                <MaterialCommunityIcons 
                  name="qrcode-scan" 
                  size={48} 
                  color={colors.textSecondary} 
                />
                <Text style={styles.webFallbackText}>
                  QR scanning is not available on web.
                </Text>
                <Text style={styles.webFallbackText}>
                  Please enter the area code manually.
                </Text>
              </View>
            ) : BarCodeScanner ? (
              <BarCodeScanner
                onBarCodeScanned={showQRScanner ? handleQRCodeScanned : undefined}
                style={StyleSheet.absoluteFillObject}
              />
            ) : null}
            
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerHeader}>
                <Text variant="titleLarge" style={{ color: '#fff' }}>
                  Scan Area QR Code
                </Text>
                <Text variant="bodyMedium" style={{ color: '#fff', marginTop: 8 }}>
                  Position QR code within frame
                </Text>
              </View>
              
              <View style={styles.scannerFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              
              <Button
                mode="contained"
                onPress={() => setShowQRScanner(false)}
                style={styles.bypassButton}
                buttonColor={colors.surface}
                textColor={colors.text}
              >
                Cancel Scan
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  entrySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  entryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  entryCard: {
    flex: 1,
    borderRadius: 12,
  },
  entryCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  areaListSection: {
    flex: 1,
  },
  searchBar: {
    marginBottom: 16,
    borderRadius: 8,
  },
  areaCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  areaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
  },
  modalContainer: {
    flex: 1,
  },
  scannerContainer: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 48,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  webFallbackText: {
    color: '#999',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  scannerHeader: {
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4caf50',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bypassButton: {
    paddingHorizontal: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyAreaState: {
    marginTop: 24,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
});