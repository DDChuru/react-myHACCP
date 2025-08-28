/**
 * Monthly Progress View Component
 * Displays a calendar grid showing daily completion status (d1-d31)
 * for compliance reporting in iClean Verification
 */

import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  Surface,
  Text,
  useTheme,
  Chip,
  IconButton,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DayStatus {
  day: number;
  status: 'pass' | 'fail' | 'pending' | 'not-due';
  verifiedAt?: string;
  verifiedBy?: string;
}

interface MonthlyProgressData {
  itemId: string;
  itemName: string;
  month: number; // 0-11
  year: number;
  dailyStatuses: { [key: string]: DayStatus }; // d1, d2, ... d31
  completionRate: number;
}

interface MonthlyProgressViewProps {
  data: MonthlyProgressData;
  onDayPress?: (day: number, status: DayStatus) => void;
  compact?: boolean;
}

export default function MonthlyProgressView({
  data,
  onDayPress,
  compact = false,
}: MonthlyProgressViewProps) {
  const theme = useTheme();

  // High contrast colors
  const colors = {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    cardBg: '#333333',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#424242',
    pass: '#4caf50',
    fail: '#f44336',
    pending: '#757575',
    notDue: '#424242',
    today: '#2196f3',
  };

  // Get days in month
  const daysInMonth = useMemo(() => {
    return new Date(data.year, data.month + 1, 0).getDate();
  }, [data.year, data.month]);

  // Get first day of week (0-6, Sunday-Saturday)
  const firstDayOfWeek = useMemo(() => {
    return new Date(data.year, data.month, 1).getDay();
  }, [data.year, data.month]);

  // Get current day
  const today = new Date();
  const isCurrentMonth = today.getMonth() === data.month && today.getFullYear() === data.year;
  const currentDay = isCurrentMonth ? today.getDate() : null;

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const grid: (DayStatus | null)[] = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = `d${day}`;
      const dayStatus = data.dailyStatuses[dayKey] || {
        day,
        status: day > (currentDay || 31) ? 'not-due' : 'pending',
      };
      grid.push(dayStatus);
    }
    
    // Fill remaining cells to complete the grid
    while (grid.length % 7 !== 0) {
      grid.push(null);
    }
    
    return grid;
  }, [data.dailyStatuses, daysInMonth, firstDayOfWeek, currentDay]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return colors.pass;
      case 'fail':
        return colors.fail;
      case 'pending':
        return colors.pending;
      case 'not-due':
        return colors.notDue;
      default:
        return colors.border;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return 'check';
      case 'fail':
        return 'close';
      case 'pending':
        return 'clock-outline';
      case 'not-due':
        return '';
      default:
        return '';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  if (compact) {
    // Compact view - single row with completion summary
    return (
      <Surface style={[styles.compactContainer, { backgroundColor: colors.cardBg }]} elevation={1}>
        <View style={styles.compactHeader}>
          <Text variant="titleSmall" style={{ color: colors.text }}>
            {monthNames[data.month]} {data.year}
          </Text>
          <Chip
            style={[
              styles.completionChip,
              { backgroundColor: data.completionRate === 100 ? colors.pass : colors.pending }
            ]}
            textStyle={{ color: '#fff' }}
          >
            {Math.round(data.completionRate)}% Complete
          </Chip>
        </View>
        
        <View style={styles.compactDays}>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayKey = `d${day}`;
            const dayStatus = data.dailyStatuses[dayKey];
            const status = dayStatus?.status || (day > (currentDay || 31) ? 'not-due' : 'pending');
            const isToday = day === currentDay;
            
            return (
              <View
                key={day}
                style={[
                  styles.compactDay,
                  { backgroundColor: getStatusColor(status) },
                  isToday && styles.compactDayToday,
                ]}
              />
            );
          })}
        </View>
      </Surface>
    );
  }

  // Full calendar view
  return (
    <Surface style={[styles.container, { backgroundColor: colors.surface }]} elevation={2}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text variant="titleMedium" style={{ color: colors.text }}>
            {data.itemName}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
            {monthNames[data.month]} {data.year}
          </Text>
        </View>
        <View style={styles.headerStats}>
          <Chip
            icon="check-circle"
            style={[styles.statChip, { backgroundColor: colors.pass + '20' }]}
            textStyle={{ color: colors.pass }}
          >
            {Object.values(data.dailyStatuses).filter(d => d?.status === 'pass').length}
          </Chip>
          <Chip
            icon="close-circle"
            style={[styles.statChip, { backgroundColor: colors.fail + '20' }]}
            textStyle={{ color: colors.fail }}
          >
            {Object.values(data.dailyStatuses).filter(d => d?.status === 'fail').length}
          </Chip>
          <Chip
            style={[styles.statChip, { backgroundColor: colors.pending + '40' }]}
            textStyle={{ color: colors.text }}
          >
            {Math.round(data.completionRate)}%
          </Chip>
        </View>
      </View>

      {/* Week days header */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayCell}>
            <Text variant="labelSmall" style={{ color: colors.textSecondary }}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <ScrollView style={styles.calendarGrid}>
        <View style={styles.gridContainer}>
          {calendarGrid.map((dayStatus, index) => {
            if (!dayStatus) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const isToday = dayStatus.day === currentDay;
            const statusColor = getStatusColor(dayStatus.status);
            const icon = getStatusIcon(dayStatus.status);

            return (
              <Pressable
                key={`day-${dayStatus.day}`}
                style={[
                  styles.dayCell,
                  { backgroundColor: colors.cardBg },
                  isToday && { borderColor: colors.today, borderWidth: 2 },
                ]}
                onPress={() => onDayPress?.(dayStatus.day, dayStatus)}
              >
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.dayNumber,
                    { color: isToday ? colors.today : colors.text }
                  ]}
                >
                  {dayStatus.day}
                </Text>
                
                {icon && (
                  <MaterialCommunityIcons
                    name={icon as any}
                    size={16}
                    color={statusColor}
                    style={styles.dayIcon}
                  />
                )}
                
                {dayStatus.status !== 'not-due' && dayStatus.status !== 'pending' && (
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: statusColor }
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.pass }]} />
          <Text variant="labelSmall" style={{ color: colors.textSecondary }}>Pass</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.fail }]} />
          <Text variant="labelSmall" style={{ color: colors.textSecondary }}>Fail</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.pending }]} />
          <Text variant="labelSmall" style={{ color: colors.textSecondary }}>Pending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.today, borderWidth: 1 }]} />
          <Text variant="labelSmall" style={{ color: colors.textSecondary }}>Today</Text>
        </View>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    height: 28,
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarGrid: {
    maxHeight: 320,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayNumber: {
    fontWeight: '500',
  },
  dayIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  statusIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Compact view styles
  compactContainer: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionChip: {
    height: 24,
  },
  compactDays: {
    flexDirection: 'row',
    gap: 2,
  },
  compactDay: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  compactDayToday: {
    height: 6,
    marginTop: -1,
  },
});