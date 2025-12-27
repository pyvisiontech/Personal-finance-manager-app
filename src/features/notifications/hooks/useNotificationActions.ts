import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import {
  useMarkNotificationAsRead,
  useDismissNotification,
  useMarkAllNotificationsAsRead,
} from './useNotifications';
import { useAcceptGroupInvite } from '../../groups/hooks/useGroupInvites';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';

/**
 * Shared hook for notification actions
 * Contains all common notification handling logic used by both NotificationIcon and NotificationsScreen
 */
export function useNotificationActions(navigation?: NativeStackNavigationProp<RootStackParamList>) {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const markAsReadDb = useMarkNotificationAsRead();
  const dismissNotificationDb = useDismissNotification();
  const markAllAsReadDb = useMarkAllNotificationsAsRead();
  const acceptInvite = useAcceptGroupInvite();

  /**
   * Handle accepting a group invite
   */
  const handleAcceptInvite = useCallback(async (notification: any) => {
    if (!user?.id || !notification.data?.invite_token) return;

    Alert.alert(
      'Accept Invitation',
      notification.message,
      [
        {
          text: 'Decline',
          style: 'cancel',
          onPress: async () => {
            if (notification.id.startsWith('db_') && user.id) {
              const dbId = notification.id.replace('db_', '');
              await dismissNotificationDb.mutateAsync({ notificationId: dbId, userId: user.id });
            }
            clearNotification(notification.id);
          },
        },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptInvite.mutateAsync({
                inviteToken: notification.data.invite_token,
                userId: user.id,
              });
              
              Alert.alert('Success', 'You have been added to the group!', [
                {
                  text: 'OK',
                  onPress: () => {
                    if (navigation) {
                      navigation.goBack();
                    }
                  },
                },
              ]);
              clearNotification(notification.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept invitation');
            }
          },
        },
      ]
    );
  }, [user, dismissNotificationDb, clearNotification, acceptInvite, navigation]);

  /**
   * Handle notification press - marks as read and handles different notification types
   */
  const handleNotificationPress = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Mark as read in context
    markAsRead(notificationId);

    // If it's a database notification, mark it as read in DB
    if (notificationId.startsWith('db_') && user?.id) {
      const dbId = notificationId.replace('db_', '');
      try {
        await markAsReadDb.mutateAsync({ notificationId: dbId, userId: user.id });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Handle different notification types
    if (notification.type === 'group_invite' && notification.data?.invite_token) {
      handleAcceptInvite(notification);
    } else {
      // For other notification types, just show alert
      Alert.alert(notification.title, notification.message);
    }
  }, [notifications, markAsRead, user, markAsReadDb, handleAcceptInvite]);

  /**
   * Handle marking all notifications as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    markAllAsRead();
    // Mark all database notifications as read
    if (user?.id) {
      try {
        await markAllAsReadDb.mutateAsync(user.id);
      } catch (error) {
        console.error('Error marking all as read:', error);
      }
    }
  }, [markAllAsRead, user, markAllAsReadDb]);

  /**
   * Handle dismissing/clearing a notification
   */
  const handleDismiss = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    // If it's a database notification, dismiss it in DB
    if (notificationId.startsWith('db_') && user?.id && notification) {
      const dbId = notificationId.replace('db_', '');
      try {
        await dismissNotificationDb.mutateAsync({ notificationId: dbId, userId: user.id });
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    }
    
    clearNotification(notificationId);
  }, [notifications, user, dismissNotificationDb, clearNotification]);

  return {
    handleNotificationPress,
    handleAcceptInvite,
    handleMarkAllAsRead,
    handleDismiss,
  };
}

