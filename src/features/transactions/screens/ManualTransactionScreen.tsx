import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StyleProp,
  ViewStyle,
  TextStyle,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { Platform } from 'react-native';

const windowWidth = Dimensions.get('window').width;

// Interface for category
interface Category {
  id: string;
  name: string;
  icon: string;
}


// Type for Calculator props
interface CalculatorProps {
  onTextChange: (text: string) => void;
  style?: StyleProp<ViewStyle>;
}

// Helper for evaluation
const evaluateExpression = (expr: string): number => {
  try {
    // Basic safety check: only allow numbers, operators, dots, and spaces
    if (!/^[0-9+\-×÷.\s]+$/.test(expr)) {
      // throw new Error('Invalid characters in expression');
      return 0;
    }

    // Replace display operators with JS operators
    const standardExpr = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/');

    // Use Function constructor for safe evaluation of math expression
    // robust against "85 +" (trailing operator)
    const cleanExpr = standardExpr.trim();
    const lastChar = cleanExpr.slice(-1);
    const finalExpr = ['+', '-', '*', '/'].includes(lastChar)
      ? cleanExpr.slice(0, -1)
      : cleanExpr;

    if (!finalExpr) return 0;

    return new Function(`return ${finalExpr}`)();
  } catch (e) {
    console.warn('Evaluation failed, falling back to simple parse', e);
    return parseFloat(expr) || 0;
  }
};

// Custom Calculator Component
const Calculator: React.FC<CalculatorProps> = ({ onTextChange, style }) => {
  // We now maintain the full string expression as the source of truth for display
  const [expression, setExpression] = useState('0');

  const updateExpression = (newExpr: string) => {
    setExpression(newExpr);
    onTextChange(newExpr);
  };

  const inputDigit = (digit: number) => {
    if (expression === '0') {
      updateExpression(String(digit));
    } else {
      updateExpression(expression + digit);
    }
  };

  const inputDot = () => {
    // Prevent multiple dots in the same number segment
    const parts = expression.split(/[+\-×÷]/);
    const currentPart = parts[parts.length - 1];

    if (currentPart.indexOf('.') === -1) {
      updateExpression(expression + '.');
    }
  };

  const clearDisplay = () => {
    updateExpression('0');
  };

  const performOperation = (op: string) => {
    const lastChar = expression.slice(-1);
    const operators = ['+', '-', '×', '÷'];

    if (operators.includes(lastChar)) {
      // Replace last operator if user changes mind
      updateExpression(expression.slice(0, -1) + ` ${op} `);
    } else {
      // Append new operator
      updateExpression(expression + ` ${op} `);
    }
  };

  const handleEquals = () => {
    const result = evaluateExpression(expression);
    // Format result to avoid long decimals?
    // let resultStr = String(Math.round(result * 100) / 100); 
    // Let's keep persistence precision but maybe stringify
    updateExpression(String(result));
  };

  const handleBackspace = () => {
    if (expression.length <= 1) {
      updateExpression('0');
    } else {
      // If last chars were " + ", remove 3 chars? 
      // Or just remove 1 char at a time. 
      // For standard feel, removing " + " (3 chars) feels better if we added padding
      // But simpler to just remove 1 char. 
      // Our padding logic adds ` ${op} `. 
      const lastChar = expression.slice(-1);
      if (lastChar === ' ') {
        // Likely end of operator padding
        updateExpression(expression.slice(0, -1));
      } else {
        updateExpression(expression.slice(0, -1));
      }
    }
  };

  const renderButton = (
    label: string,
    onPress: () => void,
    style: StyleProp<ViewStyle> = {},
    textStyle: StyleProp<TextStyle> = {}
  ) => (
    <TouchableOpacity
      style={[styles.calcButton, style]}
      onPress={onPress}
    >
      <Text style={[styles.calcButtonText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.calculator, style]}>
      <View style={styles.calcRow}>
        {renderButton('C', clearDisplay, styles.calcClearButton)}
        {renderButton('⌫', handleBackspace, styles.calcOperatorButton)}
        {renderButton('÷', () => performOperation('÷'), styles.calcOperatorButton, styles.calcOperatorText)}
      </View>
      <View style={styles.calcRow}>
        {['7', '8', '9'].map((num) =>
          <React.Fragment key={num}>
            {renderButton(num, () => inputDigit(parseInt(num, 10)), styles.calcNumberButton)}
          </React.Fragment>
        )}
        {renderButton('×', () => performOperation('×'), styles.calcOperatorButton, styles.calcOperatorText)}
      </View>
      <View style={styles.calcRow}>
        {['4', '5', '6'].map((num) =>
          <React.Fragment key={num}>
            {renderButton(num, () => inputDigit(parseInt(num, 10)), styles.calcNumberButton)}
          </React.Fragment>
        )}
        {renderButton('-', () => performOperation('-'), styles.calcOperatorButton, styles.calcOperatorText)}
      </View>
      <View style={styles.calcRow}>
        {['1', '2', '3'].map((num) =>
          <React.Fragment key={num}>
            {renderButton(num, () => inputDigit(parseInt(num, 10)), styles.calcNumberButton)}
          </React.Fragment>
        )}
        {renderButton('+', () => performOperation('+'), styles.calcOperatorButton, styles.calcOperatorText)}
      </View>
      <View style={styles.calcRow}>
        {renderButton('0', () => inputDigit(0), [styles.calcNumberButton, styles.calcZeroButton])}
        {renderButton('.', inputDot, styles.calcNumberButton)}
        {renderButton('=', handleEquals, styles.calcEqualsButton, styles.calcEqualsText)}
      </View>
    </View>
  );
};

const ManualTransactionScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [amount, setAmount] = useState('0');
  const [showCalculator, setShowCalculator] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true });

        if (error) {
          console.error('Error fetching categories:', error);
          Alert.alert('Error', 'Failed to load categories. Using default categories.');
          return;
        }

        if (data) {
          setCategories(data);
        }
      } catch (error) {
        console.error('Error in fetchCategories:', error);
        Alert.alert('Error', 'Failed to load categories. Using default categories.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);


  /* evaluateExpression is now at module level */

  const handleSave = async () => {
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      // Evaluate expected amount here
      const calculatedAmount = evaluateExpression(amount);
      if (isNaN(calculatedAmount)) {
        Alert.alert('Error', 'Invalid amount');
        return;
      }

      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the default account for the user
      const { data: accounts, error: accountError } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (accountError) throw accountError;
      const accountId = accounts?.[0]?.id || null;




      // Insert the transaction
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert([{
          account_id: accountId,
          user_id: user.id,
          source: 'manual', // Marking as manual entry
          amount: Math.abs(calculatedAmount) * (transactionType === 'expense' ? -1 : 1), // Negative for expenses
          currency: 'INR', // Assuming INR as default currency
          type: transactionType,
          raw_description: note || 'Manual transaction',
          merchant: null, // No merchant for manual entries
          status: 'final',
          category_user_id: selectedCategory.id, // Using user's category selection
          occurred_at: date.toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      console.log('Transaction saved:', transaction);
      navigation.goBack();
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>CANCEL</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Transaction</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>SAVE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Transaction Type Tabs */}
        <View style={styles.typeContainer}>
          {['expense', 'income'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                transactionType === type && styles.typeButtonActive,
                {
                  backgroundColor: type === 'expense' ? '#FF6B6B' : '#4CAF50',
                  opacity: transactionType === type ? 1 : 0.7
                }
              ]}
              onPress={() => {
                setTransactionType(type as 'expense' | 'income');
                setSelectedCategory(null); // Reset category when type changes
              }}
            >
              <Text style={styles.typeButtonText}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              {transactionType === type && (
                <MaterialIcons name="check" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {moment(date).format('ddd, MMM D, YYYY')}
            </Text>
            <MaterialIcons name="calendar-today" size={20} color="#666" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Amount Display */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Amount</Text>
          <TouchableOpacity
            onPress={() => setShowCalculator(!showCalculator)}
            style={styles.amountDisplay}
          >
            <Text style={styles.amountText}>₹{amount}</Text>
          </TouchableOpacity>
        </View>

        {/* Calculator */}
        {
          showCalculator && (
            <View style={styles.calculatorContainer}>
              <Calculator
                onTextChange={(text) => {
                  setAmount(text);
                }}
              />
            </View>
          )
        }

        {/* Category Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Category</Text>
          <TouchableOpacity
            style={styles.categoryButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.categoryButtonText, !selectedCategory && { color: '#999' }]}>
              {selectedCategory
                ? `${selectedCategory.icon} ${selectedCategory.name}`
                : 'Select Category'}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Note Input */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What's this for?"
            value={note}
            onChangeText={setNote}
            multiline
          />
        </View>
      </ScrollView >

      {/* Category Selection Modal */}
      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategory?.id === category.id && styles.selectedCategoryItem
                    ]}
                    onPress={() => {
                      setSelectedCategory(category);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={styles.categoryIcon}>{category.icon}</Text>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {selectedCategory?.id === category.id && (
                      <MaterialIcons name="check" style={styles.checkIcon} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View >
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  saveButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    flexDirection: 'row',
  },
  typeButtonActive: {
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
  },
  typeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginRight: 6,
  },
  checkIcon: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 4,
  },
  amountContainer: {
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  amountDisplay: {
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  amountText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  calculatorContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  calculator: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 12,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calcButton: {
    width: 70,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 2,
    margin: 4,
  },
  calcButtonText: {
    fontSize: 24,
    color: '#333',
  },
  calcNumberButton: {
    backgroundColor: '#fff',
  },
  calcOperatorButton: {
    backgroundColor: '#f0f0f0',
  },
  calcOperatorText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  calcClearButton: {
    backgroundColor: '#ff6b6b',
  },
  calcEqualsButton: {
    backgroundColor: '#007AFF',
  },
  calcEqualsText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calcZeroButton: {
    width: 148,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCategoryItem: {
    backgroundColor: '#f5f5f5',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
  },
  closeButton: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default ManualTransactionScreen;