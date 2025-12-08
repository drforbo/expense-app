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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.129:3000';

export default function TransactionCategorizationScreen({
  route,
  navigation
}: any) {
  const { transaction, allTransactions, preGeneratedQuestions } = route.params || {};

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

  // Helper to detect if current transaction is income
  const currentTransaction = transactions[currentIndex] || transaction;
  const isIncome = currentTransaction ? currentTransaction.amount < 0 : false;

  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);
  const feedbackInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
        setTransactions([transaction]);
        setLoading(false);

        // Use pre-generated questions if available, otherwise generate them
        if (preGeneratedQuestions && preGeneratedQuestions.length > 0) {
          console.log('✅ Using pre-generated Q1 (instant load!)');
          setQuestions(preGeneratedQuestions);
        } else {
          await generateQuestions(transaction);
        }
      } else {
        // Otherwise load all transactions
        await loadTransactions();
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // If specific transaction provided, still try to use it
      if (transaction) {
        setTransactions([transaction]);
        setLoading(false);
        await generateQuestions(transaction);
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
      const response = await fetch(`${API_URL}/api/get_uncategorized_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

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

  const generateQuestions = async (transaction: Transaction, previousAnswers: Record<string, string> = {}) => {
    try {
      setProcessing(true);

      const response = await fetch(`${API_URL}/api/generate_questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction,
          userProfile: userProfile || {},
          previousAnswers: previousAnswers || {}
        }),
      });

      const data = await response.json();
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
        const response = await fetch(`${API_URL}/api/generate_questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transaction: transactions[currentIndex],
            userProfile: userProfile || {},
            previousAnswers: newAnswers
          }),
        });

        const data = await response.json();
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

    // Check if this was a text input question (options array is empty)
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
      const response = await fetch(`${API_URL}/api/generate_questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: transactions[currentIndex],
          userProfile: userProfile || {},
          previousAnswers: newAnswers
        }),
      });

      const data = await response.json();
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

      const response = await fetch(`${API_URL}/api/categorize_from_answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: transactions[currentIndex],
          answers: userAnswers,
          userProfile: userProfile || {},
        }),
      });

      const data = await response.json();
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
          }, {
            onConflict: 'user_id,source_transaction_id'
          });

        if (error) {
          console.error('Error saving transaction:', error);
          Alert.alert('Error', 'Failed to save transaction');
          return;
        }

        console.log('✅ Transaction saved to database');
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

      const response = await fetch(`${API_URL}/api/recategorize_with_feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: transactions[currentIndex],
          answers: answers,
          userProfile: userProfile || {},
          currentCategorization: categorization,
          feedback: feedback.trim(),
        }),
      });

      const data = await response.json();
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
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Ionicons name="receipt-outline" size={64} color="#64748B" />
          <Text style={styles.emptyText}>No transactions to categorize</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
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
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.progress}>
              {currentIndex + 1} / {transactions.length}
            </Text>
          </View>

          {/* Q&A Flow */}
            {/* Transaction Card */}
            <View style={[
              styles.transactionCard,
              { backgroundColor: isIncome ? '#FF6B6B10' : '#1F1333' }
            ]}>
              <View style={styles.transactionHeader}>
                <Ionicons
                  name={isIncome ? "trending-up" : "receipt"}
                  size={32}
                  color={isIncome ? '#FF6B6B' : '#7C3AED'}
                />
                <View style={styles.transactionInfo}>
                  <Text style={styles.merchantName}>
                    {currentTransaction?.merchant_name || currentTransaction?.name}
                  </Text>
                  <Text style={styles.transactionDate}>{currentTransaction?.date}</Text>
                </View>
              </View>
              <Text style={[
                styles.amount,
                { color: isIncome ? '#FF6B6B' : '#7C3AED' }
              ]}>
                {isIncome ? '+' : ''}£{Math.abs(currentTransaction?.amount || 0).toFixed(2)}
              </Text>
            </View>

            {/* Questions or Result */}
            {!categorization ? (
          <>
            {processing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={isIncome ? '#FF6B6B' : '#7C3AED'} />
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
                      placeholderTextColor="#64748B"
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
                        styles.submitButton,
                        { backgroundColor: isIncome ? '#FF6B6B' : '#7C3AED' },
                        !customAnswer.trim() && styles.submitButtonDisabled
                      ]}
                      onPress={() => handleCustomAnswer(currentQuestionIndex)}
                      disabled={!customAnswer.trim()}
                    >
                      <Text style={styles.submitButtonText}>Submit</Text>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
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
                          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
                          color={isIncome ? '#FF6B6B' : '#7C3AED'}
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
                      placeholderTextColor="#64748B"
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
                          styles.submitButton,
                          { backgroundColor: isIncome ? '#FF6B6B' : '#7C3AED' },
                          !customAnswer.trim() && styles.submitButtonDisabled
                        ]}
                        onPress={() => handleCustomAnswer(currentQuestionIndex)}
                        disabled={!customAnswer.trim()}
                      >
                        <Text style={styles.submitButtonText}>Submit</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
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
                <Text style={styles.answersTitle}>Your answers:</Text>
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
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
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
                    color={isIncome ? '#FF6B6B' : '#7C3AED'}
                  />
                  <Text style={[
                    styles.splitHeaderText,
                    { color: isIncome ? '#FF6B6B' : '#7C3AED' }
                  ]}>
                    Split Transaction
                  </Text>
                </View>

                <Text style={styles.splitSubheader}>
                  This transaction has been split into business and personal portions
                </Text>

                {((categorization as any).splits || []).map((split: any, idx: number) => {
                  const isBusiness = split.businessPercent > 0;
                  const businessColor = isIncome ? '#FF6B6B' : '#10B981';
                  const personalColor = '#9CA3AF';
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
                        <Text style={[
                          styles.splitAmount,
                          { color: isIncome ? '#FF6B6B' : '#7C3AED' }
                        ]}>
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
                      ? (categorization.taxDeductible ? '#FF6B6B20' : '#64748B20')  // Coral for income
                      : (categorization.taxDeductible ? '#10B98120' : '#64748B20')  // Green for business expenses
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
                        ? (categorization.taxDeductible ? '#FF6B6B' : '#9CA3AF')  // Coral for income
                        : (categorization.taxDeductible ? '#10B981' : '#9CA3AF')  // Green for business expenses
                    }
                  />
                  <Text style={[
                    styles.resultTitle,
                    {
                      color: isIncome
                        ? (categorization.taxDeductible ? '#FF6B6B' : '#9CA3AF')  // Coral for income
                        : (categorization.taxDeductible ? '#10B981' : '#9CA3AF')  // Green for business expenses
                    }
                  ]}>
                    {categorization.taxDeductible
                      ? (isIncome ? 'Business Income' : 'Business Expense')
                      : (isIncome ? 'Personal Income' : 'Personal Expense')
                    }
                  </Text>
                </View>

                <Text style={styles.categoryName}>{categorization.categoryName}</Text>
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
                style={[styles.button, styles.nextButton]}
                onPress={handleNext}
                disabled={recategorizing}
              >
                <Text style={styles.buttonText}>Looks good</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.skipButton]}
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
                <Ionicons name="help-circle-outline" size={18} color="#9CA3AF" />
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
                  placeholderTextColor="#64748B"
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
                      styles.submitButton,
                      (!feedback.trim() || recategorizing) && styles.submitButtonDisabled
                    ]}
                    onPress={handleFeedbackSubmit}
                    disabled={!feedback.trim() || recategorizing}
                  >
                    {recategorizing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.submitButtonText}>Update</Text>
                        <Ionicons name="refresh" size={16} color="#fff" />
                      </>
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
    backgroundColor: '#2E1A47',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    padding: 24,
    paddingBottom: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  progress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  transactionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7C3AED',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  answersContainer: {
    backgroundColor: '#1F133380',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  answersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
  },
  answerRow: {
    marginBottom: 8,
  },
  answerQuestion: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  answerValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    gap: 12,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  explanation: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  percentageContainer: {
    backgroundColor: '#7C3AED20',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 32,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  nextButton: {
    backgroundColor: '#10B981',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  customAnswerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    gap: 8,
  },
  customAnswerToggleText: {
    fontSize: 15,
    color: '#7C3AED',
    fontWeight: '500',
  },
  customAnswerContainer: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#7C3AED15',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  customAnswerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 12,
  },
  customInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F1333',
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#7C3AED40',
  },
  customAnswerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  splitHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  splitHeaderText: {
    fontSize: 20,
    fontWeight: '700',
  },
  splitSubheader: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  splitItem: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitCategory: {
    fontSize: 16,
    fontWeight: '700',
  },
  splitAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#7C3AED',
  },
  splitDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  splitExplanation: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  feedbackToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 12,
    gap: 8,
  },
  feedbackToggleText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  feedbackContainer: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#7C3AED40',
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
    marginBottom: 12,
  },
  feedbackInput: {
    width: '100%',
    backgroundColor: '#2E1A47',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#fff',
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#7C3AED40',
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  successBanner: {
    backgroundColor: '#10B98120',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  successBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
});
