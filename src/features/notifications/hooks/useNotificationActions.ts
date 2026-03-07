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
import { CommonActions } from '@react-navigation/native';

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
                      // Check if we can go back before trying
                      if (navigation.canGoBack && navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        // If we can't go back, try to navigate to GroupsList
                        try {
                          const tabNavigator = navigation.getParent();
                          if (tabNavigator) {
                            (tabNavigator as any).navigate('HomeTab', {
                              screen: 'GroupsList',
                            });
                          }
                        } catch (navError: any) {
                          console.log('[useNotificationActions] Could not navigate after accepting invite:', navError?.message || navError);
                        }
                      }
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
   * Handle notification press - marks as read and navigates to relevant screen
   */
  const handleNotificationPress = useCallback(async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) {
      console.log('No notification found for ID:', notificationId);
      return;
    }

    if (!navigation) {
      console.log('No navigation object available');
      return;
    }

    console.log('Handling notification press:', notification.type, notificationId);

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

    // Handle different notification types with navigation
    try {
      if (notification.type === 'group_invite' && notification.data?.invite_token) {
        handleAcceptInvite(notification);
        return;
      }
      
      // Get the Tab Navigator (parent of HomeStackNavigator) BEFORE any navigation
      const tabNavigator = navigation.getParent();
      console.log('Tab navigator found:', !!tabNavigator);
      
      if (
        notification.type === 'statement_completed' || 
        notification.type === 'statement_uploaded' ||
        notification.type === 'statement_processing' ||
        notification.type === 'statement_failed'
      ) {
        // Navigate to Statements Tab, then to StatementsList screen
        if (tabNavigator) {
          try {
            console.log('Navigating to StatementsTab -> StatementsList');
            // Navigate directly - React Navigation will handle closing current screen
            (tabNavigator as any).navigate('StatementsTab', {
              screen: 'StatementsList',
            });
          } catch (error: any) {
            console.error('Navigation error to StatementsTab:', error);
            // Fallback: use CommonActions
            try {
              (tabNavigator as any).dispatch(
                CommonActions.navigate({
                  name: 'StatementsTab',
                  params: {
                    screen: 'StatementsList',
                  },
                })
              );
            } catch (dispatchError) {
              console.error('CommonActions dispatch error:', dispatchError);
            }
          }
        } else {
          console.error('No tab navigator found for StatementsTab');
        }
      } else if (notification.type === 'transaction_added' && notification.relatedId) {
        // Navigate to Transactions Tab, then to TransactionsList screen
        if (tabNavigator) {
          try {
            console.log('Navigating to TransactionsTab -> TransactionsList');
            // Navigate directly - React Navigation will handle closing current screen
            (tabNavigator as any).navigate('TransactionsTab', {
              screen: 'TransactionsList',
            });
          } catch (error: any) {
            console.error('Navigation error to TransactionsTab:', error);
            // Fallback: use CommonActions
            try {
              (tabNavigator as any).dispatch(
                CommonActions.navigate({
                  name: 'TransactionsTab',
                  params: {
                    screen: 'TransactionsList',
                  },
                })
              );
            } catch (dispatchError) {
              console.error('CommonActions dispatch error:', dispatchError);
            }
          }
        } else {
          console.error('No tab navigator found for TransactionsTab');
        }
      } else if (notification.type === 'group_joined') {
        // Navigate to Groups List (this is in the same HomeStack, so direct navigation works)
        console.log('Navigating to GroupsList');
        try {
          navigation.navigate('GroupsList');
        } catch (error) {
          console.error('Navigation to GroupsList failed:', error);
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [notifications, markAsRead, user, markAsReadDb, handleAcceptInvite, navigation]);

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
  const handleDismiss = useCallback(async (notification: any) => {
    if (!notification) return;
    const notificationId = typeof notification === 'string' ? notification : notification.id;
    
    // If it's a database notification, dismiss it in DB
    if (notificationId.startsWith('db_') && user?.id) {
      const dbId = notificationId.replace('db_', '');
      try {
        await dismissNotificationDb.mutateAsync({ notificationId: dbId, userId: user.id });
      } catch (error) {
        console.error('Error dismissing notification:', error);
      }
    }
    
    clearNotification(notificationId);
  }, [user, dismissNotificationDb, clearNotification]);

  return {
    handleNotificationPress,
    handleAcceptInvite,
    handleMarkAllAsRead,
    handleDismiss,
  };
}

