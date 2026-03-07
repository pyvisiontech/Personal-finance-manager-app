import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications as useNotificationContext } from '../../../context/NotificationContext';
import { useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDismissNotification } from '../hooks/useNotifications';
import { useAuth } from '../../../context/AuthContext';
import { useAcceptGroupInvite } from '../../groups/hooks/useGroupInvites';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, HomeStackParamList } from '../../../navigation/types';
import moment from 'moment';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Notifications'>;

export function NotificationsScreen() {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { user } = useAuth();
  // Use NotificationContext which already merges all notifications (in-memory + database)
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotificationContext();
  const markAsReadDb = useMarkNotificationAsRead();
  const markAllAsReadDb = useMarkAllNotificationsAsRead();
  const dismissNotificationDb = useDismissNotification();
  const acceptInvite = useAcceptGroupInvite();
  const autoMarkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoMarkedRef = useRef<boolean>(false);
  const isScreenFocusedRef = useRef<boolean>(false);

  // Auto-mark all visible notifications as read after 2.5 seconds when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Mark screen as focused
      isScreenFocusedRef.current = true;
      // Reset the flag when screen comes into focus
      hasAutoMarkedRef.current = false;
      
      // Clear any existing timer
      if (autoMarkTimerRef.current) {
        clearTimeout(autoMarkTimerRef.current);
        autoMarkTimerRef.current = null;
      }

      // Get current unread count
      const currentUnreadCount = unreadCount;
      console.log('Notifications screen focused, unread count:', currentUnreadCount);

      // Set timer to mark all as read after 2.5 seconds
      autoMarkTimerRef.current = setTimeout(async () => {
        if (isScreenFocusedRef.current && !hasAutoMarkedRef.current && currentUnreadCount > 0) {
          console.log('Auto-marking all notifications as read');
          markAllAsRead();
          // Also mark all database notifications as read
          if (user?.id) {
            try {
              await markAllAsReadDb.mutateAsync(user.id);
              console.log('Auto-marked all database notifications as read');
            } catch (error: any) {
              console.error('Error auto-marking all notifications as read in database:', error?.message || error);
            }
          }
          hasAutoMarkedRef.current = true;
        }
      }, 2500);

      // Cleanup function
      return () => {
        isScreenFocusedRef.current = false;
        if (autoMarkTimerRef.current) {
          clearTimeout(autoMarkTimerRef.current);
          autoMarkTimerRef.current = null;
        }
      };
    }, [unreadCount, markAllAsRead, user?.id, markAllAsReadDb])
  );

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    markAllAsRead();
    // Mark all database notifications as read
    if (user?.id) {
      try {
        await markAllAsReadDb.mutateAsync(user.id);
      } catch (error: any) {
        console.error('Error marking all as read:', error?.message || error);
      }
    }
  };

  // Wrapper for handleMarkAllAsRead to prevent auto-marking after manual action
  const handleMarkAllAsReadWrapper = async () => {
    hasAutoMarkedRef.current = true; // Prevent auto-marking
    if (autoMarkTimerRef.current) {
      clearTimeout(autoMarkTimerRef.current);
      autoMarkTimerRef.current = null;
    }
    await handleMarkAllAsRead();
  };

  // Handle dismissing a notification
  const handleDismiss = async (notification: any) => {
    if (!notification) return;
    const notificationId = typeof notification === 'string' ? notification : notification.id;
    
    // If it's a database notification, dismiss it in DB
    if (notificationId.startsWith('db_') && user?.id) {
      const dbId = notificationId.replace('db_', '');
      try {
        await dismissNotificationDb.mutateAsync({ notificationId: dbId, userId: user.id });
      } catch (error: any) {
        console.error('Error dismissing notification:', error?.message || error);
      }
    }
    
    clearNotification(notificationId);
  };
  
  // Handle notification press with navigation - handle it locally for better control
  const handleNotificationPress = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) {
      console.log('Notification not found:', notificationId);
      return;
    }

    // Check if navigation is available
    // Note: useNavigation() should always return a navigation object
    // If it's undefined, there's a deeper issue with the navigation context
    if (!navigation) {
      console.error('[NotificationsScreen] Navigation object not available - this should not happen');
      Alert.alert('Error', 'Navigation is not available. Please try again.');
      return;
    }

    console.log('[NotificationsScreen] Navigation object is available:', {
      hasNavigation: !!navigation,
      navigationType: typeof navigation,
      hasGetParent: typeof navigation.getParent === 'function',
    });

    // Don't do anything if already read
    if (notification.read) {
      console.log('Notification already read, just navigating');
    } else {
      console.log('Notification pressed:', notification.type, notificationId, 'Current read state:', notification.read);

      // Mark as read in context FIRST - this updates the UI immediately
      markAsRead(notificationId);
      console.log('Marked as read in context');

      // If it's a database notification, mark it as read in DB
      if (notificationId.startsWith('db_') && user?.id) {
        const dbId = notificationId.replace('db_', '');
        try {
          await markAsReadDb.mutateAsync({ notificationId: dbId, userId: user.id });
          console.log('Marked notification as read in database:', dbId);
        } catch (error: any) {
          console.error('Error marking notification as read in database:', error?.message || error);
        }
      }

      // Small delay to ensure UI updates before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Get tab navigator for cross-tab navigation
    let tabNavigator;
    try {
      tabNavigator = navigation.getParent();
      console.log('[NotificationsScreen] Tab navigator check:', {
        hasNavigation: !!navigation,
        hasGetParent: typeof navigation.getParent === 'function',
        tabNavigatorAvailable: !!tabNavigator,
      });
    } catch (error: any) {
      console.error('[NotificationsScreen] Error getting parent navigator:', error?.message || error);
      Alert.alert('Error', 'Unable to navigate. Please try again.');
      return;
    }
    
    if (!tabNavigator) {
      console.error('[NotificationsScreen] Tab navigator not found. Navigation state:', navigation.getState?.());
      // Try alternative navigation method for same-stack screens
      if (notification.type === 'group_joined') {
        try {
          navigation.navigate('GroupsList');
          return;
        } catch (navError: any) {
          console.error('[NotificationsScreen] Direct navigation also failed:', navError?.message || navError);
        }
      }
      Alert.alert('Error', 'Unable to navigate. Please try again.');
      return;
    }

    // Handle navigation based on notification type
    if (notification.type === 'group_invite' && notification.data?.invite_token) {
      // Handle group invite directly - show alert
      const inviteToken = notification.data?.invite_token;
      if (!user?.id || !inviteToken) {
        console.log('Missing user or invite token for group invite');
        return;
      }

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
                try {
                  await dismissNotificationDb.mutateAsync({ notificationId: dbId, userId: user.id });
                } catch (error: any) {
                  console.error('Error dismissing notification:', error?.message || error);
                }
              }
              clearNotification(notification.id);
            },
          },
          {
            text: 'Accept',
            onPress: async () => {
              try {
                await acceptInvite.mutateAsync({
                  inviteToken: inviteToken,
                  userId: user.id,
                });
                
                Alert.alert('Success', 'You have been added to the group!', [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Check if we can go back before trying
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else {
                        // If we can't go back, navigate to GroupsList instead
                        try {
                          navigation.navigate('GroupsList');
                        } catch (navError: any) {
                          console.log('[NotificationsScreen] Could not navigate to GroupsList:', navError?.message || navError);
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
    } else if (
      notification.type === 'statement_completed' || 
      notification.type === 'statement_uploaded' ||
      notification.type === 'statement_processing' ||
      notification.type === 'statement_failed'
    ) {
      // Navigate to Statements Tab
      if (tabNavigator) {
        try {
          console.log('Navigating to StatementsTab');
          (tabNavigator as any).navigate('StatementsTab', {
            screen: 'StatementsList',
          });
        } catch (error: any) {
          console.error('Navigation error to StatementsTab:', error?.message || error);
        }
      } else {
        console.error('Tab navigator not found');
      }
    } else if (notification.type === 'transaction_added') {
      // Navigate to Transactions Tab
      if (tabNavigator) {
        try {
          console.log('Navigating to TransactionsTab');
          (tabNavigator as any).navigate('TransactionsTab', {
            screen: 'TransactionsList',
          });
        } catch (error: any) {
          console.error('Navigation error to TransactionsTab:', error?.message || error);
        }
      } else {
        console.error('Tab navigator not found');
      }
    } else if (notification.type === 'group_joined') {
      // Navigate to Groups List (same stack)
      try {
        console.log('Navigating to GroupsList');
        navigation.navigate('GroupsList');
      } catch (error: any) {
        console.error('Navigation error to GroupsList:', error?.message || error);
      }
    }
  };

  // Get notification icon and color based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'statement_uploaded':
        return { name: 'cloud-upload-outline' as const, color: '#3B82F6' };
      case 'statement_processing':
        return { name: 'hourglass-outline' as const, color: '#F59E0B' };
      case 'statement_completed':
        return { name: 'checkmark-circle' as const, color: '#10B981' };
      case 'statement_failed':
        return { name: 'alert-circle' as const, color: '#EF4444' };
      case 'transaction_added':
        return { name: 'receipt-outline' as const, color: '#8B5CF6' };
      case 'group_invite':
        return { name: 'people-outline' as const, color: '#007a33' };
      case 'group_joined':
        return { name: 'checkmark-circle' as const, color: '#10B981' };
      default:
        return { name: 'notifications-outline' as const, color: '#6B7280' };
    }
  };

  // Get border color for notification type
  const getBorderColor = (type: string, isUnread: boolean) => {
    if (!isUnread) return 'transparent';
    switch (type) {
      case 'statement_uploaded':
        return '#3B82F6';
      case 'statement_processing':
        return '#F59E0B';
      case 'statement_completed':
        return '#10B981';
      case 'statement_failed':
        return '#EF4444';
      case 'transaction_added':
        return '#8B5CF6';
      case 'group_invite':
        return '#007a33';
      case 'group_joined':
        return '#10B981';
      default:
        return '#007a33';
    }
  };

  const renderNotification = ({ item }: { item: any }) => {
    const isUnread = !item.read;
    // Ensure timestamp is properly converted to local time
    const timestamp = item.timestamp instanceof Date 
      ? item.timestamp 
      : new Date(item.timestamp);
    const timeAgo = moment(timestamp).fromNow();
    const icon = getNotificationIcon(item.type);
    const borderColor = getBorderColor(item.type, isUnread);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem, 
          isUnread && styles.unreadNotification,
          { borderLeftColor: borderColor }
        ]}
        onPress={() => {
          console.log('Notification card pressed:', item.id, item.type, 'Current read state:', item.read);
          handleNotificationPress(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: isUnread ? `${icon.color}15` : '#F3F4F6' }
          ]}>
            <Ionicons 
              name={icon.name} 
              size={24} 
              color={isUnread ? icon.color : '#9CA3AF'} 
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text 
                style={[
                  styles.title, 
                  isUnread ? styles.unreadTitle : styles.readTitle
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.timeTopRight}>{timeAgo}</Text>
            </View>
            <Text 
              style={[
                styles.message,
                isUnread ? styles.unreadMessage : styles.readMessage
              ]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
            {item.type === 'statement_failed' && (
              <Text style={styles.actionHint}>Tap to retry</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleDismiss(item);
            }}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity 
            onPress={handleMarkAllAsReadWrapper} 
            style={styles.markAllButton}
            activeOpacity={0.7}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          extraData={notifications.map(n => ({ id: n.id, read: n.read }))} // Force re-render when read state changes
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f1e3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  markAllText: {
    fontSize: 13,
    color: '#007a33',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF', // Light blue tint for unread
    borderLeftWidth: 4,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    flex: 1,
    color: '#111827',
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  readTitle: {
    fontWeight: '400', // Regular weight for read notifications
    color: '#6B7280',
  },
  timeTopRight: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#374151',
  },
  readMessage: {
    color: '#6B7280',
  },
  actionHint: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 4,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
});

