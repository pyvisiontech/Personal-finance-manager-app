import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { RootStackParamList } from '../../../navigation/types';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { Platform } from 'react-native';
import { TransactionWithCategory } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useGroupContext } from '../../../context/GroupContext';

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
  const route = useRoute<RouteProp<RootStackParamList, 'ManualTransaction'>>();
  const existingTransaction = route.params?.transaction as TransactionWithCategory | undefined;
  const isEditing = !!existingTransaction;
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentGroupId, hasGroupContext } = useGroupContext();
  const [amount, setAmount] = useState('0');
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Determine where to navigate back to
  // If editing, we came from TransactionsListScreen
  // If creating new, check if we can go back in the current stack
  const getReturnScreen = useCallback(() => {
    if (isEditing) {
      // If editing, always return to TransactionsListScreen
      return 'TransactionsList';
    }
    
    // If creating new, check if we can go back in the TransactionsStack
    // If we can't go back, we likely came from Dashboard via FAB
    try {
      const canGoBack = navigation.canGoBack();
      if (!canGoBack) {
        // Can't go back, so we came from Dashboard via FAB
        return 'Dashboard';
      }
      
      // Check the navigation state to see stack depth
      const state = navigation.getState();
      if (state && state.routes) {
        // Check if we're the first screen in the TransactionsStack
        // This would indicate we came from Dashboard via FAB
        const currentRoute = state.routes[state.index];
        if (currentRoute && (currentRoute as any).state) {
          const stackState = (currentRoute as any).state;
          // If ManualTransaction is the only screen in the stack, we came from Dashboard
          if (stackState.index === 0 && stackState.routes && stackState.routes.length === 1) {
            return 'Dashboard';
          }
        }
      }
    } catch (error) {
      // If we can't determine, default to TransactionsList
      
    }
    
    // Default: return to TransactionsListScreen
    return 'TransactionsList';
  }, [isEditing, navigation]);

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
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [note, setNote] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (existingTransaction) {
      console.log('🔍 [DEBUG] Transaction received in ManualTransactionScreen:', {
        id: existingTransaction.id,
        idType: typeof existingTransaction.id,
        idExists: !!existingTransaction.id,
        amount: existingTransaction.amount,
        type: existingTransaction.type,
        source: existingTransaction.source,
        hasCategoryUser: !!existingTransaction.category_user_id,
        hasCategoryAi: !!existingTransaction.category_ai_id,
        category_user_id: existingTransaction.category_user_id,
        category_ai_id: existingTransaction.category_ai_id,
        user_id: existingTransaction.user_id,
        raw_description: existingTransaction.raw_description,
        merchant: existingTransaction.merchant,
        occurred_at: existingTransaction.occurred_at,
        created_at: existingTransaction.created_at,
        fullObject: JSON.stringify(existingTransaction, null, 2),
      });
      
      setAmount(Math.abs(existingTransaction.amount).toString());
      setTransactionType(existingTransaction.type === 'income' ? 'income' : 'expense');
      setNote(existingTransaction.raw_description || existingTransaction.merchant || '');

      // Set the date from the existing transaction (preserve the time)
      if (existingTransaction.occurred_at) {
        // Parse the date and preserve the original time
        const transactionDate = moment(existingTransaction.occurred_at).toDate();
        // Don't reset hours - preserve the original time from the transaction
        setDate(transactionDate);
      }

      const category =
        existingTransaction.category_user ||
        existingTransaction.category_ai ||
        existingTransaction.category;

      if (category) {
        setSelectedCategory({
          id: category.id,
          name: category.name,
          icon: category.icon || '📦',
        });
      }
    } else {
      
    }
  }, [existingTransaction]);

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
        
          Alert.alert('Error', 'Failed to load categories. Using default categories.');
          return;
        }

        if (data) {
          setCategories(data);
        }
      } catch (error) {
       
        Alert.alert('Error', 'Failed to load categories. Using default categories.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);


  /* evaluateExpression is now at module level */

  const handleSave = async () => {
    console.log('🔍 [DEBUG] handleSave called:', {
      isEditing,
      hasExistingTransaction: !!existingTransaction,
      existingTransactionId: existingTransaction?.id,
      existingTransactionSource: existingTransaction?.source,
      hasSelectedCategory: !!selectedCategory,
      selectedCategoryId: selectedCategory?.id,
    });

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    // Validate selectedCategory has an ID
    if (!selectedCategory.id) {
      Alert.alert('Error', 'Selected category is missing an ID');
     
      return;
    }

    // Validate that we have transaction ID when editing
    if (isEditing && (!existingTransaction || !existingTransaction.id)) {
      Alert.alert('Error', 'Cannot edit: Transaction ID is missing');
     
      return;
    }

    // Set updating state when editing, saving state when creating new
    if (isEditing) {
      setIsUpdating(true);
    } else {
      setIsSaving(true);
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


      // Use the date as-is (preserve the time component)
      // When editing, this preserves the original transaction time
      // When creating new, this uses the current time from the date object
      const occurredAt = moment(date).local().format('YYYY-MM-DD HH:mm:ss');

      // Always use the selected date from the date picker
      const payload = {
        account_id: accountId,
        user_id: user.id,
        source: existingTransaction?.source || 'manual',
        amount: Math.abs(calculatedAmount) * (transactionType === 'expense' ? -1 : 1), // Negative for expenses
        currency: existingTransaction?.currency || 'INR',
        type: transactionType,
        raw_description: note || 'Manual transaction',
        merchant: existingTransaction?.merchant || null,
        status: existingTransaction?.status || 'final',
        category_user_id: selectedCategory.id,
        occurred_at: occurredAt, // Use formatted date string
      };

     

      if (isEditing && existingTransaction && existingTransaction.id) {
        // When editing, UPDATE the existing transaction with the same UUID
        // Preserve category_ai_id if it exists (don't set to null)
        const updatePayload = {
          account_id: accountId,
          user_id: user.id,
          source: existingTransaction.source || 'manual', // Preserve original source
          amount: Math.abs(calculatedAmount) * (transactionType === 'expense' ? -1 : 1),
          currency: existingTransaction.currency || 'INR',
          type: transactionType,
          raw_description: note || existingTransaction.raw_description || 'Manual transaction',
          merchant: existingTransaction.merchant || null,
          status: existingTransaction.status || 'final',
          category_user_id: selectedCategory.id, // Set user category
          category_ai_id: existingTransaction.category_ai_id || null, // PRESERVE existing AI category (don't clear it)
          occurred_at: occurredAt,
        };
        
        // UPDATE the existing transaction - do NOT create a new one
        const { data: updatedData, error: updateError } = await supabase
          .from('transactions')
          .update(updatePayload)
          .eq('id', existingTransaction.id) // Update by ID to ensure same UUID
          .select()
          .single();

        if (updateError) {
          
          Alert.alert('Update Failed', `Failed to update transaction: ${updateError.message}`);
          throw updateError;
        }
        
        if (!updatedData) {
          const errorMsg = 'Transaction update returned no data - transaction may not exist';
          
          Alert.alert('Update Failed', errorMsg);
          throw new Error(errorMsg);
        }
        
        // Verify the updated transaction has the same ID
        if (updatedData.id !== existingTransaction.id) {
          const errorMsg = `Transaction ID mismatch! Expected ${existingTransaction.id}, got ${updatedData.id}`;
          
          throw new Error(errorMsg);
        }
        
        // Verify the category_user_id was actually saved
        if (updatedData.category_user_id !== selectedCategory.id) {
          const errorMsg = `Category not saved! Expected ${selectedCategory.id}, got ${updatedData.category_user_id}`;
        
          Alert.alert('Warning', 'Category may not have been saved correctly. Please check Supabase.');
        }
        
        
        // Update complete, reset updating state
        setIsUpdating(false);
      } else {
        // Only INSERT if we're NOT editing (creating a new transaction)

        if (isEditing) {
          const errorMsg = `Cannot edit: Transaction ID is missing. isEditing=${isEditing}, hasTransaction=${!!existingTransaction}, hasId=${!!(existingTransaction?.id)}`;
        
          throw new Error(errorMsg);
        }
        
       
      
        const { data: insertedData, error: insertError } = await supabase
          .from('transactions')
          .insert([payload])
          .select()
          .single();
          
        if (insertError) {
         
          throw insertError;
        }
        // Save complete, reset saving state
        setIsSaving(false);
      }

      // Invalidate only the specific transaction queries needed (not all queries)
      // This prevents refetching unnecessary queries like previous period data
      // Use the local 'user' variable from supabase.auth.getUser() above
      if (user?.id) {
        // Invalidate personal transactions for this user (all filter combinations)
        queryClient.invalidateQueries({ 
          queryKey: ['transactions', user.id],
          exact: false // Match all queries starting with ['transactions', userId]
        });
      }
      
      // If in group context, also invalidate group transactions
      if (hasGroupContext && currentGroupId) {
        queryClient.invalidateQueries({ 
          queryKey: ['groupTransactions', currentGroupId],
          exact: false // Match all queries starting with ['groupTransactions', groupId]
        });
      }
      
      // Navigate immediately - React Query will refetch when screens focus
      // This provides instant feedback instead of waiting 30-40 seconds
      // Always reset TransactionsStack first to remove ManualTransaction from history
      navigation.reset({
        index: 0,
        routes: [{ name: 'TransactionsList' as never }],
      });
      
      // Then navigate to the correct screen based on where we came from
      const returnScreen = getReturnScreen();
      if (returnScreen === 'Dashboard') {
        // Navigate to Dashboard tab after a small delay to ensure stack reset completes
        setTimeout(() => {
          navigation.getParent()?.navigate('HomeTab', { screen: 'Dashboard' });
        }, 100);
      }
    } catch (error) {
     
      setIsUpdating(false); // Reset updating state on error
      setIsSaving(false); // Reset saving state on error
      Alert.alert('Error', 'Failed to save transaction. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!isEditing || !existingTransaction) {
      return;
    }

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', existingTransaction.id);

              if (deleteError) {
               
                setIsDeleting(false);
                Alert.alert('Error', 'Failed to delete transaction. Please try again.');
                return;
              }

              queryClient.invalidateQueries({ queryKey: ['transactions'] });
              
              // Reset deleting state before navigation
              setIsDeleting(false);
              
              // Navigate to TransactionsList and reset stack to prevent reopening
              navigation.reset({
                index: 0,
                routes: [{ name: 'TransactionsList' as never }],
              });
            } catch (error) {
             
              setIsDeleting(false);
              Alert.alert('Error', 'Failed to delete transaction. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          // Always reset TransactionsStack first to remove ManualTransaction from history
          navigation.reset({
            index: 0,
            routes: [{ name: 'TransactionsList' as never }],
          });
          
          // Then navigate to the correct screen based on where we came from
          const returnScreen = getReturnScreen();
          if (returnScreen === 'Dashboard') {
            // Navigate to Dashboard tab after a small delay to ensure stack reset completes
            setTimeout(() => {
              navigation.getParent()?.navigate('HomeTab', { screen: 'Dashboard' });
            }, 100);
          }
        }}>
          <Text style={styles.cancelButton}>CANCEL</Text>
        </TouchableOpacity>
        {isEditing ? (
          <>
            <TouchableOpacity 
              onPress={handleSave}
              disabled={isUpdating || isDeleting}
              style={(isUpdating || isDeleting) && styles.disabledButton}
            >
              <Text style={[styles.title, (isUpdating || isDeleting) && styles.disabledText]}>
                {isUpdating ? 'UPDATING...' : 'UPDATE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDelete} 
              style={styles.deleteIconButton}
              disabled={isUpdating || isDeleting}
            >
              <MaterialIcons 
                name="delete" 
                size={24} 
                color={(isUpdating || isDeleting) ? "#9ca3af" : "#b91c1c"} 
              />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            onPress={handleSave} 
            disabled={isSaving}
            style={[styles.saveButtonRight, isSaving && styles.disabledButton]}
          >
            <Text style={[styles.title, isSaving && styles.disabledText]}>
              {isSaving ? 'SAVING...' : 'SAVE'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
                  // Preserve the current time when changing the date
                  // This ensures if user is editing, the time is preserved
                  const newDate = new Date(selectedDate);
                  const currentDate = date;
                  // Preserve hours, minutes, seconds from current date
                  newDate.setHours(
                    currentDate.getHours(),
                    currentDate.getMinutes(),
                    currentDate.getSeconds(),
                    currentDate.getMilliseconds()
                  );
                  setDate(newDate);
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
                    {category.icon ? (
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                    ) : (
                      <MaterialIcons name="folder" size={24} color="#666" style={styles.categoryIcon} />
                    )}
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

      {/* Loading Overlay for Update Progress */}
      {isUpdating && (
        <Modal
          visible={isUpdating}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Updating transaction...</Text>
              <Text style={styles.loadingSubtext}>Please wait</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Loading Overlay for Delete Progress */}
      {isDeleting && (
        <Modal
          visible={isDeleting}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#b91c1c" />
              <Text style={styles.loadingText}>Deleting transaction...</Text>
              <Text style={styles.loadingSubtext}>Please wait</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Loading Overlay for Save Progress */}
      {isSaving && (
        <Modal
          visible={isSaving}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Saving transaction...</Text>
              <Text style={styles.loadingSubtext}>Please wait</Text>
            </View>
          </View>
        </Modal>
      )}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  saveButtonRight: {
    marginLeft: 'auto',
  },
  iconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteIconButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32, // Add padding at bottom to ensure content is fully visible
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
  // Loading Overlay Styles
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

export default ManualTransactionScreen;