import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

const CATEGORY_EMOJI: Record<string, string> = {
  'Office Supplies': '🖊️', 'Travel': '✈️', 'Meals': '🍽️', 'Software': '💻',
  'Marketing': '📣', 'Insurance': '🛡️', 'Utilities': '⚡', 'Rent': '🏠',
  'Professional Services': '👔', 'Training': '📚', 'Equipment': '🔧',
  'Phone': '📱', 'Internet': '🌐', 'Subscriptions': '🔄', 'Bank Fees': '🏦',
  'Transport': '🚗', 'Clothing': '👕', 'Entertainment': '🎭', 'Health': '💊',
  'Gifts': '🎁', 'Income': '💰', 'Other': '📋',
};
const getCategoryEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '📋';

interface Transaction {
  transaction_id: string;
  name: string;
  merchant_name?: string;
  amount: number;
  date: string;
  category?: string[];
}

interface Question {
  text: string;
  options: string[];
}

interface Categorization {
  categoryId: string;
  categoryName: string;
  businessPercent: number;
  explanation: string;
  taxDeductible: boolean;
}

interface Suggestion {
  type: string;
  message: string;
  normalizedMerchant: string;
  similarTransaction?: {
    amount: number;
    date: string;
    categoryId: string;
    categoryName: string;
    businessPercent: number;
  };
  suggestedCategoryId: string;
  suggestedCategoryName: string;
  suggestedBusinessPercent: number;
  typicalAnswers?: Record<string, string>;
  confidence: number;
  occurrenceCount: number;
  isVariable: boolean;
}

