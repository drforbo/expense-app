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

type SortOption = 'date' | 'merchant' | 'amount';

interface TransactionGroup {
  title: string;
  transactions: Transaction[];
  count: number;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.119:3000';

interface DetectedSubscription {
  merchantNormalized: string;
  merchantDisplay: string;
  amount: number;
  frequency: string;
  transactionCount: number;
  confidence: number;
}

export default function TransactionListScreen({ navigation }: any) {

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [detectedSubscriptions, setDetectedSubscriptions] = useState<DetectedSubscription[]>([]);
  const [subscriptionBannerDismissed, setSubscriptionBannerDismissed] = useState(false);
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

        // Detect subscriptions in the background
        detectSubscriptions(user.id);
      } else {
        console.log('⚠️  No uncategorized transactions');
        setTransactions([]);
        setDetectedSubscriptions([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions: ' + error.message);
    } finally {
      setLoading(false);
      console.log('✅ Transaction load complete');
    }
  };

  const detectSubscriptions = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/detect_subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      const data = await response.json();

      if (data.success && data.subscriptions?.length > 0) {
        console.log(`🔄 Detected ${data.subscriptions.length} subscriptions`);
        setDetectedSubscriptions(data.subscriptions);
        setSubscriptionBannerDismissed(false);
      } else {
        setDetectedSubscriptions([]);
      }
    } catch (error) {
      console.error('Error detecting subscriptions:', error);
      // Don't show error to user - this is a background optimization
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

  // Normalize merchant name for grouping
  const normalizeMerchantName = (name: string): string => {
    return (name || 'Unknown')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get sorted and optionally grouped transactions
  const getSortedTransactions = (): Transaction[] => {
    const sorted = [...transactions];

    switch (sortBy) {
      case 'date':
        return sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      case 'merchant':
        return sorted.sort((a, b) => {
          const nameA = normalizeMerchantName(a.merchant_name || a.name);
          const nameB = normalizeMerchantName(b.merchant_name || b.name);
          return nameA.localeCompare(nameB);
        });
      case 'amount':
        return sorted.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
      default:
        return sorted;
    }
  };

  // Group transactions by merchant (only used when sorted by merchant)
  const getGroupedTransactions = (): TransactionGroup[] => {
    if (sortBy !== 'merchant') {
      return [{
        title: '',
        transactions: getSortedTransactions(),
        count: transactions.length
      }];
    }

    const sorted = getSortedTransactions();
    const groups: Map<string, Transaction[]> = new Map();

    sorted.forEach(txn => {
      const merchantName = txn.merchant_name || txn.name;
      const normalizedName = normalizeMerchantName(merchantName);

      if (!groups.has(normalizedName)) {
        groups.set(normalizedName, []);
      }
      groups.get(normalizedName)!.push(txn);
    });

    return Array.from(groups.entries()).map(([key, txns]) => ({
      title: txns[0].merchant_name || txns[0].name,
      transactions: txns,
      count: txns.length
    }));
  };

  // Handle pressing "Categorize All" for a merchant group
  const handleCategorizeGroup = (group: TransactionGroup) => {
    if (group.transactions.length === 1) {
      handleTransactionPress(group.transactions[0]);
    } else {
      // Navigate with all transactions from this group
      navigation.navigate('TransactionCategorization', {
        transaction: group.transactions[0],
        allTransactions: group.transactions,
        preGeneratedQuestions: preGeneratedQuestions[group.transactions[0].transaction_id],
        batchMode: true,
        batchMerchant: group.title,
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

      {/* Subscription Detection Banner */}
      {detectedSubscriptions.length > 0 && !subscriptionBannerDismissed && (
        <TouchableOpacity
          style={styles.subscriptionBanner}
          onPress={() => navigation.navigate('SubscriptionReview', { subscriptions: detectedSubscriptions })}
          activeOpacity={0.8}
        >
          <View style={styles.subscriptionBannerIcon}>
            <Ionicons name="repeat" size={20} color="#7C3AED" />
          </View>
          <View style={styles.subscriptionBannerContent}>
            <Text style={styles.subscriptionBannerTitle}>
              {detectedSubscriptions.length} subscription{detectedSubscriptions.length > 1 ? 's' : ''} detected
            </Text>
            <Text style={styles.subscriptionBannerSubtitle}>
              Tap to review and bulk categorize
            </Text>
          </View>
          <View style={styles.subscriptionBannerActions}>
            <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
            <TouchableOpacity
              style={styles.subscriptionBannerDismiss}
              onPress={(e) => {
                e.stopPropagation();
                setSubscriptionBannerDismissed(true);
              }}
            >
              <Ionicons name="close" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Sort Toggle */}
      <View style={styles.sortToggleContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortToggle}>
          {(['date', 'merchant', 'amount'] as SortOption[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.sortOption,
                sortBy === option && styles.sortOptionActive
              ]}
              onPress={() => setSortBy(option)}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === option && styles.sortOptionTextActive
              ]}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {getGroupedTransactions().map((group, groupIndex) => (
          <View key={`group-${groupIndex}`}>
            {/* Group Header (only show when sorted by merchant and group has multiple items) */}
            {sortBy === 'merchant' && (
              <View style={styles.groupHeader}>
                <View style={styles.groupHeaderLeft}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <View style={styles.groupBadge}>
                    <Text style={styles.groupBadgeText}>{group.count}</Text>
                  </View>
                </View>
                {group.count > 1 && (
                  <TouchableOpacity
                    style={styles.categorizeAllButton}
                    onPress={() => handleCategorizeGroup(group)}
                  >
                    <Text style={styles.categorizeAllText}>Categorize All</Text>
                    <Ionicons name="arrow-forward" size={14} color="#7C3AED" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Transactions in this group */}
            {group.transactions.map((transaction) => {
              const isIncome = transaction.amount < 0;
              return (
                <TouchableOpacity
                  key={transaction.transaction_id}
                  style={[
                    styles.transactionItem,
                    { backgroundColor: isIncome ? '#FF6B6B15' : '#1F1333' },
                    sortBy === 'merchant' && styles.transactionItemGrouped
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
                    {sortBy !== 'merchant' && (
                      <Text style={styles.merchantName}>
                        {transaction.merchant_name || transaction.name}
                      </Text>
                    )}
                    <Text style={[
                      styles.transactionDate,
                      sortBy === 'merchant' && styles.transactionDatePrimary
                    ]}>
                      {formatDate(transaction.date)}
                    </Text>
                    {transaction.statement_filename && sortBy !== 'merchant' && (
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
          </View>
        ))}
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
  // Sort toggle styles
  sortToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 12,
  },
  sortToggle: {
    flexDirection: 'row',
    backgroundColor: '#1F1333',
    borderRadius: 8,
    padding: 4,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sortOptionActive: {
    backgroundColor: '#7C3AED',
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  sortOptionTextActive: {
    color: '#fff',
  },
  // Group header styles
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: 16,
    marginBottom: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  groupBadge: {
    backgroundColor: '#7C3AED30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  categorizeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categorizeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  transactionItemGrouped: {
    marginBottom: 8,
    marginLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#7C3AED30',
  },
  transactionDatePrimary: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  // Subscription banner styles
  subscriptionBanner: {
    backgroundColor: '#7C3AED20',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7C3AED40',
  },
  subscriptionBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionBannerContent: {
    flex: 1,
  },
  subscriptionBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  subscriptionBannerSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  subscriptionBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionBannerDismiss: {
    padding: 4,
  },
});
