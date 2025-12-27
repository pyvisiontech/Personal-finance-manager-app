import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications as useNotificationContext } from '../../../context/NotificationContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import moment from 'moment';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  // Use NotificationContext which already merges all notifications (in-memory + database)
  const { notifications, unreadCount } = useNotificationContext();
  const { handleNotificationPress, handleMarkAllAsRead, handleDismiss } = useNotificationActions(navigation);

  const renderNotification = ({ item }: { item: any }) => {
    const isUnread = !item.read;
    const timeAgo = moment(item.timestamp).fromNow();

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item.id)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            {item.type === 'group_invite' && (
              <Ionicons name="people" size={24} color="#007a33" />
            )}
            {item.type === 'group_joined' && (
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            )}
            {item.type === 'transaction_added' && (
              <Ionicons name="receipt" size={24} color="#3b82f6" />
            )}
            {item.type === 'other' && (
              <Ionicons name="notifications" size={24} color="#6b7280" />
            )}
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>{item.title}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.time}>{timeAgo}</Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDismiss(item)}
            style={styles.dismissButton}
          >
            <Ionicons name="close" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        {isUnread && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
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
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 14,
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
    elevation: 1,
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  unreadNotification: {
    borderLeftColor: '#007a33',
    backgroundColor: '#f0fdf4',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  unreadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007a33',
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

