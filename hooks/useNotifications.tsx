import { useState, useEffect, useCallback } from 'react';
import NotificationService from '../services/NotificationService';
import { useAuth } from './useAuth';
import * as Notifications from 'expo-notifications';

export function useNotifications() {
  const { user } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      initializeNotifications();
    }

    return () => {
      NotificationService.cleanup();
    };
  }, [user]);

  const initializeNotifications = async () => {
    try {
      // Initialize service
      if (user?.uid) {
        await NotificationService.initialize(user.uid);
      }
      
      // Check permission status (don't fail if it doesn't work)
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (permError) {
        console.log('Could not check notification permissions:', permError);
        setHasPermission(false);
      }
      
      // Load initial badge count
      await updateBadgeCount();
      
      // Set up listener for badge updates
      const interval = setInterval(updateBadgeCount, 30000); // Update every 30 seconds
      
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error initializing notifications:', error);
      // Don't throw - let the app continue without notifications
    }
  };

  const updateBadgeCount = useCallback(async () => {
    try {
      const notifications = await NotificationService.getStoredNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      setBadgeCount(unreadCount);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }, []);

  const requestPermission = async () => {
    const result = await NotificationService.requestPermissions();
    setHasPermission(result.status === 'granted');
    return result.status === 'granted';
  };

  const openNotificationCenter = () => {
    setShowNotificationCenter(true);
  };

  const closeNotificationCenter = () => {
    setShowNotificationCenter(false);
    updateBadgeCount(); // Update badge when closing
  };

  const sendTestNotification = async () => {
    await NotificationService.sendLocalNotification({
      type: 'issue_assigned',
      title: '🔔 Test Notification',
      body: 'This is a test notification from the HACCP app',
      data: { test: true }
    });
  };

  const scheduleIssueNotifications = async (issue: any) => {
    // Schedule various notifications for an issue
    await NotificationService.scheduleIssueAssignedNotification(issue);
    
    if (!issue.acknowledged) {
      await NotificationService.scheduleAcknowledgementReminder(issue);
    }
    
    if (issue.proposedActionDate) {
      await NotificationService.scheduleOverdueNotification(issue);
    }
  };

  const cancelIssueNotifications = async (issueId: string) => {
    // Cancel scheduled notifications for an issue
    await NotificationService.cancelScheduledNotification(`ack-reminder-${issueId}`);
    await NotificationService.cancelScheduledNotification(`overdue-${issueId}`);
  };

  return {
    badgeCount,
    hasPermission,
    showNotificationCenter,
    openNotificationCenter,
    closeNotificationCenter,
    requestPermission,
    sendTestNotification,
    scheduleIssueNotifications,
    cancelIssueNotifications,
    updateBadgeCount,
  };
}