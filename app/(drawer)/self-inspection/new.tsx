import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { 
  Surface, 
  Text, 
  Card, 
  Button, 
  useTheme, 
  Checkbox, 
  Divider,
  ActivityIndicator,
  Searchbar,
  Chip,
  SegmentedButtons,
  Switch,
  TextInput
} from 'react-native-paper';
import { router } from 'expo-router';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuthProfile } from '../../../hooks/useAuthProfile';
import { createSelfInspection, SelfInspection } from '../../../services/selfInspectionService';
import { useAuth } from '../../../hooks/useAuth';

export default function NewSelfInspectionScreen() {
  const theme = useTheme();
  const { userProfile, isAdmin, isSiteAdmin, getUserSites } = useAuthProfile();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'site' | 'options'>('site'); // Removed 'areas' step
  const [sites, setSites] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]); // Will be loaded but all included by default
  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [raiseNCR, setRaiseNCR] = useState(false);
  const [captureBeforeAfter, setCaptureBeforeAfter] = useState(true);
  const [inspectionName, setInspectionName] = useState('');

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      
      // Use the company ID from user profile or fallback
      const companyId = userProfile?.companyId || '2XTSaqxU41zCTBIVJeXb';
      
      console.log('[fetchSites] Starting fetch for companyId:', companyId);
      console.log('[fetchSites] User:', userProfile?.email);
      console.log('[fetchSites] Is Admin:', isAdmin());
      console.log('[fetchSites] Is SiteAdmin:', isSiteAdmin());
      console.log('[fetchSites] Allocated Sites:', userProfile?.allocatedSiteIds);
      
      let sitesQuery;
      
      // Role-based site filtering using the new auth profile
      if (isAdmin() || userProfile?.roles?.superAdmin) {
        // Admin/SuperAdmin sees all sites
        console.log('[fetchSites] Admin user - fetching all sites');
        sitesQuery = collection(db, `companies/${companyId}/sites`);
      } else if (userProfile?.allocatedSiteIds && userProfile.allocatedSiteIds.length > 0) {
        // User with specific site allocations
        console.log('[fetchSites] Fetching allocated sites:', userProfile.allocatedSiteIds);
        sitesQuery = query(
          collection(db, `companies/${companyId}/sites`),
          where(documentId(), 'in', userProfile.allocatedSiteIds)
        );
      } else {
        // No sites allocated - show all for now (you can change this logic)
        console.log('[fetchSites] No specific sites allocated - showing all');
        sitesQuery = collection(db, `companies/${companyId}/sites`);
      }
      
      const sitesSnapshot = await getDocs(sitesQuery);
      console.log('[fetchSites] Found sites:', sitesSnapshot.size);
      
      const sitesData = sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('[fetchSites] Sites data:', sitesData);
      setSites(sitesData);
    } catch (error) {
      console.error('[fetchSites] Error:', error);
      // Show error to user
      alert('Error loading sites. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async (siteId: string) => {
    try {
      setLoading(true);
      const companyId = userProfile?.companyId || '2XTSaqxU41zCTBIVJeXb';
      const areasQuery = query(
        collection(db, `companies/${companyId}/siteAreas`),
        where('siteId', '==', siteId)
      );
      
      const areasSnapshot = await getDocs(areasQuery);
      const areasData = areasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAreas(areasData);
    } catch (error) {
      console.error('Error fetching areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSiteSelect = async (site: any) => {
    setSelectedSite(site);
    await fetchAreas(site.id);
    
    // Generate a default inspection name
    const date = new Date().toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      hour12: true 
    }).toLowerCase();
    setInspectionName(`${date} ${time} - ${site.name} Inspection`);
    
    // Go directly to options (skip area selection)
    setStep('options');
  };

  const handleStartInspection = async () => {
    // Validate inspection name
    if (!inspectionName.trim()) {
      Alert.alert(
        'Name Required',
        'Please enter a name for this inspection.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      setLoading(true);
      
      const companyId = userProfile?.companyId || '2XTSaqxU41zCTBIVJeXb';
      
      // Create inspection data - immediately persist to Firestore
      const inspectionData: Omit<SelfInspection, 'id' | 'createdAt' | 'updatedAt'> = {
        // Basic info
        name: inspectionName.trim(),
        site: selectedSite.name,
        siteId: selectedSite.id,
        checklist: 'Standard Self-Inspection',
        
        // Status - start as draft and immediately move to pending
        status: 'pending',
        
        // Progress - will be updated as inspection progresses
        totalItems: areas.length * 10, // Estimate 10 items per area
        completedItems: 0,
        
        // Issues
        issues: [],
        issueCount: 0,
        
        // Timestamps
        scheduledDate: new Date(),
        
        // User info
        createdBy: user?.uid || '',
        createdByName: user?.displayName || user?.email || 'Unknown',
        assignedTo: user?.uid,
        assignedToName: user?.displayName || user?.email,
        
        // Company
        companyId: companyId
      };
      
      // Create inspection in Firestore
      const inspectionId = await createSelfInspection(inspectionData, companyId);
      
      console.log('✅ Inspection created with ID:', inspectionId);
      
      // Navigate to conduct screen with the new inspection ID
      router.push({
        pathname: '/self-inspection/conduct',
        params: {
          inspectionId: inspectionId,
          companyId: companyId,
          siteId: selectedSite.id,
          siteName: selectedSite.name,
          raiseNCR: raiseNCR.toString(),
          captureBeforeAfter: captureBeforeAfter.toString()
        }
      });
    } catch (error) {
      console.error('Error creating inspection:', error);
      Alert.alert(
        'Error',
        'Failed to create inspection. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = sites.filter(site => 
    site.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text variant="headlineSmall">New Self Inspection</Text>
        <Text variant="bodyMedium" style={{ opacity: 0.7, marginTop: 4 }}>
          {step === 'site' && 'Select inspection site'}
          {step === 'options' && 'Configure inspection details'}
        </Text>
      </Surface>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressSteps}>
          <Chip mode="flat" selected={step === 'site'}>1. Select Site</Chip>
          <Chip mode="flat" selected={step === 'options'}>2. Inspection Details</Chip>
        </View>
      </View>

      <View style={styles.content}>
        {/* Step 1: Site Selection */}
        {step === 'site' && (
          <>
            <Searchbar
              placeholder="Search sites..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchbar}
            />
            
            {filteredSites.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Card.Content>
                  <Text variant="bodyLarge" style={{ textAlign: 'center' }}>
                    No sites available
                  </Text>
                  <Text variant="bodyMedium" style={{ textAlign: 'center', opacity: 0.6, marginTop: 8 }}>
                    {isSiteAdmin() 
                      ? 'You have no assigned sites. Contact your administrator.'
                      : 'No sites found for this company.'}
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              filteredSites.map(site => (
                <Card 
                  key={site.id} 
                  style={styles.card}
                  onPress={() => handleSiteSelect(site)}
                >
                  <Card.Content>
                    <Text variant="titleMedium">{site.name}</Text>
                    {site.address && (
                      <Text variant="bodySmall" style={{ opacity: 0.7, marginTop: 4 }}>
                        {site.address}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </>
        )}

        {/* Step 2: Options */}
        {step === 'options' && (
          <>
            <Card style={styles.selectedCard}>
              <Card.Content>
                <Text variant="labelSmall" style={{ opacity: 0.6 }}>Inspection Summary</Text>
                <Text variant="titleMedium">{selectedSite?.name}</Text>
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  {areas.length > 0 ? `${areas.length} area(s) will be inspected` : 'Loading areas...'}
                </Text>
              </Card.Content>
            </Card>

            {/* Inspection Name Input */}
            <Card style={styles.card}>
              <Card.Title title="Inspection Details" />
              <Card.Content>
                <TextInput
                  label="Inspection Name *"
                  value={inspectionName}
                  onChangeText={setInspectionName}
                  mode="outlined"
                  placeholder={`e.g., ${new Date().toLocaleDateString()} Morning Inspection`}
                  style={{ marginBottom: 8 }}
                />
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                  Give this inspection a descriptive name for easy identification
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Title title="Inspection Options" />
              <Card.Content>
                <View style={styles.optionRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall">Raise NCRs</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2 }}>
                      Create Non-Conformance Reports for issues (Coming soon)
                    </Text>
                  </View>
                  <Switch
                    value={raiseNCR}
                    onValueChange={setRaiseNCR}
                    disabled={true}
                  />
                </View>

                <Divider style={{ marginVertical: 12 }} />

                <View style={styles.optionRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleSmall">Before/After Photos</Text>
                    <Text variant="bodySmall" style={{ opacity: 0.6, marginTop: 2 }}>
                      Capture evidence photos for issues found
                    </Text>
                  </View>
                  <Switch
                    value={captureBeforeAfter}
                    onValueChange={setCaptureBeforeAfter}
                  />
                </View>
              </Card.Content>
            </Card>

            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setStep('site')}
                style={{ flex: 1, marginRight: 8 }}
              >
                Back
              </Button>
              <Button 
                mode="contained" 
                onPress={handleStartInspection}
                style={{ flex: 1, marginLeft: 8 }}
                icon="clipboard-check"
              >
                Start Inspection
              </Button>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  content: {
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
    elevation: 2,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  selectedCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
  },
  emptyCard: {
    marginVertical: 32,
    borderRadius: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
  },
});