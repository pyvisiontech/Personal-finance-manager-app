import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { useUploadStatement, usePickDocument } from '../hooks/useUploadStatement';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

export function UploadStatementScreen({ navigation }: any) {
  const { user } = useAuth();
  const uploadStatement = useUploadStatement();
  const pickDocument = usePickDocument();
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [processingImportId, setProcessingImportId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);

  const handlePickFile = async () => {
    const file = await pickDocument();
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    try {
      const importRecord = await uploadStatement.mutateAsync({
        userId: user.id,
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });
      
      Alert.alert('Success', 'Statement uploaded successfully! Processing will begin shortly.');
      setSelectedFile(null);
      setProcessingImportId(importRecord?.id || null);
      setProcessingStatus(importRecord?.status || 'uploaded');
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Could not upload statement');
      setProcessingImportId(null);
      setProcessingStatus(null);
    }
  };

  useEffect(() => {
    if (!processingImportId) return;

    const pollStatus = async () => {
      const { data, error } = await supabase
        .from('statement_imports')
        .select('status')
        .eq('id', processingImportId)
        .single();

      if (error) {
        console.error('Failed to check statement status', error);
        return;
      }

      if (data?.status) {
        setProcessingStatus(data.status);

        if (data.status === 'completed') {
          setProcessingImportId(null);
          Alert.alert('Success', 'Statement processed. Redirecting to transactions.');
          navigation.navigate('Transactions');
        } else if (data.status === 'failed') {
          setProcessingImportId(null);
          Alert.alert('Processing Failed', 'Please try uploading the statement again.');
        }
      }
    };

    const intervalId = setInterval(pollStatus, 3000);
    pollStatus();

    return () => clearInterval(intervalId);
  }, [processingImportId, navigation]);

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <View className="p-5">
        <Text className="text-3xl font-bold text-gray-800 mb-2">Upload Bank Statement</Text>
        <Text className="text-sm text-gray-600 mb-6">
          Upload your bank statement (PDF or CSV) to automatically categorize transactions
        </Text>

        <Card className="mb-4">
          {selectedFile ? (
            <View>
              <Text className="text-base text-gray-800 mb-4 font-medium">{selectedFile.name}</Text>
              <Button
                title="Change File"
                onPress={handlePickFile}
                variant="outline"
                className="mb-3"
              />
            </View>
          ) : (
            <View className="items-center py-5">
              <Text className="text-base text-gray-600 mb-4">No file selected</Text>
              <Button
                title="Pick File"
                onPress={handlePickFile}
                variant="outline"
                className="mb-3"
              />
            </View>
          )}

          {selectedFile && (
            <Button
              title={uploadStatement.isPending ? 'Uploading...' : 'Upload Statement'}
              onPress={handleUpload}
              loading={uploadStatement.isPending}
              disabled={uploadStatement.isPending}
              className="mt-3"
            />
          )}

          {processingStatus && (
            <Text className="text-sm text-gray-600 mt-2">
              Processing status: {processingStatus}
            </Text>
          )}
        </Card>

        <Card className="bg-blue-50">
          <Text className="text-base font-semibold text-gray-800 mb-2">Supported Formats:</Text>
          <Text className="text-sm text-gray-600 mb-1">• PDF files (.pdf)</Text>
          <Text className="text-sm text-gray-600 mb-1">• CSV files (.csv)</Text>
          <Text className="text-sm text-gray-600 mb-1">• Excel files (.xlsx)</Text>
        </Card>
      </View>
    </ScrollView>
  );
}
