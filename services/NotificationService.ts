import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Storage from '../utils/storage';
import { doc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'issue_assigned' | 'issue_overdue' | 'issue_escalated' | 'acknowledgement_reminder' | 'inspection_summary';
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private notificationListener: any = null;
  private responseListener: any = null;
  private badgeCount: number = 0;

  async initialize(userId: string) {
    try {
      // Skip initialization if no userId
      if (!userId) {
        console.log('No userId provided for notification initialization');
        return;
      }

      // Request permissions (but don't fail if not granted)
      try {
        const { status } = await this.requestPermissions();
        if (status !== 'granted') {
          console.log('Notification permissions not granted');
          // Continue anyway - local notifications will still work
        }
      } catch (permError) {
        console.log('Error requesting permissions:', permError);
      }

      // Get and store push token (optional - won't fail if it doesn't work)
      try {
        const token = await this.registerForPushNotifications();
        if (token && userId) {
          await this.savePushToken(userId, token);
        }
      } catch (tokenError) {
        console.log('Push token registration skipped:', tokenError);
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      // Load badge count
      await this.loadBadgeCount();

      // Schedule default notifications (optional)
      try {
        await this.scheduleDefaultNotifications();
      } catch (scheduleError) {
        console.log('Default notifications not scheduled:', scheduleError);
      }

    } catch (error) {
      console.error('Error initializing notifications:', error);
      // Don't throw - let the app continue
    }
  }

  async requestPermissions() {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return { status: 'denied' };
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return { status: finalStatus };
  }

  async registerForPushNotifications() {
    if (!Device.isDevice) return null;

    try {
      // Push notifications disabled for now - uncomment and add project ID when ready
      // const token = (await Notifications.getExpoPushTokenAsync({
      //   projectId: 'your-project-id' // Replace with your project ID
      // })).data;
      // return token;
      
      return null; // Return null for now
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async savePushToken(userId: string, token: string) {
    try {
      // Save to user document
      await updateDoc(doc(db, 'users', userId), {
        pushToken: token,
        pushTokenUpdatedAt: serverTimestamp(),
        notificationsEnabled: true
      });

      // Also save to Storage for offline access
      await Storage.setItem('pushToken', token);
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  setupNotificationListeners() {
    // Handle notifications when app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleInAppNotification(notification);
    });

    // Handle notification taps
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      this.handleNotificationResponse(response);
    });
  }

  handleInAppNotification(notification: Notifications.Notification) {
    // Update badge count
    this.incrementBadgeCount();
    
    // Store notification for in-app display
    this.storeNotification(notification);
  }

  handleNotificationResponse(response: Notifications.NotificationResponse) {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    switch (data?.type) {
      case 'issue_assigned':
        // Navigate to issue details
        if (data.issueId && data.inspectionId) {
          // Use router to navigate
          console.log('Navigate to issue:', data.issueId);
        }
        break;
      case 'issue_overdue':
        // Navigate to dashboard
        console.log('Navigate to dashboard');
        break;
      default:
        break;
    }
  }

  async storeNotification(notification: Notifications.Notification) {
    try {
      const notifications = await this.getStoredNotifications();
      notifications.unshift({
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      // Keep only last 50 notifications
      const trimmed = notifications.slice(0, 50);
      await Storage.setItem('notifications', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error storing notification:', error);
    }
  }

  async getStoredNotifications() {
    try {
      const stored = await Storage.getItem('notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting stored notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      await Storage.setItem('notifications', JSON.stringify(updated));
      await this.updateBadgeCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map(n => ({ ...n, read: true }));
      await Storage.setItem('notifications', JSON.stringify(updated));
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  // Badge management
  async loadBadgeCount() {
    try {
      const count = await Storage.getItem('badgeCount');
      this.badgeCount = count ? parseInt(count) : 0;
      await Notifications.setBadgeCountAsync(this.badgeCount);
    } catch (error) {
      console.error('Error loading badge count:', error);
    }
  }

  async incrementBadgeCount() {
    this.badgeCount++;
    await this.setBadgeCount(this.badgeCount);
  }

  async setBadgeCount(count: number) {
    try {
      this.badgeCount = count;
      await Storage.setItem('badgeCount', count.toString());
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  async updateBadgeCount() {
    try {
      const notifications = await this.getStoredNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      await this.setBadgeCount(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  // Schedule notifications
  async scheduleIssueAssignedNotification(issue: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 New Issue Assigned',
        body: `You have been assigned: ${issue.description}`,
        data: {
          type: 'issue_assigned',
          issueId: issue.id,
          inspectionId: issue.inspectionId
        },
        sound: 'default',
      },
      trigger: { seconds: 1 }, // Immediate
    });
  }

  async scheduleAcknowledgementReminder(issue: any) {
    const reminderTime = 24 * 60 * 60; // 24 hours in seconds
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Acknowledgement Required',
        body: `Please acknowledge issue: ${issue.description}`,
        data: {
          type: 'acknowledgement_reminder',
          issueId: issue.id,
          inspectionId: issue.inspectionId
        },
        sound: 'default',
      },
      trigger: { seconds: reminderTime },
      identifier: `ack-reminder-${issue.id}`
    });
  }

  async scheduleOverdueNotification(issue: any) {
    const dueDate = new Date(issue.proposedActionDate);
    const now = new Date();
    
    if (dueDate > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Issue Overdue',
          body: `Issue is now overdue: ${issue.description}`,
          data: {
            type: 'issue_overdue',
            issueId: issue.id,
            inspectionId: issue.inspectionId
          },
          sound: 'default',
        },
        trigger: dueDate,
        identifier: `overdue-${issue.id}`
      });
    }
  }

  async cancelScheduledNotification(identifier: string) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async scheduleDefaultNotifications() {
    // Schedule daily summary at 8 AM
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📊 Daily Summary',
        body: 'Check your pending issues and inspections',
        data: { type: 'inspection_summary' },
        sound: 'default',
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      },
      identifier: 'daily-summary'
    });
  }

  // Send local notification immediately
  async sendLocalNotification(notification: NotificationData) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: 'default',
      },
      trigger: null, // Immediate
    });
  }

  // Clean up
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export default new NotificationService();