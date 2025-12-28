import React, { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, StatusBar, Platform, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useStatements } from '../hooks/useStatements';
import { useGroupStatements } from '../../groups/hooks/useGroupStatements';
import { useAuth } from '../../../context/AuthContext';
import { useGroupContext } from '../../../context/GroupContext';
import { StatementImport, StatementStatus } from '../../../lib/types';
import { RootStackParamList } from '../../../navigation/types';
import { supabase } from '../../../lib/supabase';
import moment from 'moment';
import { fetchStatementTransactions, exportStatementToExcel, downloadStatementExcel } from '../../../utils/statementExport';

// Calculate status bar height for header padding
const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 12;

export function StatementsListScreen() {
  const { user } = useAuth();
  const { currentGroupId, currentGroupName, hasGroupContext } = useGroupContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Use group statements if in group context, otherwise use personal statements
  const { data: groupStatements = [], isLoading: isLoadingGroup, error: groupError, refetch: refetchGroup } = useGroupStatements(
    (hasGroupContext && currentGroupId) ? currentGroupId : ''
  );

  const { data: personalStatements = [], isLoading: isLoadingPersonal, error: personalError, refetch: refetchPersonal } = useStatements(user?.id || '');

  // Select appropriate data based on group context
  const statements = hasGroupContext ? groupStatements : personalStatements;
  const isLoading = hasGroupContext ? isLoadingGroup : isLoadingPersonal;
  const error = hasGroupContext ? groupError : personalError;
  const refetch = hasGroupContext ? refetchGroup : refetchPersonal;

  const [refreshing, setRefreshing] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Ensure tab bar is visible on Statements screen
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: {
          backgroundColor: '#f4f1e3',
          borderTopColor: '#d8d2b8',
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          marginBottom: 8,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          display: 'flex',
        },
      });
    }
  }, [navigation]);

  // Update header title - not needed since we're using custom header

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Automatically process statements with "uploaded" status when they appear
  const processedStatementsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (!user?.id || !statements || statements.length === 0) return;

    const uploadedStatements = statements.filter(
      (s) => s.status === 'uploaded' && !processedStatementsRef.current.has(s.id)
    );

    uploadedStatements.forEach((statement) => {
      // Mark as being processed to avoid duplicate calls
      processedStatementsRef.current.add(statement.id);
      
      // Automatically trigger processing for uploaded statements (silent mode)
      reprocessStatement(statement, true)
        .then(() => {
          // Refetch to update status
          refetch();
        })
        .catch((error) => {
          
          // Remove from processed set so it can be retried
          processedStatementsRef.current.delete(statement.id);
        });
    });
  }, [statements, user?.id, refetch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Manual status check for a specific statement
  const checkStatementStatus = async (statementId: string) => {
    setCheckingStatus(statementId);
    try {
      // Fetch latest status directly from Supabase
      const { data, error } = await supabase
        .from('statement_imports')
        .select('*')
        .eq('id', statementId)
        .single();

      if (error) {
        Alert.alert('Error', `Failed to check status: ${error.message}`);
      } else if (data) {
        // Invalidate and refetch all statements to update the UI
        await refetch();

        const status = data.status as StatementStatus;
        const statusLabel = getStatusLabel(status);

        if (status === 'completed') {
          Alert.alert('Status Updated', `Statement is now ${statusLabel}!`);
        } else if (status === 'failed') {
          Alert.alert(
            'Processing Failed',
            data.error || 'Statement processing failed. Please try uploading again.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Current Status', `Statement is ${statusLabel}. Processing may take a few minutes.`);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to check status: ${error.message || 'Unknown error'}`);
    } finally {
      setCheckingStatus(null);
    }
  };

  // Manual refresh all statements
  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      Alert.alert('Refreshed', 'Statement statuses have been updated.');
    } catch (error: any) {
      Alert.alert('Error', `Failed to refresh: ${error.message || 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  };

  // Reprocess old statements that are stuck in "uploaded" status
  const reprocessStatement = async (statement: StatementImport, silent: boolean = false) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setReprocessing(statement.id);
    try {
      // Get signed URL for the file
      let signedUrl = statement.file_url;

      // Try to create a signed URL from the file_url path
      try {
        // Extract storage path from file_url
        const urlParts = statement.file_url.split('/');
        const storagePath = urlParts.slice(urlParts.indexOf('statements') + 1).join('/');

        if (storagePath) {
          const { data: signedData, error: signedError } = await supabase.storage
            .from('statements')
            .createSignedUrl(storagePath, 60 * 60);

          if (!signedError && signedData?.signedUrl) {
            signedUrl = signedData.signedUrl;
          }
        }
      } catch (urlError) {
       
      }

      // Call backend to process the statement
      const response = await fetch('https://statement-classifier-python-2.onrender.com/classifier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          import_id: statement.id,
          user_id: user.id,
          client_id: user.id,
          file_url: statement.file_url,
          signed_url: signedUrl,
          source_type: statement.source_type || 'bank_statement',
          accountant_id: null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend processing failed: ${errorText || 'Unknown error'}`);
      }

      if (!silent) {
        Alert.alert(
          'Processing Started',
          'Your statement is being processed. This may take a few minutes. The status will update automatically.',
          [{ text: 'OK' }]
        );
      }

      // Refetch to update status
      await refetch();
    } catch (error: any) {
      
      Alert.alert(
        'Reprocessing Failed',
        error.message || 'Failed to start processing. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setReprocessing(null);
    }
  };

  const getStatusColor = (status: StatementStatus) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'processing':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      case 'uploaded':
        return '#007AFF';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: StatementStatus) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'processing':
        return 'hourglass-empty';
      case 'failed':
        return 'error';
      case 'uploaded':
        return 'cloud-upload';
      default:
        return 'help-outline';
    }
  };

  const getStatusLabel = (status: StatementStatus) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'In Process';
      case 'failed':
        return 'Failed';
      case 'uploaded':
        return 'Uploaded';
      default:
        return status;
    }
  };

  const getFileName = (fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      // Remove timestamp prefix if present
      return fileName.split('_').pop() || fileName;
    } catch {
      return 'Statement File';
    }
  };

  const formatDate = (dateString: string) => {
    // Parse UTC timestamp from Supabase and convert to local timezone
    return moment.utc(dateString).local().format('MMM DD, YYYY hh:mm A');
  };

  // Download statement transactions as Excel
  const handleDownloadStatement = async (statement: StatementImport) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setDownloading(statement.id);
    try {
      // Fetch transactions for this statement
      const transactions = await fetchStatementTransactions(
        user.id,
        statement.id,
        statement.created_at,
        statement.processed_at
      );

      if (transactions.length === 0) {
        Alert.alert(
          'No Transactions Found', 
          'No transactions were found for this statement. This could mean:\n\n' +
          '• The statement is still being processed\n' +
          '• No transactions were extracted from the statement\n' +
          '• There may be a timing issue with transaction creation\n\n' +
          'Please check the Transactions page to see if transactions from this statement are available there.',
          [{ text: 'OK' }]
        );
        setDownloading(null);
        return;
      }

      // Generate Excel file with two sheets
      const statementFileName = getFileName(statement.file_url);
      const { fileUri, fileName } = await exportStatementToExcel(transactions, statementFileName);

      // Download/share the file
      await downloadStatementExcel(fileUri, fileName);
    } catch (error: any) {
     
      Alert.alert(
        'Download Failed',
        error.message || 'Failed to download statement. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(null);
    }
  };

  const renderStatement = (statement: StatementImport, isLast: boolean = false) => {
    const statusColor = getStatusColor(statement.status);
    const statusIcon = getStatusIcon(statement.status);
    const statusLabel = getStatusLabel(statement.status);
    const fileName = getFileName(statement.file_url);
    const isChecking = checkingStatus === statement.id;
    const isReprocessing = reprocessing === statement.id;
    const isDownloading = downloading === statement.id;
    const canCheckStatus = statement.status === 'uploaded' || statement.status === 'processing';
    // Only show Process button for failed statements that need to be reprocessed
    const canReprocess = statement.status === 'failed';
    const canDownload = statement.status === 'completed';

    return (
      <TouchableOpacity
        key={statement.id}
        style={[styles.statementItem, isLast && styles.lastStatementItem]}
        onPress={canDownload ? () => handleDownloadStatement(statement) : undefined}
        disabled={!canDownload || isDownloading}
        activeOpacity={canDownload ? 0.7 : 1}
      >
        <View style={styles.statementLeft}>
          <View style={[styles.statusIconContainer, { backgroundColor: `${statusColor}15` }]}>
            <MaterialIcons name={statusIcon} size={24} color={statusColor} />
          </View>
          <View style={styles.statementDetails}>
            <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="tail">
              {fileName}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{formatDate(statement.created_at)}</Text>
            </View>
            {statement.processed_at && (
              <Text style={styles.processedText}>
                Processed: {formatDate(statement.processed_at)}
              </Text>
            )}
            {statement.error && (
              <View style={styles.statementErrorContainer}>
                <MaterialIcons name="error-outline" size={14} color="#FF3B30" />
                <Text style={styles.errorText} numberOfLines={3} ellipsizeMode="tail">
                  {statement.error}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statementRight}>
          <View style={styles.statusAndDownloadRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            {canDownload && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDownloadStatement(statement);
                }}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#007a33" />
                ) : (
                  <MaterialIcons name="download" size={20} color="#007a33" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.actionButtons}>
            {canReprocess && (
              <TouchableOpacity
                style={styles.reprocessButton}
                onPress={() => reprocessStatement(statement)}
                disabled={isReprocessing}
              >
                {isReprocessing ? (
                  <ActivityIndicator size="small" color="#007a33" />
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={18} color="#007a33" />
                    <Text style={styles.reprocessButtonText}>Retry</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canCheckStatus && (
              <TouchableOpacity
                style={styles.checkStatusButton}
                onPress={() => checkStatementStatus(statement.id)}
                disabled={isChecking}
              >
                {isChecking ? (
                  <ActivityIndicator size="small" color="#007a33" />
                ) : (
                  <MaterialIcons name="refresh" size={18} color="#007a33" />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyStateContainer}>
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
          </View>
          <Text style={styles.emptyTitle}>No Statements Found</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first bank statement to get started
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('UploadStatement')}
          >
            <MaterialIcons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.uploadButtonText}>Upload Statement</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#007a33" />
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {hasGroupContext && currentGroupName ? currentGroupName : 'Statements'}
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading statements...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    console.error('Error loading statements:', error);
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#007a33" />
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {hasGroupContext && currentGroupName ? currentGroupName : 'Statements'}
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error loading statements</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007a33" />
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {hasGroupContext && currentGroupName ? currentGroupName : 'Statements'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleManualRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="refresh" size={24} color="#fff" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('UploadStatement')}
          >
            <MaterialIcons name="cloud-upload" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          (!statements || statements.length === 0) && styles.scrollContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {!statements || statements.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.statementsList}>
            {statements.map((statement, index) =>
              renderStatement(statement, index === statements.length - 1)
            )}
          </View>
        )}
      </ScrollView>
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
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: 12,
    backgroundColor: '#007a33',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginRight: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    padding: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  reprocessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e0f7f1',
    borderWidth: 1,
    borderColor: '#007a33',
  },
  reprocessButtonText: {
    color: '#007a33',
    fontSize: 12,
    fontWeight: '600',
  },
  checkStatusButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
    minHeight: 32,
  },
  statementErrorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  statementsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lastStatementItem: {
    borderBottomWidth: 0,
  },
  statementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statementDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  sourceBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  processedText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#FF3B30',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statementRight: {
    alignItems: 'flex-end',
  },
  statusAndDownloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  downloadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e0f7f1',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
    borderWidth: 1,
    borderColor: '#007a33',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007a33',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007a33',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});