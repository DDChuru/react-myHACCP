/**
 * Verification Item Card Component
 * Displays individual cleaning item with Pass/Fail toggle and actions
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  IconButton,
  Chip,
  Button,
  Surface,
  TextInput,
  Portal,
  Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  AreaItemProgress,
  StatusColorScheme,
  VerificationItemCardProps,
} from '../types/iCleanVerification';

export default function VerificationItemCard({
  item,
  onVerify,
  onAddPhoto,
  onViewSCI,
  colorScheme,
  isOffline,
}: VerificationItemCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [reasonForFailure, setReasonForFailure] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const animatedHeight = new Animated.Value(0);
  
  // High contrast colors
  const colors = {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    cardBg: '#333333',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#424242',
  };

  const handleVerify = async (status: 'pass' | 'fail') => {
    if (status === 'fail') {
      // Show modal for failure reason (optional but recommended)
      setShowFailureModal(true);
    } else {
      // Pass verification immediately
      setVerifying(true);
      await onVerify(status);
      setVerifying(false);
      setExpanded(false);
    }
  };

  const handleConfirmFail = async () => {
    setShowFailureModal(false);
    setVerifying(true);
    
    // Pass the failure reason and action taken with the fail status
    await onVerify('fail', reasonForFailure, actionTaken);
    
    // Reset fields
    setReasonForFailure('');
    setActionTaken('');
    setVerifying(false);
    setExpanded(false);
  };

  const handleSkipFailureReason = async () => {
    setShowFailureModal(false);
    setVerifying(true);
    
    // Allow fail without reason (users can complete on web later)
    await onVerify('fail', '', '');
    
    setVerifying(false);
    setExpanded(false);
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
    Animated.timing(animatedHeight, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const getStatusIcon = () => {
    switch (item.status) {
      case 'pass':
        return 'check-circle';
      case 'fail':
        return 'close-circle';
      case 'overdue':
        return 'alert-circle';
      default:
        return 'circle-outline';
    }
  };

  const formatLastVerified = () => {
    if (!item.verifiedAt) return 'Never verified';
    
    const date = new Date(item.verifiedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <>
      <Pressable onPress={toggleExpanded}>
        <Card 
          style={[
            styles.card, 
            { 
              backgroundColor: colors.cardBg,
              borderColor: colorScheme.border,
              borderWidth: item.isOverdue ? 2 : 1,
            }
          ]}
        >
          <Card.Content>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons
                name={getStatusIcon()}
                size={24}
                color={colorScheme.background}
              />
              {item.isAutoCompleted && (
                <View style={styles.autoBadge}>
                  <MaterialCommunityIcons name="robot" size={12} color={colors.text} />
                </View>
              )}
            </View>
            
            <View style={styles.itemInfo}>
              <Text variant="titleMedium" style={{ color: colors.text }} numberOfLines={2}>
                {item.itemName}
              </Text>
              <View style={styles.metaRow}>
                {item.frequency && (
                  <>
                    <View style={[styles.frequencyBadge, { 
                      backgroundColor: item.frequency === 'daily' ? '#4caf50' : 
                                      item.frequency === 'weekly' ? '#2196f3' : '#ff9800' 
                    }]}>
                      <Text variant="labelSmall" style={{ color: '#fff', textTransform: 'capitalize' }}>
                        {item.frequency}
                      </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary }}> • </Text>
                  </>
                )}
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                  {formatLastVerified()}
                </Text>
                {item.sciReference && (
                  <>
                    <Text style={{ color: colors.textSecondary }}> • </Text>
                    <Pressable onPress={onViewSCI}>
                      <Text 
                        variant="bodySmall" 
                        style={{ color: '#2196f3', textDecorationLine: 'underline' }}
                      >
                        View SCI
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
            
            <View style={styles.actions}>
              {item.photoCount > 0 && (
                <View style={styles.photoBadge}>
                  <MaterialCommunityIcons 
                    name="image" 
                    size={14} 
                    color={colors.textSecondary} 
                  />
                  <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
                    {item.photoCount}
                  </Text>
                </View>
              )}
              
              {isOffline && (
                <MaterialCommunityIcons 
                  name="cloud-off-outline" 
                  size={16} 
                  color={colors.textSecondary}
                />
              )}
              
              <MaterialCommunityIcons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={colors.textSecondary}
              />
            </View>
          </View>
          
          {/* Status Badges */}
          <View style={styles.badgeRow}>
            {item.isOverdue && (
              <Chip
                icon="alert"
                style={[styles.statusChip, { backgroundColor: colorScheme.background }]}
                textStyle={{ color: colorScheme.text, fontSize: 11 }}
              >
                Overdue
              </Chip>
            )}
            {item.isDue && !item.isOverdue && (
              <Chip
                icon="clock-outline"
                style={[styles.statusChip, { backgroundColor: '#2196f3' }]}
                textStyle={{ color: '#fff', fontSize: 11 }}
              >
                Due Today
              </Chip>
            )}
            {item.failureReason && (
              <Chip
                icon="information"
                style={[styles.statusChip, { backgroundColor: colors.surface }]}
                textStyle={{ color: colors.text, fontSize: 11 }}
              >
                Has Notes
              </Chip>
            )}
          </View>
          
          {/* Expanded Content */}
          {expanded && (
            <Animated.View style={[styles.expandedContent]}>
              {/* Verification Actions */}
              {(item.status === 'pending' || item.status === 'overdue') && (
                <Surface style={[styles.verificationPanel, { backgroundColor: colors.surface }]} elevation={1}>
                  <Text variant="labelLarge" style={{ color: colors.text, marginBottom: 12 }}>
                    Verify Cleaning Status
                  </Text>
                  
                  <View style={styles.verifyButtons}>
                    <Button
                      mode="contained"
                      icon="check"
                      onPress={() => handleVerify('pass')}
                      loading={verifying}
                      disabled={verifying}
                      style={[styles.verifyButton]}
                      buttonColor="#4caf50"
                      textColor="#fff"
                    >
                      Pass
                    </Button>
                    
                    <Button
                      mode="contained"
                      icon="close"
                      onPress={() => handleVerify('fail')}
                      loading={verifying}
                      disabled={verifying}
                      style={[styles.verifyButton]}
                      buttonColor="#f44336"
                      textColor="#fff"
                    >
                      Fail
                    </Button>
                  </View>
                  
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={onAddPhoto}
                    style={[styles.photoButton, { borderColor: colors.border }]}
                    textColor={colors.text}
                  >
                    Add Photo Evidence
                  </Button>
                </Surface>
              )}
              
              {/* Completed Status Display */}
              {(item.status === 'pass' || item.status === 'fail') && (
                <Surface style={[styles.statusPanel, { backgroundColor: colors.surface }]} elevation={1}>
                  <View style={styles.statusHeader}>
                    <MaterialCommunityIcons
                      name={item.status === 'pass' ? 'check-circle' : 'close-circle'}
                      size={32}
                      color={item.status === 'pass' ? '#4caf50' : '#f44336'}
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text variant="titleMedium" style={{ color: colors.text }}>
                        Verification {item.status === 'pass' ? 'Passed' : 'Failed'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                        {formatLastVerified()}
                        {item.isAutoCompleted && ' • Auto-completed'}
                      </Text>
                    </View>
                  </View>
                  
                  {item.failureReason && (
                    <View style={styles.notesSection}>
                      <Text variant="labelMedium" style={{ color: colors.text }}>
                        Notes:
                      </Text>
                      <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 4 }}>
                        {item.failureReason}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.completedActions}>
                    <Button
                      mode="text"
                      icon="camera-plus"
                      onPress={onAddPhoto}
                      textColor={colors.text}
                    >
                      Add Photo
                    </Button>
                    
                    {item.sciReference && (
                      <Button
                        mode="text"
                        icon="file-document"
                        onPress={onViewSCI}
                        textColor="#2196f3"
                      >
                        View SCI
                      </Button>
                    )}
                  </View>
                </Surface>
              )}
              
              {/* Item Details */}
              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                    Due Date:
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.text, marginLeft: 8 }}>
                    {new Date(item.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
          </Card.Content>
        </Card>
      </Pressable>

      {/* Failure Reason Modal */}
      <Portal>
        <Modal
        visible={showFailureModal}
        onDismiss={() => setShowFailureModal(false)}
        contentContainerStyle={[styles.modalContent, { backgroundColor: colors.surface }]}
      >
        <View style={styles.modalHeader}>
          <MaterialCommunityIcons name="alert-circle" size={32} color="#f44336" />
          <Text variant="titleLarge" style={{ color: colors.text, marginLeft: 12 }}>
            Mark as Failed
          </Text>
        </View>
        
        <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginBottom: 16 }}>
          Please provide details about the failure (optional - can be completed on web later)
        </Text>
        
        <TextInput
          label="Reason for Failure"
          value={reasonForFailure}
          onChangeText={setReasonForFailure}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={{ marginBottom: 12, backgroundColor: colors.cardBg }}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor="#f44336"
          placeholder="e.g., Equipment not properly cleaned, visible residue found..."
          placeholderTextColor={colors.textSecondary}
        />
        
        <TextInput
          label="Action Taken"
          value={actionTaken}
          onChangeText={setActionTaken}
          mode="outlined"
          multiline
          numberOfLines={2}
          style={{ marginBottom: 20, backgroundColor: colors.cardBg }}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor="#ff9800"
          placeholder="e.g., Re-cleaned immediately, scheduled for deep clean..."
          placeholderTextColor={colors.textSecondary}
        />
        
        <View style={styles.modalActions}>
          <Button
            mode="outlined"
            onPress={handleSkipFailureReason}
            style={{ flex: 1, marginRight: 8 }}
            textColor={colors.text}
          >
            Skip for Now
          </Button>
          
          <Button
            mode="contained"
            onPress={handleConfirmFail}
            style={{ flex: 1, marginLeft: 8 }}
            buttonColor="#f44336"
            textColor="#fff"
            disabled={!reasonForFailure && !actionTaken}
          >
            Confirm Failure
          </Button>
        </View>
        
        <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
          Note: You can add or edit details later on the web portal
        </Text>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    position: 'relative',
    marginRight: 12,
  },
  autoBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#2196f3',
    borderRadius: 6,
    padding: 2,
  },
  itemInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  frequencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  photoChip: {
    height: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  statusChip: {
    minHeight: 28,
    paddingVertical: 2,
  },
  expandedContent: {
    marginTop: 16,
  },
  verificationPanel: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  verifyButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  verifyButton: {
    flex: 1,
  },
  photoButton: {
    marginTop: 4,
  },
  statusPanel: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  completedActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#424242',
  },
  detailsSection: {
    paddingTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalContent: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});