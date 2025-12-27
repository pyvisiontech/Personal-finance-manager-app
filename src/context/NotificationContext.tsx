import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useStatements } from '../features/statements/hooks/useStatements';
import { useTransactions } from '../features/transactions/hooks/useTransactions';
import { StatementImport } from '../lib/types';
import { useNotifications as useDatabaseNotifications, useNotificationsRealtime } from '../features/notifications/hooks/useNotifications';
import { Notification as DatabaseNotification } from '../lib/types';
import * as SecureStore from 'expo-secure-store';
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

const ACKNOWLEDGED_STATEMENTS_KEY = 'acknowledged_statements';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [statementStatusMap, setStatementStatusMap] = useState<Map<string, string>>(new Map());
  const [processedTransactionIds, setProcessedTransactionIds] = useState<Set<string>>(new Set());
  // Track which statements have already generated notifications (even if marked as read)
  // This prevents regenerating notifications when app reopens
  const [acknowledgedStatements, setAcknowledgedStatements] = useState<Set<string>>(new Set());
  const [acknowledgedStatementsLoaded, setAcknowledgedStatementsLoaded] = useState(false);

  // Load acknowledged statements from SecureStore on mount
  useEffect(() => {
    const loadAcknowledgedStatements = async () => {
      try {
        const stored = await SecureStore.getItemAsync(ACKNOWLEDGED_STATEMENTS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setAcknowledgedStatements(new Set(parsed));
        }
      } catch (error) {
        console.error('Error loading acknowledged statements:', error);
      } finally {
        setAcknowledgedStatementsLoaded(true);
      }
    };
    loadAcknowledgedStatements();
  }, []);

  // Save acknowledged statements to SecureStore whenever it changes
  useEffect(() => {
    if (!acknowledgedStatementsLoaded) return; // Don't save until we've loaded
    
    const saveAcknowledgedStatements = async () => {
      try {
        const array = Array.from(acknowledgedStatements);
        await SecureStore.setItemAsync(ACKNOWLEDGED_STATEMENTS_KEY, JSON.stringify(array));
      } catch (error) {
        console.error('Error saving acknowledged statements:', error);
      }
    };
    saveAcknowledgedStatements();
  }, [acknowledgedStatements, acknowledgedStatementsLoaded]);

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
    if (!user || !statements.length || !acknowledgedStatementsLoaded) return;

    setNotifications(prev => {
      const newNotifications: Notification[] = [];
      const currentNotificationIds = new Set(prev.map(n => n.id));

      statements.forEach((statement: StatementImport) => {
        const previousStatus = statementStatusMap.get(statement.id);
        const currentStatus = statement.status;

        // Only create notification if status changed or this is the first time we see this statement
        if (previousStatus === currentStatus) return;

        // Don't create notification if this statement has already been acknowledged (user marked as read)
        // This prevents regenerating notifications when app reopens
        const statementKey = `${statement.id}_${currentStatus}`;
        if (acknowledgedStatements.has(statementKey)) {
          // Still update the status map to track current status
          setStatementStatusMap(prevMap => new Map(prevMap).set(statement.id, currentStatus));
          return;
        }

        // Use stable IDs without Date.now() to prevent duplicates on app restart
        const stableNotificationId = `stmt_${currentStatus}_${statement.id}`;
        
        // Check if notification already exists (prevents duplicates on app restart)
        if (currentNotificationIds.has(stableNotificationId)) {
          // Notification already exists, just update status map
          setStatementStatusMap(prevMap => new Map(prevMap).set(statement.id, currentStatus));
          return;
        }

        let notification: Notification | null = null;

      // Create notification based on current status
      // Use stable IDs (without Date.now()) so they persist across app restarts
      switch (currentStatus) {
        case 'uploaded':
          notification = {
            id: `stmt_uploaded_${statement.id}`,
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
            id: `stmt_processing_${statement.id}`,
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
            id: `stmt_completed_${statement.id}`,
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
            id: `stmt_failed_${statement.id}`,
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
          setStatementStatusMap(prevMap => new Map(prevMap).set(statement.id, currentStatus));
        }
      });

      // If there are new notifications, add them to the existing list
      if (newNotifications.length > 0) {
        return [...prev, ...newNotifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }
      
      // No new notifications, return previous state
      return prev;
    });
  }, [statements, user, statementStatusMap, acknowledgedStatements, acknowledgedStatementsLoaded]);

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
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification) {
          // If this is a statement notification, mark the statement as acknowledged
          // This prevents regenerating the notification when app reopens
          if (notification.relatedId && (notificationId.startsWith('stmt_uploaded_') || 
              notificationId.startsWith('stmt_processing_') || 
              notificationId.startsWith('stmt_completed_') || 
              notificationId.startsWith('stmt_failed_'))) {
            // Extract status from ID: format is "stmt_{status}_{statementId}"
            const parts = notificationId.split('_');
            if (parts.length >= 3) {
              const status = parts[1]; // e.g., 'completed', 'uploaded', etc.
              const statementKey = `${notification.relatedId}_${status}`;
              setAcknowledgedStatements(prevAck => new Set(prevAck).add(statementKey));
            }
          }
        }
        return prev.map(n => (n.id === notificationId ? { ...n, read: true } : n));
      });
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      // Collect all statement keys that need to be acknowledged
      const statementKeysToAcknowledge = new Set<string>();
      
      const updated = prev.map(n => {
        // If this is a statement notification, mark the statement as acknowledged
        // This prevents regenerating the notification when app reopens
        if (n.relatedId && (n.id.startsWith('stmt_uploaded_') || 
            n.id.startsWith('stmt_processing_') || 
            n.id.startsWith('stmt_completed_') || 
            n.id.startsWith('stmt_failed_'))) {
          // Extract status from ID: format is "stmt_{status}_{statementId}"
          const parts = n.id.split('_');
          if (parts.length >= 3) {
            const status = parts[1]; // e.g., 'completed', 'uploaded', etc.
            const statementKey = `${n.relatedId}_${status}`;
            statementKeysToAcknowledge.add(statementKey);
          }
        }
        return { ...n, read: true };
      });
      
      // Update acknowledged statements with all collected keys
      if (statementKeysToAcknowledge.size > 0) {
        setAcknowledgedStatements(prevAck => {
          const newSet = new Set(prevAck);
          statementKeysToAcknowledge.forEach(key => newSet.add(key));
          return newSet;
        });
      }
      
      return updated;
    });
    // Mark all database notifications as read
    if (user?.id) {
      // This will be handled by the component
    }
  }, [user]);

  const clearNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setStatementStatusMap(new Map());
    setProcessedTransactionIds(new Set());
    setAcknowledgedStatements(new Set());
    // Also clear from SecureStore
    try {
      await SecureStore.deleteItemAsync(ACKNOWLEDGED_STATEMENTS_KEY);
    } catch (error) {
      console.error('Error clearing acknowledged statements:', error);
    }
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

