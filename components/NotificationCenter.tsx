import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Portal,
  Modal,
  Surface,
  Text,
  IconButton,
  List,
  Divider,
  Button,
  Badge,
  useTheme,
  Chip,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NotificationService from '../services/NotificationService';
import { router } from 'expo-router';

interface StoredNotification {
  id: string;
  title: string;
  body: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

interface NotificationCenterProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function NotificationCenter({ visible, onDismiss }: NotificationCenterProps) {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    try {
      const stored = await NotificationService.getStoredNotifications();
      setNotifications(stored);
      const unread = stored.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification: StoredNotification) => {
    // Mark as read
    await NotificationService.markNotificationAsRead(notification.id);
    
    // Navigate based on type
    if (notification.data?.type === 'issue_assigned' && notification.data?.issueId) {
      onDismiss();
      router.push({
        pathname: '/self-inspection/corrective-action',
        params: {
          issueId: notification.data.issueId,
          inspectionId: notification.data.inspectionId
        }
      });
    } else if (notification.data?.type === 'issue_overdue') {
      onDismiss();
      router.push('/self-inspection/dashboard');
    }
    
    // Reload notifications
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead();
    loadNotifications();
  };

  const handleClearAll = async () => {
    // Clear all notifications
    await NotificationService.markAllAsRead();
    setNotifications([]);
    onDismiss();
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'issue_assigned':
        return 'clipboard-alert';
      case 'issue_overdue':
        return 'clock-alert';
      case 'issue_escalated':
        return 'arrow-up-bold';
      case 'acknowledgement_reminder':
        return 'bell-ring';
      case 'inspection_summary':
        return 'chart-line';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type?: string) => {
    switch (type) {
      case 'issue_overdue':
      case 'issue_escalated':
        return theme.colors.error;
      case 'acknowledgement_reminder':
        return theme.colors.warning;
      case 'issue_assigned':
        return theme.colors.primary;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Surface style={styles.container} elevation={4}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <MaterialCommunityIcons 
                name="bell" 
                size={24} 
                color={theme.colors.primary}
              />
              <Text variant="titleLarge" style={{ marginLeft: 8 }}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Badge style={styles.badge}>{unreadCount}</Badge>
              )}
            </View>
            <IconButton
              icon="close"
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          <Divider />

          {/* Actions Bar */}
          {notifications.length > 0 && (
            <>
              <View style={styles.actionsBar}>
                <Button
                  mode="text"
                  onPress={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  compact
                >
                  Mark all as read
                </Button>
                <Button
                  mode="text"
                  onPress={handleClearAll}
                  compact
                >
                  Clear all
                </Button>
              </View>
              <Divider />
            </>
          )}

          {/* Notifications List */}
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="bell-off-outline" 
                  size={48} 
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No notifications
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtext}>
                  You'll see notifications here when you have them
                </Text>
              </View>
            ) : (
              notifications.map((notification, index) => (
                <React.Fragment key={notification.id}>
                  <TouchableOpacity
                    onPress={() => handleNotificationPress(notification)}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.unreadItem
                    ]}
                  >
                    <View style={styles.notificationIcon}>
                      <MaterialCommunityIcons
                        name={getNotificationIcon(notification.data?.type)}
                        size={24}
                        color={getNotificationColor(notification.data?.type)}
                      />
                    </View>
                    
                    <View style={styles.notificationContent}>
                      <View style={styles.notificationHeader}>
                        <Text 
                          variant="titleSmall" 
                          style={[
                            styles.notificationTitle,
                            !notification.read && styles.unreadText
                          ]}
                        >
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      
                      <Text 
                        variant="bodyMedium" 
                        style={styles.notificationBody}
                        numberOfLines={2}
                      >
                        {notification.body}
                      </Text>
                      
                      <Text variant="bodySmall" style={styles.timestamp}>
                        {formatTimestamp(notification.timestamp)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {index < notifications.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </ScrollView>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    maxHeight: '80%',
  },
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#ff5252',
  },
  closeButton: {
    margin: -8,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scrollView: {
    maxHeight: 400,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    opacity: 0.8,
  },
  emptySubtext: {
    marginTop: 8,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
  },
  unreadItem: {
    backgroundColor: '#f0f7ff',
  },
  notificationIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginLeft: 8,
  },
  notificationBody: {
    opacity: 0.8,
    marginBottom: 4,
  },
  timestamp: {
    opacity: 0.6,
  },
});