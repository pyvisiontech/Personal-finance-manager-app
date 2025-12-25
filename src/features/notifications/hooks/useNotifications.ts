import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Notification } from '../../../lib/types';
import { useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook to fetch notifications for a user
 */
export function useNotifications(userId: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }

      return (data || []) as Notification[];
    },
    enabled: !!userId,
    refetchInterval: 30000, // Poll every 30 seconds as fallback
  });
}

/**
 * Hook to get unread notifications count
 */
export function useUnreadNotificationsCount(userId: string) {
  return useQuery({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'unread');

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Hook to mark notification as read
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', variables.userId] });
    },
  });
}

/**
 * Hook to mark notification as dismissed
 */
export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ notificationId, userId }: { notificationId: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'dismissed' })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error dismissing notification:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ['notifications', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', variables.userId] });
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('user_id', userId)
        .eq('status', 'unread');

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    },
    onSuccess: (userId) => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', userId] });
    },
  });
}

/**
 * Hook to create a notification
 */
export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      title,
      message,
      data,
    }: {
      userId: string;
      type: Notification['type'];
      title: string;
      message: string;
      data?: Notification['data'];
    }) => {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: userId,
            type,
            title,
            message,
            data: data || null,
            status: 'unread',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      return notification as Notification;
    },
    onSuccess: (notification) => {
      // Invalidate notifications queries for the user
      queryClient.invalidateQueries({ queryKey: ['notifications', notification.user_id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', notification.user_id] });
    },
  });
}

/**
 * Hook to set up real-time subscription for notifications
 */
export function useNotificationsRealtime(userId: string, onNotification: (notification: Notification) => void) {
  useEffect(() => {
    if (!userId) return;

    // Subscribe to notifications table changes
    const channel: RealtimeChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Notification real-time update:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const notification = payload.new as Notification;
            if (notification.status === 'unread') {
              onNotification(notification);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNotification]);
}

