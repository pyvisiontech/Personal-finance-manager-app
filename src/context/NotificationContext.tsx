import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useStatements } from '../features/statements/hooks/useStatements';
import { useTransactions } from '../features/transactions/hooks/useTransactions';
import { StatementImport } from '../lib/types';
import { useNotifications as useDatabaseNotifications, useNotificationsRealtime } from '../features/notifications/hooks/useNotifications';
import { Notification as DatabaseNotification } from '../lib/types';
import moment from 'moment';

export interface Notification {
  id: string;
  type: 'statement_uploaded' | 'statement_processing' | 'statement_completed' | 'statement_failed' | 'transaction_added' | 'group_invite' | 'group_joined';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  relatedId?: string; // statement_import id or transaction id
  data?: {
    group_id?: string;
    invite_id?: string;
    invite_token?: string;
    [key: string]: any;
  }; // For database notifications
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotification: (notificationId: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statementStatusMap, setStatementStatusMap] = useState<Map<string, string>>(new Map());
  const [processedTransactionIds, setProcessedTransactionIds] = useState<Set<string>>(new Set());

  // Fetch statements and transactions
  const { data: statements = [] } = useStatements(user?.id || '');
  const { data: transactions = [] } = useTransactions(
    user?.id || '',
    { 
      startDate: moment().subtract(7, 'days').format('YYYY-MM-DD HH:mm:ss'),
      endDate: moment().format('YYYY-MM-DD HH:mm:ss')
    }
  );

  // Fetch database notifications (group invites, etc.)
  const { data: databaseNotifications = [], refetch: refetchDatabaseNotifications } = useDatabaseNotifications(user?.id || '');

  // Set up real-time subscription for database notifications
  const handleNewDatabaseNotification = useCallback((notification: DatabaseNotification) => {
    console.log('New database notification received:', notification);
    refetchDatabaseNotifications();
  }, [refetchDatabaseNotifications]);

  useNotificationsRealtime(user?.id || '', handleNewDatabaseNotification);

  // Generate notifications from statements
  useEffect(() => {
    if (!user || !statements.length) return;

    const newNotifications: Notification[] = [];

    statements.forEach((statement: StatementImport) => {
      const previousStatus = statementStatusMap.get(statement.id);
      const currentStatus = statement.status;

      // Only create notification if status changed or this is the first time we see this statement
      if (previousStatus === currentStatus) return;

      let notification: Notification | null = null;

      // Create notification based on current status
      switch (currentStatus) {
        case 'uploaded':
          notification = {
            id: `stmt_uploaded_${statement.id}_${Date.now()}`,
            type: 'statement_uploaded',
            title: 'Statement Uploaded',
            message: 'Your bank statement has been uploaded successfully. Processing will begin shortly.',
            timestamp: new Date(statement.created_at),
            read: false,
            relatedId: statement.id,
          };
          break;
        case 'processing':
          notification = {
            id: `stmt_processing_${statement.id}_${Date.now()}`,
            type: 'statement_processing',
            title: 'Statement Processing',
            message: 'Your bank statement is being processed. This may take 10-15 minutes.',
            timestamp: new Date(statement.created_at),
            read: false,
            relatedId: statement.id,
          };
          break;
        case 'completed':
          notification = {
            id: `stmt_completed_${statement.id}_${Date.now()}`,
            type: 'statement_completed',
            title: 'Statement Processed',
            message: 'Your bank statement has been processed successfully. Transactions have been imported.',
            timestamp: new Date(statement.processed_at || statement.created_at),
            read: false,
            relatedId: statement.id,
          };
          break;
        case 'failed':
          notification = {
            id: `stmt_failed_${statement.id}_${Date.now()}`,
            type: 'statement_failed',
            title: 'Statement Processing Failed',
            message: statement.error || 'Failed to process your bank statement. Please try uploading again.',
            timestamp: new Date(statement.created_at),
            read: false,
            relatedId: statement.id,
          };
          break;
      }

      if (notification) {
        newNotifications.push(notification);
        // Update the status map
        setStatementStatusMap(prev => new Map(prev).set(statement.id, currentStatus));
      }
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => {
        // Merge with existing, avoiding duplicates
        const existingIds = new Set(prev.map(n => n.id));
        const uniqueNew = newNotifications.filter(n => !existingIds.has(n.id));
        return [...prev, ...uniqueNew].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });
    }
  }, [statements, user, statementStatusMap]);

  // Generate notifications for manual transactions (only recent ones)
  useEffect(() => {
    if (!user || !transactions.length) return;

    const manualTransactions = transactions.filter(
      tx => tx.source === 'manual' && 
      moment(tx.created_at).isAfter(moment().subtract(1, 'hour'))
    );

    manualTransactions.forEach(transaction => {
      // Skip if we've already processed this transaction
      if (processedTransactionIds.has(transaction.id)) return;

      const notification: Notification = {
        id: `txn_added_${transaction.id}`,
        type: 'transaction_added',
        title: 'Transaction Added',
        message: `Manual transaction of ₹${Math.abs(transaction.amount).toLocaleString('en-IN')} has been added successfully.`,
        timestamp: new Date(transaction.created_at),
        read: false,
        relatedId: transaction.id,
      };

      setNotifications(prev => {
        // Check if notification already exists
        if (prev.some(n => n.id === notification.id)) return prev;
        return [...prev, notification].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      });

      setProcessedTransactionIds(prev => new Set(prev).add(transaction.id));
    });
  }, [transactions, user, processedTransactionIds]);

  // Convert database notifications to app notifications format
  useEffect(() => {
    if (!databaseNotifications.length) return;

    const dbNotifications: Notification[] = databaseNotifications
      .filter(dbNotif => dbNotif.status === 'unread' || dbNotif.status === 'read')
      .map(dbNotif => ({
        id: `db_${dbNotif.id}`,
        type: dbNotif.type as 'group_invite' | 'group_joined',
        title: dbNotif.title,
        message: dbNotif.message,
        timestamp: new Date(dbNotif.created_at),
        read: dbNotif.status === 'read',
        data: dbNotif.data || undefined, // Convert null to undefined
      }));

    setNotifications(prev => {
      // Merge with existing, avoiding duplicates
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNew = dbNotifications.filter(n => !existingIds.has(n.id));
      const merged = [...prev.filter(n => !n.id.startsWith('db_')), ...uniqueNew];
      return merged.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  }, [databaseNotifications]);

  const markAsRead = useCallback((notificationId: string) => {
    // If it's a database notification, mark it as read in the database
    if (notificationId.startsWith('db_')) {
      const dbId = notificationId.replace('db_', '');
      // This will be handled by the component that uses the notification
      // For now, just update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } else {
      // Local notification
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Mark all database notifications as read
    if (user?.id) {
      // This will be handled by the component
    }
  }, [user]);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setStatementStatusMap(new Map());
    setProcessedTransactionIds(new Set());
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