export default function TransactionCategorizationScreen({
  route,
  navigation
}: any) {
  const { transaction, allTransactions, preGeneratedQuestions, batchMode, batchMerchant } = route.params || {};

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [categorization, setCategorization] = useState<Categorization | null>(null);
  const [processing, setProcessing] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [customAnswer, setCustomAnswer] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [recategorizing, setRecategorizing] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  // Smart suggestion state
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [usingSuggestion, setUsingSuggestion] = useState(false);

  // Same as Above state - tracks the last categorization for quick apply
  const [lastCategorization, setLastCategorization] = useState<{
    categoryId: string;
    categoryName: string;
    businessPercent: number;
    explanation: string;
    taxDeductible: boolean;
    answers: Record<string, string>;
  } | null>(null);

  // Helper to detect if current transaction is income
  const currentTransaction = transactions[currentIndex] || transaction;
  const isIncome = currentTransaction ? currentTransaction.amount < 0 : false;

  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const feedbackInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Memory jogger state
  const [showMemoryJogger, setShowMemoryJogger] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  useEffect(() => {
    loadUserProfile();

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);


  useEffect(() => {
    // Smart scroll when custom input is shown OR keyboard appears
    if ((showCustomInput || showFeedback || keyboardVisible) && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [showCustomInput, showFeedback, keyboardVisible]);



  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error loading profile:', error);
        } else {
          setUserProfile(data);
          console.log('✅ Loaded user profile:', data);
        }
      }

      // If a specific transaction was passed, use it directly
      if (transaction) {
        // In batch mode, use allTransactions; otherwise just the single transaction
        const txnsToUse = allTransactions && allTransactions.length > 0
          ? allTransactions
          : [transaction];
        setTransactions(txnsToUse);
        setLoading(false);

        // Use pre-generated questions if available, otherwise generate them
        if (preGeneratedQuestions && preGeneratedQuestions.length > 0) {
          console.log('✅ Using pre-generated Q1 (instant load!)');
          setQuestions(preGeneratedQuestions);
        } else {
          await generateQuestions(txnsToUse[0]);
        }
      } else {
        // Otherwise load all transactions
        await loadTransactions();
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // If specific transaction provided, still try to use it
      if (transaction) {
        const txnsToUse = allTransactions && allTransactions.length > 0
          ? allTransactions
          : [transaction];
        setTransactions(txnsToUse);
        setLoading(false);
        await generateQuestions(txnsToUse[0]);
      } else {
        await loadTransactions();
      }
    }
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Fetch uncategorized transactions
      const data = await apiPost('/api/get_uncategorized_transactions', { user_id: user.id });

      if (data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions);
        // Generate questions for first transaction
        await generateQuestions(data.transactions[0]);
      } else {
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch smart suggestion for a transaction
  const fetchSuggestion = async (transaction: Transaction) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const data = await apiPost('/api/get_categorization_suggestions', {
        user_id: user.id,
        transaction
      });
      if (data.hasSuggestion && data.suggestion) {
        console.log('💡 Got suggestion for', transaction.merchant_name);
        return data.suggestion as Suggestion;
      }
      return null;
    } catch (error) {
      console.log('Warning: Failed to fetch suggestion', error);
      return null;
    }
  };

  // Handle accepting a suggestion
  const handleUseSuggestion = async () => {
    if (!suggestion) return;

    try {
      setUsingSuggestion(true);
      setShowSuggestion(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const currentTxn = transactions[currentIndex] || transaction;
      const isIncomeTransaction = currentTxn.amount < 0;

      // Save the transaction with the suggested categorization
      const { error } = await supabase
        .from('categorized_transactions')
        .upsert({
          user_id: user.id,
          source_transaction_id: currentTxn.transaction_id,
          source_type: 'pdf_upload',
          merchant_name: currentTxn.merchant_name || currentTxn.name,
          amount: Math.abs(currentTxn.amount),
          transaction_date: currentTxn.date,
          category_id: suggestion.suggestedCategoryId,
          category_name: suggestion.suggestedCategoryName,
          business_percent: suggestion.suggestedBusinessPercent,
          explanation: `Based on previous ${suggestion.suggestedCategoryName} categorization`,
          tax_deductible: suggestion.suggestedBusinessPercent > 0,
          user_answers: suggestion.typicalAnswers || {},
          transaction_type: isIncomeTransaction ? 'income' : 'expense',
          categorization_source: 'suggestion_accepted'
        }, {
          onConflict: 'user_id,source_transaction_id'
        });

      if (error) {
        console.error('Error saving transaction:', error);
        Alert.alert('Error', 'Failed to save transaction');
        return;
      }

      // Update merchant pattern
      try {
        await apiPost('/api/update_merchant_pattern', {
          user_id: user.id,
          transaction: currentTxn,
          categorization: {
            categoryId: suggestion.suggestedCategoryId,
            categoryName: suggestion.suggestedCategoryName,
            businessPercent: suggestion.suggestedBusinessPercent,
            userAnswers: suggestion.typicalAnswers || {}
          },
          categorization_source: 'suggestion_accepted'
        });
      } catch (patternError) {
        console.log('Warning: Failed to update merchant pattern', patternError);
      }

      console.log('✅ Transaction saved using suggestion');

      // Move to next transaction
      if (transaction) {
        navigation.goBack();
      } else {
        const nextIndex = currentIndex + 1;
        if (nextIndex < transactions.length) {
          setCurrentIndex(nextIndex);
          setSuggestion(null);
          setShowSuggestion(true);
          setUsingSuggestion(false);
          await generateQuestions(transactions[nextIndex]);
        } else {
          Alert.alert('Done!', 'All transactions categorized', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      }
    } catch (error: any) {
      console.error('Error using suggestion:', error);
      Alert.alert('Error', error.message || 'Failed to save transaction');
    } finally {
      setUsingSuggestion(false);
    }
  };

  // Handle rejecting suggestion (use normal flow)
  const handleDifferentThisTime = () => {
    setShowSuggestion(false);
  };

  // Handle "Same as Above" - apply the last categorization to current transaction
  const handleSameAsAbove = async () => {
    if (!lastCategorization) return;

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const currentTxn = transactions[currentIndex];
      const isIncomeTransaction = currentTxn.amount < 0;

      // Save with the same categorization as the previous transaction
      const { error } = await supabase
        .from('categorized_transactions')
        .upsert({
          user_id: user.id,
          source_transaction_id: currentTxn.transaction_id,
          source_type: 'pdf_upload',
          merchant_name: currentTxn.merchant_name || currentTxn.name,
          amount: Math.abs(currentTxn.amount),
          transaction_date: currentTxn.date,
          category_id: lastCategorization.categoryId,
          category_name: lastCategorization.categoryName,
          business_percent: lastCategorization.businessPercent,
          explanation: lastCategorization.explanation,
          tax_deductible: lastCategorization.taxDeductible,
          user_answers: lastCategorization.answers,
          transaction_type: isIncomeTransaction ? 'income' : 'expense',
          categorization_source: 'same_as_above'
        }, {
          onConflict: 'user_id,source_transaction_id'
        });

      if (error) {
        console.error('Error saving transaction:', error);
        Alert.alert('Error', 'Failed to save transaction');
        return;
      }

      // Update merchant pattern
      try {
        await apiPost('/api/update_merchant_pattern', {
          user_id: user.id,
          transaction: currentTxn,
          categorization: {
            categoryId: lastCategorization.categoryId,
            categoryName: lastCategorization.categoryName,
            businessPercent: lastCategorization.businessPercent,
            userAnswers: lastCategorization.answers
          },
          categorization_source: 'same_as_above'
        });
      } catch (patternError) {
        console.log('Warning: Failed to update merchant pattern', patternError);
      }

      console.log('✅ Transaction saved using Same as Above');

      // Move to next transaction
      const nextIndex = currentIndex + 1;
      if (nextIndex < transactions.length) {
        setCurrentIndex(nextIndex);
        setCategorization(null);
        setAnswers({});
        setQuestions([]);
        setShowSuggestion(true);
        await generateQuestions(transactions[nextIndex]);
      } else {
        Alert.alert('Done!', `All ${transactions.length} transactions categorized`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      console.error('Error in Same as Above:', error);
      Alert.alert('Error', error.message || 'Failed to save transaction');
    } finally {
      setProcessing(false);
    }
  };

  const generateQuestions = async (transaction: Transaction, previousAnswers: Record<string, string> = {}) => {
    try {
      setProcessing(true);

      // Fetch suggestion for this transaction (only on first load, not follow-ups)
      if (Object.keys(previousAnswers).length === 0) {
        const newSuggestion = await fetchSuggestion(transaction);
        setSuggestion(newSuggestion);
        setShowSuggestion(true);
      }

      const data = await apiPost('/api/generate_questions', {
        transaction,
        userProfile: userProfile || {},
        previousAnswers: previousAnswers || {}
      });

      const newQuestions = data.questions || [];

      // If we have previous answers, append new questions to existing ones
      if (Object.keys(previousAnswers).length > 0) {
        // Keep the questions we already asked and add the new follow-up question
        const numAnswered = Object.keys(previousAnswers).length;
        const previousQuestions = questions.slice(0, numAnswered);
        setQuestions([...previousQuestions, ...newQuestions]);
      } else {
        // First time - set all questions and reset answers
        setQuestions(newQuestions);
        setAnswers({});
      }

      setCategorization(null);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      Alert.alert('Error', 'Failed to generate questions');
    } finally {
      setProcessing(false);
    }
  };

  const handleAnswer = async (questionIndex: number, answer: string) => {
    const newAnswers = {
      ...answers,
      [questions[questionIndex].text]: answer,
    };
    setAnswers(newAnswers);
    setCustomAnswer(''); // Clear custom input
    setShowCustomInput(false); // Hide custom input

    // LIMIT: Max 4 questions total (2 initial + 2 follow-ups max)
    const MAX_QUESTIONS = 4;

    // If this was the last predefined question, check if we need more questions
    if (questionIndex === questions.length - 1) {
      // If we've already asked 4 questions, stop and categorize
      if (questions.length >= MAX_QUESTIONS) {
        console.log('✅ Max questions reached, categorizing...');
        await categorizeTransaction(newAnswers);
        return;
      }

      // Try to generate follow-up questions based on their answer
      try {
        setProcessing(true);
        const data = await apiPost('/api/generate_questions', {
          transaction: transactions[currentIndex],
          userProfile: userProfile || {},
          previousAnswers: newAnswers
        });

        const newQuestions = data.questions || [];

        // If AI returns no more questions, categorize now
        if (newQuestions.length === 0) {
          console.log('✅ No more questions needed, categorizing...');
          await categorizeTransaction(newAnswers);
        } else {
          // Add the new follow-up question (but only up to the max)
          const numAnswered = Object.keys(newAnswers).length;
          const previousQuestions = questions.slice(0, numAnswered);
          const combinedQuestions = [...previousQuestions, ...newQuestions];

          // Enforce max limit
          if (combinedQuestions.length > MAX_QUESTIONS) {
            console.log('✅ Would exceed max questions, categorizing...');
            await categorizeTransaction(newAnswers);
          } else {
            setQuestions(combinedQuestions);
          }
        }
      } catch (error) {
        console.error('Error checking for follow-up questions:', error);
        // If error, just categorize with what we have
        await categorizeTransaction(newAnswers);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleCustomAnswer = async (questionIndex: number) => {
    if (!customAnswer.trim()) {
      Alert.alert('Please enter an answer', 'Type your answer in the text box above');
      return;
    }

    const newAnswers = {
      ...answers,
      [questions[questionIndex].text]: customAnswer.trim(),
    };
    setAnswers(newAnswers);
    setCustomAnswer('');
    setShowCustomInput(false);

    const currentQuestion = questions[questionIndex];
    const isTextInputQuestion = currentQuestion.options.length === 0;

    // If it's a text input question (like split details), we're done - categorize immediately
    if (isTextInputQuestion) {
      console.log('✅ Text input answered, categorizing...');
      await categorizeTransaction(newAnswers);
      return;
    }

    // LIMIT: Max 4 questions total
    const MAX_QUESTIONS = 4;

    // If we've already asked 4 questions, stop and categorize
    if (questions.length >= MAX_QUESTIONS) {
      console.log('✅ Max questions reached, categorizing...');
      await categorizeTransaction(newAnswers);
      return;
    }

    // Try to generate follow-up questions
    try {
      setProcessing(true);
      const data = await apiPost('/api/generate_questions', {
        transaction: transactions[currentIndex],
        userProfile: userProfile || {},
        previousAnswers: newAnswers
      });

      const newQuestions = data.questions || [];

      // If AI returns no more questions (empty array), categorize now
      if (newQuestions.length === 0) {
        console.log('✅ No more questions needed, categorizing...');
        await categorizeTransaction(newAnswers);
      } else {
        // Add the new follow-up question (but only up to the max)
        const numAnswered = Object.keys(newAnswers).length;
        const previousQuestions = questions.slice(0, numAnswered);
        const combinedQuestions = [...previousQuestions, ...newQuestions];

        // Enforce max limit
        if (combinedQuestions.length > MAX_QUESTIONS) {
          console.log('✅ Would exceed max questions, categorizing...');
          await categorizeTransaction(newAnswers);
        } else {
          setQuestions(combinedQuestions);
        }
      }
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      Alert.alert('Error', 'Failed to generate follow-up questions');
    } finally {
      setProcessing(false);
    }
  };

  const categorizeTransaction = async (userAnswers: Record<string, string>) => {
    try {
      setProcessing(true);

      const data = await apiPost('/api/categorize_from_answers', {
        transaction: transactions[currentIndex],
        answers: userAnswers,
        userProfile: userProfile || {},
      });

      setCategorization(data);
    } catch (error: any) {
      console.error('Error categorizing:', error);
      Alert.alert('Error', 'Failed to categorize transaction');
    } finally {
      setProcessing(false);
    }
  };

  const handleNext = async () => {
    if (!categorization) return;

    try {
      setProcessing(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to save transactions');
        return;
      }

      // Check if this is a split transaction
      if ((categorization as any).isSplit && (categorization as any).splits) {
        // Save both split portions as separate transactions
        const splits = (categorization as any).splits;
        // Determine if this is income (negative amount from bank statement)
        const isIncome = transactions[currentIndex].amount < 0;

        for (let i = 0; i < splits.length; i++) {
          const split = splits[i];
          const { error } = await supabase
            .from('categorized_transactions')
            .upsert({
              user_id: user.id,
              source_transaction_id: `${transactions[currentIndex].transaction_id}_split_${i}`,
              source_type: 'pdf_upload',
              merchant_name: `${transactions[currentIndex].merchant_name || transactions[currentIndex].name} (${split.description})`,
              amount: split.amount,
              transaction_date: transactions[currentIndex].date,
              category_id: split.categoryId,
              category_name: split.categoryName,
              business_percent: split.businessPercent,
              explanation: split.explanation,
              tax_deductible: split.taxDeductible,
              user_answers: answers,
              transaction_type: isIncome ? 'income' : 'expense',
            }, {
              onConflict: 'user_id,source_transaction_id'
            });

          if (error) {
            console.error('Error saving split transaction:', error);
            Alert.alert('Error', 'Failed to save transaction split');
            return;
          }
        }

        console.log('✅ Split transaction saved to database');
      } else {
        // Save regular single-purpose transaction
        // Determine if this is income (negative amount from bank statement)
        const isIncome = transactions[currentIndex].amount < 0;

        const { error } = await supabase
          .from('categorized_transactions')
          .upsert({
            user_id: user.id,
            source_transaction_id: transactions[currentIndex].transaction_id,
            source_type: 'pdf_upload',
            merchant_name: transactions[currentIndex].merchant_name || transactions[currentIndex].name,
            amount: Math.abs(transactions[currentIndex].amount),
            transaction_date: transactions[currentIndex].date,
            category_id: categorization.categoryId,
            category_name: categorization.categoryName,
            business_percent: categorization.businessPercent,
            explanation: categorization.explanation,
            tax_deductible: categorization.taxDeductible,
            user_answers: answers,
            transaction_type: isIncome ? 'income' : 'expense',
          }, {
            onConflict: 'user_id,source_transaction_id'
          });

        if (error) {
          console.error('Error saving transaction:', error);
          Alert.alert('Error', 'Failed to save transaction');
          return;
        }

        console.log('✅ Transaction saved to database');

        // Store this categorization for "Same as Above" feature
        setLastCategorization({
          categoryId: categorization.categoryId,
          categoryName: categorization.categoryName,
          businessPercent: categorization.businessPercent,
          explanation: categorization.explanation,
          taxDeductible: categorization.taxDeductible,
          answers: { ...answers }
        });

        // Update merchant pattern for learning
        try {
          await apiPost('/api/update_merchant_pattern', {
            user_id: user.id,
            transaction: transactions[currentIndex],
            categorization: {
              categoryId: categorization.categoryId,
              categoryName: categorization.categoryName,
              businessPercent: categorization.businessPercent,
              userAnswers: answers
            },
            categorization_source: 'manual'
          });
          console.log('📊 Merchant pattern updated');
        } catch (patternError) {
          console.log('Warning: Failed to update merchant pattern', patternError);
          // Don't block the flow if pattern update fails
        }
      }

      // If we came from the transaction list, go back to it (list will auto-refresh via useFocusEffect)
      if (transaction) {
        console.log('✅ Navigating back to refresh list');
        navigation.goBack();
      } else {
        // Otherwise move to next transaction
        const nextIndex = currentIndex + 1;
        if (nextIndex < transactions.length) {
          setCurrentIndex(nextIndex);
          await generateQuestions(transactions[nextIndex]);
        } else {
          Alert.alert('Done!', 'All transactions categorized', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      }
    } catch (error: any) {
      console.error('Error in handleNext:', error);
      Alert.alert('Error', error.message || 'Failed to save transaction');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < transactions.length) {
      setCurrentIndex(nextIndex);
      await generateQuestions(transactions[nextIndex]);
    } else {
      navigation.goBack();
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Please enter feedback', 'Tell us what needs to be changed');
      return;
    }

    try {
      setRecategorizing(true);

      const data = await apiPost('/api/recategorize_with_feedback', {
        transaction: transactions[currentIndex],
        answers: answers,
        userProfile: userProfile || {},
        currentCategorization: categorization,
        feedback: feedback.trim(),
      });

      setCategorization(data);
      setFeedback('');
      setShowFeedback(false);

      // Show success banner
      setShowSuccessBanner(true);
      setTimeout(() => {
        setShowSuccessBanner(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error re-categorizing:', error);
      Alert.alert('Error', 'Failed to update categorization');
    } finally {
      setRecategorizing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.gradientMid} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color={colors.muted} />
          <Text style={styles.emptyText}>No transactions to categorize</Text>
          <TouchableOpacity
            style={styles.goBackButtonWrap}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const currentQuestionIndex = Object.keys(answers).length;
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.progressContainer}>
              <Text style={styles.screenLabel}>CATEGORIZE</Text>
              {batchMode && batchMerchant && (
                <Text style={styles.batchLabel}>{batchMerchant}</Text>
              )}
              <Text style={styles.progress}>
                {currentIndex + 1} / {transactions.length}
              </Text>
            </View>
          </View>

          {/* Q&A Flow */}
            {/* Transaction Card */}
            <View style={[
              styles.transactionCard,
              isIncome && { borderColor: colors.positive, borderWidth: 1.5 }
            ]}>
              <View style={styles.transactionHeader}>
                <View style={[styles.transactionIconWrap, { backgroundColor: isIncome ? colors.tagIncomeBg : colors.tagExpenseBg }]}>
                  <Text style={{ fontSize: 24 }}>{getCategoryEmoji(currentTransaction?.category?.[0] || '')}</Text>
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.merchantName}>
                    {currentTransaction?.merchant_name || currentTransaction?.name}
                  </Text>
                  <Text style={styles.transactionDate}>{currentTransaction?.date}</Text>
                </View>
              </View>
              <Text style={[
                styles.amount,
                { color: isIncome ? colors.positive : colors.negative }
              ]}>
                {isIncome ? '+' : ''}£{Math.abs(currentTransaction?.amount || 0).toFixed(2)}
              </Text>
            </View>

            {/* Same as Above Card - shows after first categorization */}
            {lastCategorization && currentIndex > 0 && !categorization && (
              <View style={styles.sameAsAboveCard}>
                <View style={styles.sameAsAboveContent}>
                  <View style={styles.sameAsAboveIcon}>
                    <Ionicons name="copy-outline" size={20} color={colors.positive} />
                  </View>
                  <View style={styles.sameAsAboveText}>
                    <Text style={styles.sameAsAboveTitle}>Same as above?</Text>
                    <Text style={styles.sameAsAboveDesc}>
                      {lastCategorization.categoryName} ({lastCategorization.businessPercent}% business)
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.sameAsAboveButton}
                  onPress={handleSameAsAbove}
                  disabled={processing}
                >
                  {processing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <LinearGradient
                      colors={gradients.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sameAsAboveGradient}
                    >
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                      <Text style={styles.sameAsAboveButtonText}>Apply</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Smart Suggestion Card */}
            {suggestion && showSuggestion && !categorization && (
              <View style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <View style={styles.suggestionIconContainer}>
                    <Ionicons name="sparkles" size={20} color={colors.gradientMid} />
                  </View>
                  <Text style={styles.suggestionTitle}>We remember this</Text>
                </View>

                <Text style={styles.suggestionMessage}>
                  {suggestion.message}
                </Text>

                {suggestion.isVariable && (
                  <View style={styles.suggestionWarning}>
                    <Ionicons name="information-circle" size={14} color={colors.gradientMid} />
                    <Text style={styles.suggestionWarningText}>
                      You've categorized this merchant differently before
                    </Text>
                  </View>
                )}

                <View style={styles.suggestionButtons}>
                  <TouchableOpacity
                    style={styles.suggestionAcceptButton}
                    onPress={handleUseSuggestion}
                    disabled={usingSuggestion}
                  >
                    {usingSuggestion ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                        <Text style={styles.gradientButtonText}>Use Same Category</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.suggestionRejectButton}
                    onPress={handleDifferentThisTime}
                    disabled={usingSuggestion}
                  >
                    <Text style={styles.suggestionRejectText}>Different This Time</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Memory Jogger - Search suggestions */}
            <View style={styles.memoryJoggerSection}>
              <TouchableOpacity
                style={styles.memoryJoggerHeader}
                onPress={() => setShowMemoryJogger(!showMemoryJogger)}
              >
                <View style={styles.memoryJoggerTitleRow}>
                  <Ionicons name="bulb" size={20} color={colors.gradientMid} />
                  <Text style={styles.memoryJoggerTitle}>Memory Jogger</Text>
                </View>
                <Ionicons
                  name={showMemoryJogger ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.midGrey}
                />
              </TouchableOpacity>

              {showMemoryJogger && currentTransaction && (
                <View style={styles.memoryJoggerContent}>
                  <Text style={styles.memoryJoggerSubtitle}>
                    Need help remembering? Search your email or messages:
                  </Text>

                  <View style={styles.searchSuggestions}>
                    <Text style={styles.searchSuggestionLabel}>Tap to copy:</Text>

                    {/* Merchant name */}
                    <TouchableOpacity
                      style={[styles.searchTermChip, copiedText === (currentTransaction.merchant_name || currentTransaction.name) && styles.searchTermChipCopied]}
                      onPress={() => copyToClipboard(currentTransaction.merchant_name || currentTransaction.name)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={copiedText === (currentTransaction.merchant_name || currentTransaction.name) ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === (currentTransaction.merchant_name || currentTransaction.name) ? colors.positive : colors.gradientMid} />
                      <Text style={styles.searchTermText}>{currentTransaction.merchant_name || currentTransaction.name}</Text>
                      {copiedText === (currentTransaction.merchant_name || currentTransaction.name) && <Text style={styles.copiedBadge}>Copied!</Text>}
                    </TouchableOpacity>

                    {/* Amount */}
                    {(() => {
                      const amountOnly = Math.abs(currentTransaction.amount).toFixed(2);
                      return (
                        <TouchableOpacity
                          style={[styles.searchTermChip, copiedText === amountOnly && styles.searchTermChipCopied]}
                          onPress={() => copyToClipboard(amountOnly)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={copiedText === amountOnly ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === amountOnly ? colors.positive : colors.gradientMid} />
                          <Text style={styles.searchTermText}>{amountOnly}</Text>
                          {copiedText === amountOnly && <Text style={styles.copiedBadge}>Copied!</Text>}
                        </TouchableOpacity>
                      );
                    })()}

                    {/* Merchant + amount */}
                    {(() => {
                      const merchantAmount = `${currentTransaction.merchant_name || currentTransaction.name} ${Math.abs(currentTransaction.amount).toFixed(2)}`;
                      return (
                        <TouchableOpacity
                          style={[styles.searchTermChip, copiedText === merchantAmount && styles.searchTermChipCopied]}
                          onPress={() => copyToClipboard(merchantAmount)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={copiedText === merchantAmount ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === merchantAmount ? colors.positive : colors.gradientMid} />
                          <Text style={styles.searchTermText}>{merchantAmount}</Text>
                          {copiedText === merchantAmount && <Text style={styles.copiedBadge}>Copied!</Text>}
                        </TouchableOpacity>
                      );
                    })()}

                    {/* Receipt search */}
                    {(() => {
                      const receiptSearch = `${currentTransaction.merchant_name || currentTransaction.name} receipt OR order OR confirmation`;
                      return (
                        <TouchableOpacity
                          style={[styles.searchTermChip, copiedText === receiptSearch && styles.searchTermChipCopied]}
                          onPress={() => copyToClipboard(receiptSearch)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name={copiedText === receiptSearch ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === receiptSearch ? colors.positive : colors.gradientMid} />
                          <Text style={styles.searchTermText} numberOfLines={1}>{currentTransaction.merchant_name || currentTransaction.name} receipt OR order</Text>
                          {copiedText === receiptSearch && <Text style={styles.copiedBadge}>Copied!</Text>}
                        </TouchableOpacity>
                      );
                    })()}
                  </View>

                  <View style={styles.searchTips}>
                    <Text style={styles.searchTipTitle}>Where to look:</Text>
                    <View style={styles.searchTipRow}>
                      <Ionicons name="mail-outline" size={16} color={colors.midGrey} />
                      <Text style={styles.searchTipText}>Email inbox & receipts folder</Text>
                    </View>
                    <View style={styles.searchTipRow}>
                      <Ionicons name="chatbubble-outline" size={16} color={colors.midGrey} />
                      <Text style={styles.searchTipText}>WhatsApp & iMessage</Text>
                    </View>
                    <View style={styles.searchTipRow}>
                      <Ionicons name="images-outline" size={16} color={colors.midGrey} />
                      <Text style={styles.searchTipText}>Photos app (screenshots)</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Questions or Result */}
            {!categorization ? (
          <>
            {processing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={colors.gradientMid} />
                <Text style={styles.processingText}>
                  {currentQuestionIndex === 0 ? 'Analyzing...' : 'Processing...'}
                </Text>
              </View>
            ) : currentQuestion ? (
              <View style={styles.questionContainer}>
                <Text style={styles.questionText}>{currentQuestion.text}</Text>

                {/* If no options provided, show text input directly */}
                {currentQuestion.options.length === 0 ? (
                  <View style={styles.customAnswerContainer}>
                    <Text style={styles.customAnswerLabel}>Your answer:</Text>
                    <TextInput
                      ref={textInputRef}
                      style={styles.customInput}
                      value={customAnswer}
                      onChangeText={setCustomAnswer}
                      placeholder="Type your answer here..."
                      placeholderTextColor={colors.muted}
                      multiline
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (customAnswer.trim()) {
                          handleCustomAnswer(currentQuestionIndex);
                        }
                      }}
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitButtonWrap,
                        !customAnswer.trim() && styles.submitButtonDisabled
                      ]}
                      onPress={() => handleCustomAnswer(currentQuestionIndex)}
                      disabled={!customAnswer.trim()}
                    >
                      <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        <Text style={styles.gradientButtonText}>Submit</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.white} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.optionsContainer}>
                      {currentQuestion.options.map((option, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.optionButton}
                          onPress={() => handleAnswer(currentQuestionIndex, option)}
                        >
                          <Text style={styles.optionText}>{option}</Text>
                          <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Custom Answer Section - only show toggle if options exist */}
                    {!showCustomInput ? (
                      <TouchableOpacity
                        style={styles.customAnswerToggle}
                        onPress={() => setShowCustomInput(true)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color={colors.gradientMid}
                        />
                        <Text style={styles.customAnswerToggleText}>or type your own answer</Text>
                      </TouchableOpacity>
                    ) : (
                  <View style={styles.customAnswerContainer}>
                    <Text style={styles.customAnswerLabel}>Your answer:</Text>
                    <TextInput
                      ref={textInputRef}
                      style={styles.customInput}
                      value={customAnswer}
                      onChangeText={setCustomAnswer}
                      placeholder="Type your answer here..."
                      placeholderTextColor={colors.muted}
                      multiline
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (customAnswer.trim()) {
                          handleCustomAnswer(currentQuestionIndex);
                        }
                      }}
                    />
                    <View style={styles.customAnswerButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setShowCustomInput(false);
                          setCustomAnswer('');
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.submitButtonWrap,
                          !customAnswer.trim() && styles.submitButtonDisabled
                        ]}
                        onPress={() => handleCustomAnswer(currentQuestionIndex)}
                        disabled={!customAnswer.trim()}
                      >
                        <LinearGradient
                          colors={gradients.primary}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.gradientButton}
                        >
                          <Text style={styles.gradientButtonText}>Submit</Text>
                          <Ionicons name="arrow-forward" size={16} color={colors.white} />
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                    )}
                  </>
                )}
              </View>
            ) : null}

            {/* Previous Answers */}
            {Object.keys(answers).length > 0 && (
              <View style={styles.answersContainer}>
                <Text style={styles.answersTitle}>YOUR ANSWERS</Text>
                {Object.entries(answers).map(([question, answer], idx) => (
                  <View key={idx} style={styles.answerRow}>
                    <Text style={styles.answerQuestion}>{question}</Text>
                    <Text style={styles.answerValue}>{answer}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.resultContainer}>
            {/* Success Banner */}
            {showSuccessBanner && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={20} color={colors.positive} />
                <Text style={styles.successBannerText}>Updated successfully</Text>
              </View>
            )}

            {(categorization as any).isSplit ? (
              // Split transaction display
              <>
                <View style={styles.splitHeaderBadge}>
                  <Ionicons
                    name="git-branch-outline"
                    size={24}
                    color={colors.gradientMid}
                  />
                  <Text style={[
                    styles.splitHeaderText,
                    { color: colors.gradientMid }
                  ]}>
                    Split Transaction
                  </Text>
                </View>

                <Text style={styles.splitSubheader}>
                  This transaction has been split into business and personal portions
                </Text>

                {((categorization as any).splits || []).map((split: any, idx: number) => {
                  const isBusiness = split.businessPercent > 0;
                  const businessColor = isIncome ? colors.positive : colors.positive;
                  const personalColor = colors.midGrey;
                  const color = isBusiness ? businessColor : personalColor;

                  return (
                    <View key={idx} style={[
                      styles.splitItem,
                      { borderLeftColor: color }
                    ]}>
                      <View style={styles.splitHeader}>
                        <View style={styles.splitTitleRow}>
                          <Ionicons
                            name={isBusiness ? "checkmark-circle" : "home-outline"}
                            size={20}
                            color={color}
                          />
                          <Text style={[
                            styles.splitCategory,
                            { color: color }
                          ]}>
                            {split.categoryName}
                          </Text>
                        </View>
                        <Text style={styles.splitAmount}>
                          £{split.amount.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.splitDescription}>{split.description}</Text>
                      <Text style={styles.splitExplanation}>{split.explanation}</Text>
                    </View>
                  );
                })}
              </>
            ) : (
              // Regular single-purpose transaction display
              <>
                <View style={[
                  styles.resultBadge,
                  {
                    backgroundColor: isIncome
                      ? (categorization.taxDeductible ? colors.tagExpenseBg : colors.surface)
                      : (categorization.taxDeductible ? colors.tagIncomeBg : colors.surface)
                  }
                ]}>
                  <Ionicons
                    name={
                      isIncome
                        ? (categorization.taxDeductible ? "trending-up" : "home-outline")
                        : (categorization.taxDeductible ? "checkmark-circle" : "home-outline")
                    }
                    size={32}
                    color={
                      isIncome
                        ? (categorization.taxDeductible ? colors.gradientMid : colors.midGrey)
                        : (categorization.taxDeductible ? colors.positive : colors.midGrey)
                    }
                  />
                  <Text style={[
                    styles.resultTitle,
                    {
                      color: isIncome
                        ? (categorization.taxDeductible ? colors.gradientMid : colors.midGrey)
                        : (categorization.taxDeductible ? colors.positive : colors.midGrey)
                    }
                  ]}>
                    {categorization.taxDeductible
                      ? (isIncome ? 'Business Income' : 'Business Expense')
                      : (isIncome ? 'Personal Income' : 'Personal Expense')
                    }
                  </Text>
                </View>

                <Text style={styles.categoryName}>
                  {getCategoryEmoji(categorization.categoryName)} {categorization.categoryName}
                </Text>
                <Text style={styles.explanation}>{categorization.explanation}</Text>

                {categorization.businessPercent < 100 && categorization.businessPercent > 0 && (
                  <View style={styles.percentageContainer}>
                    <Text style={styles.percentageText}>
                      {categorization.businessPercent}% business use
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.nextButtonWrap}
                onPress={handleNext}
                disabled={recategorizing}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.gradientButtonText}>Looks good</Text>
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                disabled={recategorizing}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>

            {/* Feedback Section */}
            {!showFeedback ? (
              <TouchableOpacity
                style={styles.feedbackToggle}
                onPress={() => setShowFeedback(true)}
              >
                <Ionicons name="help-circle-outline" size={18} color={colors.midGrey} />
                <Text style={styles.feedbackToggleText}>Doesn't look right? Tell us why</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackLabel}>What needs to be changed?</Text>
                <TextInput
                  ref={feedbackInputRef}
                  style={styles.feedbackInput}
                  value={feedback}
                  onChangeText={setFeedback}
                  placeholder="e.g., This should be 100% business, not personal..."
                  placeholderTextColor={colors.muted}
                  multiline
                  autoFocus
                />
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowFeedback(false);
                      setFeedback('');
                      Keyboard.dismiss();
                    }}
                    disabled={recategorizing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitButtonWrap,
                      (!feedback.trim() || recategorizing) && styles.submitButtonDisabled
                    ]}
                    onPress={handleFeedbackSubmit}
                    disabled={!feedback.trim() || recategorizing}
                  >
                    {recategorizing ? (
                      <View style={styles.gradientButton}>
                        <ActivityIndicator size="small" color={colors.white} />
                      </View>
                    ) : (
                      <LinearGradient
                        colors={gradients.primary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                      >
                        <Text style={styles.gradientButtonText}>Update</Text>
                        <Ionicons name="refresh" size={16} color={colors.white} />
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
    paddingBottom: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
  },
  progress: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  progressContainer: {
    alignItems: 'center',
  },
  batchLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.gradientMid,
    marginBottom: 2,
  },
  // Same as Above styles
  sameAsAboveCard: {
    backgroundColor: colors.tagIncomeBg,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sameAsAboveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sameAsAboveIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tagIncomeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  sameAsAboveText: {
    flex: 1,
  },
  sameAsAboveTitle: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.positive,
    marginBottom: 2,
  },
  sameAsAboveDesc: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  sameAsAboveButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  sameAsAboveGradient: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sameAsAboveButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  transactionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  amount: {
    fontSize: 32,
    fontFamily: fonts.display,
    color: colors.negative,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  emptyText: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
  },
  goBackButtonWrap: {
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    marginTop: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  questionContainer: {
    marginBottom: spacing.lg,
  },
  questionText: {
    fontSize: 20,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    flex: 1,
    marginRight: spacing.sm,
  },
  answersContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  answersTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  answerRow: {
    marginBottom: spacing.xs,
  },
  answerQuestion: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: 2,
  },
  answerValue: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  resultTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
  },
  categoryName: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  explanation: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  percentageContainer: {
    backgroundColor: colors.tagExpenseBg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xl,
  },
  percentageText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.tagExpenseText,
  },
  actionButtons: {
    width: '100%',
    gap: spacing.sm,
  },
  nextButtonWrap: {
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  gradientButton: {
    borderRadius: borderRadius.full,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  gradientButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  customAnswerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  customAnswerToggleText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.gradientMid,
  },
  customAnswerContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  customAnswerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  customInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  customAnswerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  submitButtonWrap: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  splitHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  splitHeaderText: {
    fontSize: 20,
    fontFamily: fonts.display,
  },
  splitSubheader: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  splitItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  splitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  splitCategory: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
  },
  splitAmount: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.negative,
  },
  splitDescription: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 4,
  },
  splitExplanation: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    lineHeight: 18,
  },
  feedbackToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  feedbackToggleText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  feedbackContainer: {
    marginTop: spacing.md,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  feedbackLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  successBanner: {
    backgroundColor: colors.tagIncomeBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  successBannerText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.positive,
  },
  // Smart Suggestion Card Styles
  suggestionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  suggestionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  suggestionMessage: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  suggestionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  suggestionWarningText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.tagExpenseText,
    flex: 1,
  },
  suggestionButtons: {
    gap: 10,
  },
  suggestionAcceptButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  suggestionRejectButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
  },
  suggestionRejectText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  // Memory Jogger Styles
  memoryJoggerSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  memoryJoggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  memoryJoggerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memoryJoggerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  memoryJoggerContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  memoryJoggerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: spacing.sm,
  },
  searchSuggestions: {
    marginBottom: spacing.md,
  },
  searchSuggestionLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: 10,
  },
  searchTermChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: 10,
  },
  searchTermChipCopied: {
    backgroundColor: colors.tagIncomeBg,
    borderColor: colors.positive,
  },
  searchTermText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
    flex: 1,
  },
  copiedBadge: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.positive,
  },
  searchTips: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchTipTitle: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 10,
  },
  searchTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xs,
  },
  searchTipText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
});
