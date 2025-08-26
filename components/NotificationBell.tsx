import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton, Badge, useTheme } from 'react-native-paper';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from './NotificationCenter';

interface NotificationBellProps {
  color?: string;
  size?: number;
}

export default function NotificationBell({ 
  color, 
  size = 24 
}: NotificationBellProps) {
  const theme = useTheme();
  const {
    badgeCount,
    showNotificationCenter,
    openNotificationCenter,
    closeNotificationCenter,
  } = useNotifications();

  return (
    <>
      <View style={styles.container}>
        <IconButton
          icon="bell"
          size={size}
          iconColor={color || theme.colors.onSurface}
          onPress={openNotificationCenter}
        />
        {badgeCount > 0 && (
          <Badge style={styles.badge} size={16}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Badge>
        )}
      </View>

      <NotificationCenter
        visible={showNotificationCenter}
        onDismiss={closeNotificationCenter}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ff5252',
  },
});