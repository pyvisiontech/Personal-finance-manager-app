import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation/types';

const STATUS_BAR_HEIGHT = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 0) + 12;

type FAQScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FAQ'>;

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I add a transaction?',
    answer: 'You can add transactions in two ways:\n\n1. Manual Entry: Tap the + button on the Dashboard, then select "Add Transaction" to manually enter amount, category, date, and notes.\n\n2. Upload Statement: Tap the + button and select "Upload Statement" to upload a bank statement file. The app will automatically extract and categorize transactions.',
  },
  {
    id: '2',
    question: 'How do I create or join a group?',
    answer: 'To create a group:\n\n1. Go to Profile Menu → Groups\n2. Tap "Create Group"\n3. Enter a group name (e.g., "Family", "Roommates")\n4. Optionally add member emails to send invites\n5. Tap "Create Group"\n\nTo join a group:\n\n1. You\'ll receive a notification when someone invites you\n2. Tap the notification to view the invite\n3. Tap "Accept" to join the group',
  },
  {
    id: '3',
    question: 'What can I do in a group?',
    answer: 'Groups allow you to:\n\n• View all group members\' transactions in one place\n• Track shared expenses together\n• See collective spending and budgets\n• Better financial transparency with family or roommates\n\nAll group members can see the group\'s transactions, making it easier to manage shared finances.',
  },
 
  {
    id: '4',
    question: 'How do I upload a bank statement?',
    answer: 'To upload a bank statement:\n\n1. Tap the + button on the Dashboard\n2. Select "Upload Statement"\n3. Choose your statement file (PDF, CSV, or image)\n4. Wait for processing\n5. Review and confirm the extracted transactions\n\nSupported formats: PDF, CSV, and image files (JPG, PNG)',
  },
  {
    id: '5',
    question: 'Can I edit or delete a transaction?',
    answer: 'Yes! To edit or delete a transaction:\n\n1. Go to Transactions tab\n2. Find the transaction you want to modify\n3. Tap on the transaction to open details\n4. Tap "Edit" to modify or "Delete" to remove\n\nNote: You can only edit or delete transactions you created.',
  },
  {
    id: '6',
    question: 'How do I filter transactions by date?',
    answer: 'You can filter transactions in multiple ways:\n\n1. On Dashboard: Use the date navigator and filter menu (Daily, Weekly, Monthly, etc.)\n2. On Transactions screen: Use the date filter at the top to view transactions by specific periods\n3. The filter applies to both Dashboard charts and transaction lists',
  },
  {
    id: '7',
    question: 'What categories are available?',
    answer: 'The app includes default categories like:\n\nExpenses: Food, Groceries, Rent, Transport, Shopping, Medical, UPI, Entertainment, Utilities, Education\n\nIncome: Salary, Freelance, Investment, Other Income\n\nYou can select categories when adding transactions. Categories help organize and analyze your spending patterns.',
  },
  {
    id: '8',
    question: 'How do notifications work?',
    answer: 'You\'ll receive notifications for:\n\n• Group invites from other users\n• When someone joins your group\n• When new transactions are added in groups\n• Statement processing updates\n\nView all notifications by tapping the bell icon on the Dashboard or going to Profile Menu → Notifications.',
  },
  {
    id: '9',
    question: 'Is my data secure?',
    answer: 'Yes, your data is secure:\n\n• All data is encrypted and stored securely\n• Your transactions and personal information are private\n• Only you and group members you invite can see group transactions\n• We follow industry-standard security practices to protect your financial data',
  },
];

export function FAQScreen() {
  const navigation = useNavigation<FAQScreenNavigationProp>();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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

  const toggleItem = (id: string) => {
    // If clicking the same item, close it. Otherwise, open the new one (closing previous)
    setExpandedItem(expandedItem === id ? null : id);
  };

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
        <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.introSection}>
          <MaterialIcons name="help-outline" size={48} color="#007a33" />
          <Text style={styles.introTitle}>How can we help you?</Text>
          <Text style={styles.introText}>
            Find answers to common questions about using the Personal Finance Tracker app.
          </Text>
        </View>

        {FAQ_DATA.map((item) => {
          const isExpanded = expandedItem === item.id;
          return (
            <View key={item.id} style={styles.faqCard}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleItem(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.questionText}>{item.question}</Text>
                <MaterialIcons
                  name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={24}
                  color="#007a33"
                />
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still have questions?</Text>
          <Text style={styles.contactText}>
            If you can't find the answer you're looking for, please contact our support team.
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
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  answerText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    marginTop: 12,
  },
  contactSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

