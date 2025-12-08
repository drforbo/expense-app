import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

interface Transaction {
  transaction_id: string;
  name: string;
  merchant_name?: string;
  amount: number;
  date: string;
  category?: string[];
  statement_filename?: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

export default function TransactionListScreen({ navigation }: any) {

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState<Record<string, any>>({});
  const isPreGenerating = useRef(false);
  const lastTransactionCount = useRef(0);

  useEffect(() => {
    loadTransactions();
  }, []);

  // Reload transactions when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async () => {
    try {
      console.log('🔄 Starting transaction load...');
      setLoading(true);

      // Get current user
      console.log('👤 Getting user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('✅ User ID:', user?.id);

      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Fetch uncategorized transactions from server
      console.log('📡 Fetching from:', `${API_URL}/api/get_uncategorized_transactions`);
      const startTime = Date.now();

      const response = await fetch(`${API_URL}/api/get_uncategorized_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      const loadTime = Date.now() - startTime;
      console.log(`⏱️  Server response time: ${loadTime}ms`);

      const data = await response.json();
      console.log('📊 Received transactions:', data.transactions?.length || 0);

      if (data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions);

        // Pre-generate Q1 for all transactions in the background
        preGenerateQuestions(data.transactions, user.id);
      } else {
        console.log('⚠️  No uncategorized transactions');
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions: ' + error.message);
    } finally {
      setLoading(false);
      console.log('✅ Transaction load complete');
    }
  };

  const preGenerateQuestions = async (txns: Transaction[], userId: string | undefined) => {
    // Skip if already pre-generating or if transaction count hasn't changed significantly
    if (isPreGenerating.current) {
      console.log('⏭️ Skipping pre-generation - already in progress');
      return;
    }

    // Only re-generate if transaction count changed (new transactions added or categorized)
    if (lastTransactionCount.current === txns.length && Object.keys(preGeneratedQuestions).length > 0) {
      console.log('⏭️ Skipping pre-generation - no new transactions');
      return;
    }

    try {
      isPreGenerating.current = true;
      lastTransactionCount.current = txns.length;
      console.log('⚡ Pre-generating Q1 for', txns.length, 'transactions...');

      // Get user profile for better questions
      let userProfile = {};
      if (userId) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        userProfile = data || {};
      }

      const response = await fetch(`${API_URL}/api/bulk_generate_first_questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: txns,
          userProfile
        }),
      });

      const data = await response.json();

      // Map results by transaction_id for quick lookup
      const questionsMap: Record<string, any> = {};
      data.results.forEach((result: any) => {
        if (result.questions) {
          questionsMap[result.transaction_id] = result.questions;
        }
      });

      setPreGeneratedQuestions(questionsMap);
      console.log('✅ Pre-generated Q1 for', Object.keys(questionsMap).length, 'transactions');
    } catch (error) {
      console.error('Error pre-generating questions:', error);
      // Don't alert user - this is a background optimization
    } finally {
      isPreGenerating.current = false;
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    navigation.navigate('TransactionCategorization', {
      transaction,
      allTransactions: transactions,
      preGeneratedQuestions: preGeneratedQuestions[transaction.transaction_id],
    });
  };

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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Transactions</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={styles.emptyStateTitle}>All done!</Text>
          <Text style={styles.emptyStateText}>
            All transactions have been categorized
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{transactions.length}</Text>
          <Text style={styles.statLabel}>to categorize</Text>
        </View>
      </View>

      {/* Transaction List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {transactions.map((transaction) => {
          const isIncome = transaction.amount < 0;
          return (
            <TouchableOpacity
              key={transaction.transaction_id}
              style={[
                styles.transactionItem,
                { backgroundColor: isIncome ? '#FF6B6B15' : '#1F1333' }
              ]}
              onPress={() => handleTransactionPress(transaction)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.transactionIcon,
                { backgroundColor: isIncome ? '#FF6B6B30' : '#7C3AED20' }
              ]}>
                <Ionicons
                  name={isIncome ? "trending-up" : "receipt-outline"}
                  size={24}
                  color={isIncome ? '#FF6B6B' : '#7C3AED'}
                />
              </View>

              <View style={styles.transactionDetails}>
                <Text style={styles.merchantName}>
                  {transaction.merchant_name || transaction.name}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(transaction.date)}
                </Text>
                {transaction.statement_filename && (
                  <Text style={styles.statementSource}>
                    {transaction.statement_filename.replace(/\.pdf$/i, '')}
                  </Text>
                )}
              </View>

              <View style={styles.transactionRight}>
                <Text style={[
                  styles.transactionAmount,
                  { color: isIncome ? '#FF6B6B' : '#7C3AED' }
                ]}>
                  {isIncome ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#64748B" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
    backgroundColor: '#2E1A47',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statsBar: {
    backgroundColor: '#1F1333',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  transactionItem: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statementSource: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
