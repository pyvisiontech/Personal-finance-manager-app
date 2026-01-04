import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation/types';
import { useAuth } from '../../../context/AuthContext';
import { useSubmitFeedback } from '../hooks/useSubmitFeedback';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 12;

type FeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;

export function FeedbackScreen() {
  const navigation = useNavigation<FeedbackScreenNavigationProp>();
  const { user } = useAuth();
  const submitFeedback = useSubmitFeedback();
  
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hide tab bar when this screen is focused
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: {
          display: 'none',
        },
      });
    }

    return () => {
      // Show tab bar when leaving this screen
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
    };
  }, [navigation]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit feedback.');
      return;
    }

    if (!feedback.trim()) {
      Alert.alert('Required', 'Please enter your feedback before submitting.');
      return;
    }

    if (feedback.trim().length < 10) {
      Alert.alert('Too Short', 'Please provide more detailed feedback (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitFeedback.mutateAsync({
        userId: user.id,
        feedback: feedback.trim(),
      });

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully. We appreciate your input!',
        [
          {
            text: 'OK',
            onPress: () => {
              setFeedback('');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      Alert.alert(
        'Error',
        error?.message || 'Failed to submit feedback. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const characterCount = feedback.length;
  const maxCharacters = 2000;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007a33" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introSection}>
          <MaterialIcons name="feedback" size={48} color="#007a33" />
          <Text style={styles.introTitle}>Share Your Feedback</Text>
          <Text style={styles.introText}>
            We'd love to hear your thoughts, suggestions, or report any issues you've encountered.
            Your feedback helps us improve the app!
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.label}>Your Feedback</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Tell us what you think..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={8}
            value={feedback}
            onChangeText={setFeedback}
            maxLength={maxCharacters}
            textAlignVertical="top"
            editable={!isSubmitting}
          />
          <Text style={styles.characterCount}>
            {characterCount} / {maxCharacters} characters
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            (isSubmitting || !feedback.trim() || feedback.trim().length < 10) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || !feedback.trim() || feedback.trim().length < 10}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.infoSection}>
          <MaterialIcons name="info-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            Your feedback will be reviewed by our team. We may reach out to you if we need more information.
          </Text>
        </View>
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
  backButton: {
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  introSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    minHeight: 150,
    maxHeight: 300,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007a33',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#007a33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 12,
    flex: 1,
  },
});

