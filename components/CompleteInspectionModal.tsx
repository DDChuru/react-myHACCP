/**
 * Complete Inspection Modal Component
 * Shows review of items to be auto-passed and confirms completion
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Button,
  Surface,
  Divider,
  List,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  CompleteInspectionModalProps,
  AreaItemProgress,
} from '../types/iCleanVerification';

export default function CompleteInspectionModal({
  visible,
  onConfirm,
  onCancel,
  dailyItems,
  weeklyItems,
  monthlyItems,
}: CompleteInspectionModalProps) {
  // High contrast colors
  const colors = {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    cardBg: '#333333',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#424242',
    pass: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
  };

  const renderItemList = (items: AreaItemProgress[], title: string, icon: string, color: string) => {
    if (items.length === 0) return null;
    
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Chip style={{ backgroundColor: color }} textStyle={{ color: '#fff', fontSize: 12 }}>
            {items.length}
          </Chip>
        </View>
        
        <View style={styles.itemList}>
          {items.slice(0, 5).map((item) => (
            <View key={item.areaItemId} style={styles.itemRow}>
              <MaterialCommunityIcons 
                name={item.status === 'pass' ? 'check' : item.status === 'fail' ? 'close' : 'circle-outline'} 
                size={16} 
                color={item.status === 'pass' ? colors.pass : item.status === 'fail' ? '#f44336' : colors.textSecondary} 
              />
              <Text variant="bodySmall" style={[styles.itemText, { color: colors.textSecondary }]}>
                {item.itemName}
              </Text>
            </View>
          ))}
          
          {items.length > 5 && (
            <Text variant="bodySmall" style={{ color: colors.textSecondary, fontStyle: 'italic', marginTop: 4 }}>
              and {items.length - 5} more items...
            </Text>
          )}
        </View>
      </View>
    );
  };

  const totalAutoPass = dailyItems.toAutoPass.length;
  const totalManual = dailyItems.manual.length;
  const weeklyPending = weeklyItems.filter(i => i.status === 'pending').length;
  const monthlyPending = monthlyItems.filter(i => i.status === 'pending').length;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.surface }]}
      >
        <ScrollView>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="check-all" size={32} color={colors.pass} />
            <Text variant="headlineSmall" style={[styles.headerTitle, { color: colors.text }]}>
              Complete Inspection Review
            </Text>
            <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Review items before completing the inspection
            </Text>
          </View>
          
          <Divider style={{ backgroundColor: colors.border }} />
          
          {/* Summary Cards */}
          <View style={styles.summaryCards}>
            <Surface style={[styles.summaryCard, { backgroundColor: colors.cardBg }]} elevation={1}>
              <MaterialCommunityIcons name="robot" size={24} color={colors.info} />
              <Text variant="headlineSmall" style={{ color: colors.text }}>{totalAutoPass}</Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Will Auto-Pass</Text>
            </Surface>
            
            <Surface style={[styles.summaryCard, { backgroundColor: colors.cardBg }]} elevation={1}>
              <MaterialCommunityIcons name="check-circle" size={24} color={colors.pass} />
              <Text variant="headlineSmall" style={{ color: colors.text }}>{totalManual}</Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Already Verified</Text>
            </Surface>
          </View>
          
          {/* Important Notice */}
          <Surface style={[styles.noticeBox, { backgroundColor: colors.cardBg }]} elevation={1}>
            <View style={styles.noticeHeader}>
              <MaterialCommunityIcons name="information" size={20} color={colors.info} />
              <Text variant="labelLarge" style={[styles.noticeTitle, { color: colors.text }]}>
                Important
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 8 }}>
              • Only daily items that are due will be auto-passed
              {'\n'}• Weekly and monthly items will remain unchanged
              {'\n'}• This action cannot be undone
            </Text>
          </Surface>
          
          <Divider style={{ backgroundColor: colors.border, marginVertical: 16 }} />
          
          {/* Item Lists */}
          {renderItemList(
            dailyItems.toAutoPass,
            'Daily Items to Auto-Pass',
            'robot',
            colors.info
          )}
          
          {renderItemList(
            dailyItems.manual,
            'Manually Verified Items',
            'check-circle',
            colors.pass
          )}
          
          {/* Weekly/Monthly Notice */}
          {(weeklyPending > 0 || monthlyPending > 0) && (
            <Surface style={[styles.pendingNotice, { backgroundColor: colors.cardBg }]} elevation={1}>
              <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.warning} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text variant="labelMedium" style={{ color: colors.text }}>
                  Other Schedule Items
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 4 }}>
                  {weeklyPending > 0 && `${weeklyPending} weekly items`}
                  {weeklyPending > 0 && monthlyPending > 0 && ' and '}
                  {monthlyPending > 0 && `${monthlyPending} monthly items`}
                  {' will not be auto-completed'}
                </Text>
              </View>
            </Surface>
          )}
          
          <Divider style={{ backgroundColor: colors.border, marginVertical: 16 }} />
          
          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={[styles.actionButton, { borderColor: colors.border }]}
              textColor={colors.text}
            >
              Cancel
            </Button>
            
            <Button
              mode="contained"
              onPress={onConfirm}
              icon="check-all"
              style={styles.actionButton}
              buttonColor={colors.pass}
              textColor="#fff"
            >
              Complete Inspection
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  headerTitle: {
    marginTop: 12,
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  summaryCards: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  noticeBox: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeTitle: {
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
  },
  itemList: {
    paddingLeft: 32,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  itemText: {
    flex: 1,
  },
  pendingNotice: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});