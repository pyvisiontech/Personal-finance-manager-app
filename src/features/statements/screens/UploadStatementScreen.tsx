import React, { useState, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Alert, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { useUploadStatement, usePickDocument } from '../hooks/useUploadStatement';
import { useAuth } from '../../../context/AuthContext';
import { RootStackParamList } from '../../../navigation/types';

export function UploadStatementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const uploadStatement = useUploadStatement();
  const pickDocument = usePickDocument();
  const [selectedFile, setSelectedFile] = useState<{ 
    uri: string; 
    name: string; 
    type: string 
  } | null>(null);

  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: {
        height: 0,
        overflow: 'hidden',
        borderTopWidth: 0,
      },
    });

    return () => {
      // Show tab bar when leaving this screen
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: '#f4f1e3',
          borderTopColor: '#d8d2b8',
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
        },
      });
    };
  }, [navigation]);

  const handlePickFile = async () => {
    const file = await pickDocument();
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    try {
      await uploadStatement.mutateAsync({
        userId: user.id,
        fileUri: selectedFile.uri,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });
      Alert.alert(
        'Upload Successful! 📄',
        'Your statement has been uploaded successfully. Please wait 10-15 minutes while we process and categorize your transactions. You can check the status in the Statements screen.',
        [
          {
            text: 'View Statements',
            onPress: () => navigation.navigate('StatementsList'),
            style: 'default',
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );
      setSelectedFile(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload statement');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Upload Statement</Text>
      <Text style={styles.subtitle}>Upload your bank statement to import transactions</Text>

      <View style={styles.card}>
        {!selectedFile ? (
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={handlePickFile}
          >
            <Text>Select File</Text>
            <Text style={styles.smallText}>Supports: PDF, CSV, XLSX</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileContainer}>
            <Text style={styles.fileName}>{selectedFile.name}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handlePickFile}
                style={[styles.button, styles.outlineButton]}
                disabled={uploadStatement.isPending}
              >
                <Text style={styles.outlineButtonText}>Change</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpload}
                style={[styles.button, styles.primaryButton]}
                disabled={uploadStatement.isPending}
              >
                {uploadStatement.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Supported Formats:</Text>
        <Text>• PDF (.pdf)</Text>
        <Text>• CSV (.csv)</Text>
        <Text>• Excel (.xlsx, .xls)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 20,
    fontSize: 14,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadButton: {
    padding: 24,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  fileContainer: {
    width: '100%',
  },
  fileName: {
    marginBottom: 16,
    color: '#374151',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  outlineButtonText: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  smallText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  infoCard: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
});