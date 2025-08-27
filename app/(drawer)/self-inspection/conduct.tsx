import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  Surface, 
  Text, 
  Card, 
  Button, 
  useTheme,
  FAB,
  Chip,
  IconButton,
  ActivityIndicator,
  Portal,
  Modal,
  Banner
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { collection, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import { useOffline } from '../../../hooks/useOffline';
// SignatureCapture removed - needs replacement
// import SignatureCapture from '../../../components/SignatureCapture';
import { getSelfInspection, updateSelfInspection, startInspection } from '../../../services/selfInspectionService';

interface Issue {
  id: string;
  areaId: string;
  areaName: string;
  category: string;
  severity: string;
  description: string;
  images: any[];
  proposedActionDate: Date | any; // Can be Date, Timestamp, or string
  responsibleUserId: string;
  responsibleUserName: string;
  responsibleUserFullName?: string; // Optional full name from userProfile
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved';
}

export default function ConductInspectionScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { isOffline, hasPendingChanges } = useOffline();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [showSignature, setShowSignature] = useState(false);
  const [userSignature, setUserSignature] = useState<string | null>(null);
  const [inspection, setInspection] = useState<any>(null);
  
  // Parse params
  const inspectionId = params.inspectionId as string;
  const companyId = params.companyId as string || '2XTSaqxU41zCTBIVJeXb';
  const siteId = params.siteId as string || params.site as string;
  const siteName = params.siteName as string || '';
  const captureBeforeAfter = params.captureBeforeAfter === 'true';

  useEffect(() => {
    loadInspectionData();
    fetchUserSignature();
  }, []);

  // Reload inspection data when returning from add-issue screen
  useFocusEffect(
    useCallback(() => {
      if (inspectionId && inspectionId !== 'temp') {
        loadInspectionData();
      }
    }, [inspectionId])
  );

  const loadInspectionData = async () => {
    try {
      setLoading(true);
      
      // Load the inspection details
      if (inspectionId && inspectionId !== 'temp') {
        const inspectionData = await getSelfInspection(inspectionId, companyId);
        if (inspectionData) {
          setInspection(inspectionData);
          
          // Update inspection status to in_progress if it's pending
          if (inspectionData.status === 'pending') {
            await startInspection(inspectionId, companyId);
          }
          
          // Load all areas for the site
          await fetchAreaDetails();
          
          // Load existing issues if any
          if (inspectionData.issues && inspectionData.issues.length > 0) {
            setIssues(inspectionData.issues);
          }
        }
      } else {
        // New inspection, load all areas
        await fetchAreaDetails();
      }
    } catch (error) {
      console.error('Error loading inspection:', error);
      Alert.alert('Error', 'Failed to load inspection details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAreaDetails = async () => {
    try {
      // Fetch all areas for the site
      const areasCollection = collection(db, `companies/${companyId}/siteAreas`);
      const areasSnapshot = await getDocs(areasCollection);
      const allAreas = areasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter to current site if siteId is available
      const siteAreas = siteId 
        ? allAreas.filter(area => area.siteId === siteId)
        : allAreas;
      
      setAreas(siteAreas);
    } catch (error) {
      console.error('Error fetching areas:', error);
    }
  };

  const fetchUserSignature = async () => {
    try {
      if (user?.uid) {
        // Check if user has a stored signature
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userData?.signatureUrl) {
          setUserSignature(userData.signatureUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching user signature:', error);
    }
  };

  // Group issues by area for display
  const issuesByArea = areas.reduce((acc, area) => {
    acc[area.id] = issues.filter(issue => issue.areaId === area.id);
    return acc;
  }, {} as Record<string, Issue[]>);

  const handleAddIssue = () => {
    // Navigate to issue creation screen with new params structure
    router.push({
      pathname: '/(drawer)/self-inspection/add-issue',
      params: {
        inspectionId: params.inspectionId || 'temp', // Use actual inspection ID
        companyId: companyId,
        siteId: siteId,
        siteName: siteName || 'Main Site',
        captureBeforeAfter: captureBeforeAfter.toString()
      }
    });
  };


  const handleCompleteInspection = () => {
    // Show signature modal
    setShowSignature(true);
  };

  const handleSignatureSave = async (signature: string) => {
    setShowSignature(false);
    await handleSaveInspection(signature);
  };

  const handleSaveInspection = async (signature: string) => {
    try {
      setSaving(true);
      
      // Update the existing inspection to mark it as completed
      const updates = {
        inspectorSignature: signature,
        signedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        status: 'completed' as const,
        completedBy: user?.uid,
        completedByName: user?.displayName || user?.email,
        issueCount: issues.length
      };

      console.log('Completing inspection:', {
        inspectionId,
        companyId,
        status: updates.status,
        issueCount: updates.issueCount
      });

      await updateSelfInspection(
        inspectionId,
        updates,
        companyId
      );

      Alert.alert(
        'Success',
        isOffline 
          ? 'Inspection saved locally. Will sync when online.'
          : 'Inspection completed successfully',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back to the main self-inspection screen
              router.replace({
                pathname: '/(drawer)/self-inspection',
                params: {}
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error completing inspection:', error);
      Alert.alert('Error', 'Failed to complete inspection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={{ marginTop: 16 }}>Loading areas...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <View>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              {inspection?.name || 'Conducting Inspection'}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {`${inspection?.site || siteName} • ${inspection?.status || 'In Progress'}`}
            </Text>
            {isOffline && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <MaterialCommunityIcons 
                  name="wifi-off" 
                  size={16} 
                  color={theme.colors.warning} 
                />
                <Text variant="bodySmall" style={{ color: theme.colors.warning, marginLeft: 4 }}>
                  Working offline - Changes will sync when connected
                </Text>
              </View>
            )}
          </View>
        </Surface>

        {/* Inspection Overview */}
        <View style={styles.content}>

          {/* Progress Summary Card */}
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
                    {areas.length}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Areas Included
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text variant="displaySmall" style={{ color: issues.length > 0 ? theme.colors.error : theme.colors.primary }}>
                    {issues.length}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Issues Found
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Issues List */}
          {issues.length === 0 ? (
            <Card style={[styles.noIssuesCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
                <MaterialCommunityIcons 
                  name="check-circle-outline" 
                  size={64} 
                  color={theme.colors.primary}
                  style={{ opacity: 0.5 }}
                />
                <Text variant="titleMedium" style={{ marginTop: 16, textAlign: 'center', color: theme.colors.onSurface }}>
                  No issues found yet
                </Text>
                <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                  Tap the + button to report any issues
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Issues Found</Text>
              {issues.map((issue, index) => (
                <Card key={issue.id} style={[styles.issueCard, { backgroundColor: theme.colors.surface }]}>
                  <Card.Content>
                    <View>
                      <View style={styles.issueHeader}>
                        <Chip 
                          mode="flat" 
                          compact 
                          textStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}
                          style={{ backgroundColor: theme.colors.surfaceVariant }}
                        >
                          {issue.areaName}
                        </Chip>
                        <Chip 
                          mode="flat"
                          compact
                          textStyle={{ 
                            fontSize: 11,
                            color: '#ffffff',
                            fontWeight: 'bold'
                          }}
                          style={{ 
                            backgroundColor: 
                              issue.severity === 'Critical' ? '#dc2626' :
                              issue.severity === 'Major' ? '#f59e0b' : '#10b981',
                            marginLeft: 8
                          }}
                        >
                          {issue.severity}
                        </Chip>
                      </View>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                        Category: {issue.category}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurface }}>
                      {issue.description}
                    </Text>
                    <View style={styles.issueFooter}>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {`Assigned to: ${(() => {
                          // Primary: Use fullName from userProfile (always populated when using userProfile)
                          if (issue.responsibleUserFullName) {
                            return issue.responsibleUserFullName.split(' ')[0];
                          }
                          // Fallback: responsibleUserName should now be fullName, extract first name
                          if (issue.responsibleUserName && !issue.responsibleUserName.includes('@')) {
                            return issue.responsibleUserName.split(' ')[0];
                          }
                          // Legacy fallback: If it's an email (shouldn't happen with new data)
                          if (issue.responsibleUserName?.includes('@')) {
                            const namePart = issue.responsibleUserName.split('@')[0];
                            return namePart.replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()).split(' ')[0];
                          }
                          return 'Unassigned';
                        })()}`}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {`Due: ${(() => {
                          if (!issue.proposedActionDate) return 'Not set';
                          
                          try {
                            // Handle Firestore Timestamp
                            const date = issue.proposedActionDate.toDate 
                              ? issue.proposedActionDate.toDate() 
                              : new Date(issue.proposedActionDate);
                            
                            // Check if date is valid
                            if (isNaN(date.getTime())) return 'Invalid Date';
                            
                            return date.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            });
                          } catch (error) {
                            console.error('Error formatting date:', error);
                            return 'Invalid Date';
                          }
                        })()}`}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

            {/* Complete Inspection Button */}
            <View style={{ marginTop: 24, marginBottom: 16 }}>
              <Button
                mode="contained"
                onPress={handleCompleteInspection}
                loading={saving}
                disabled={saving}
                style={styles.completeButton}
                icon="check-circle"
              >
                Complete Inspection
              </Button>
            </View>
          </View>
      </ScrollView>

      {/* FAB for adding issues */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddIssue}
        label="Add Issue"
      />

      {/* Signature Modal - SignatureCapture removed, needs replacement */}
      {/* <SignatureCapture
        visible={showSignature}
        onDismiss={() => setShowSignature(false)}
        onSave={handleSignatureSave}
        title="Inspector Signature"
        description="Please sign to confirm this inspection"
        existingSignature={userSignature || undefined}
      /> */}
    </>
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
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  areaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  sectionTitle: {
    marginVertical: 12,
    marginLeft: 4,
  },
  areaCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  noIssuesCard: {
    marginVertical: 32,
    borderRadius: 12,
  },
  issueCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navigationButtons: {
    flexDirection: 'row',
    marginTop: 24,
  },
  completeButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});