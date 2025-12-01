import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

interface Transaction {
  transaction_id: string;
  name: string;
  merchant_name?: string;
  amount: number;
  date: string;
  category?: string[];
}

interface CategorizedTransaction {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name: string;
  business_percent: number;
  explanation: string;
  tax_deductible: boolean;
  plaid_transaction_id: string;
  notes?: string;
  qualified?: boolean;
  receipt_image_url?: string;
  business_use_explanation?: string;
  content_link?: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

export default function TransactionListScreen({ route, navigation }: any) {
  const { accessToken } = route.params || {};

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'uncategorized' | 'categorized'>('uncategorized');
  const [categorizedTransactions, setCategorizedTransactions] = useState<CategorizedTransaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  // Reload transactions when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  // Load categorized transactions when tab changes
  useEffect(() => {
    if (activeTab === 'categorized') {
      loadCategorizedTransactions();
    }
  }, [activeTab]);

  const loadTransactions = async () => {
    try {
      console.log('🔄 Starting transaction load...');
      setLoading(true);

      // Get current user for filtering on server side
      console.log('👤 Getting user...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('✅ User ID:', user?.id);

      // Fetch transactions from server (filtering happens server-side now)
      console.log('📡 Fetching from:', `${API_URL}/api/sync_transactions`);
      const startTime = Date.now();

      const response = await fetch(`${API_URL}/api/sync_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: accessToken,
          user_id: user?.id
        }),
      });

      const loadTime = Date.now() - startTime;
      console.log(`⏱️  Server response time: ${loadTime}ms`);

      const data = await response.json();
      console.log('📊 Received transactions:', data.transactions?.length || 0);

      if (data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions);

        // Pre-generate Q1 for all transactions in the background
        preGenerateQuestions(data.transactions, user?.id);
      } else {
        console.log('⚠️  No transactions returned');
        Alert.alert('No transactions', 'No transactions found in the last 30 days');
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
    try {
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
    }
  };

  const loadCategorizedTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const { data, error } = await supabase
        .from('categorized_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error loading categorized transactions:', error);
        Alert.alert('Error', 'Failed to load categorized transactions');
        return;
      }

      setCategorizedTransactions(data || []);
    } catch (error: any) {
      console.error('Error in loadCategorizedTransactions:', error);
      Alert.alert('Error', 'Failed to load categorized transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    navigation.navigate('TransactionCategorization', {
      accessToken,
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
          <Text style={styles.emptyStateTitle}>You're at bopp zero!</Text>
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'uncategorized' && styles.activeTab]}
          onPress={() => setActiveTab('uncategorized')}
        >
          <Text style={[styles.tabText, activeTab === 'uncategorized' && styles.activeTabText]}>
            Uncategorized
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categorized' && styles.activeTab]}
          onPress={() => setActiveTab('categorized')}
        >
          <Text style={[styles.tabText, activeTab === 'categorized' && styles.activeTabText]}>
            Categorized
          </Text>
        </TouchableOpacity>
      </View>

      {/* UNCATEGORIZED TAB */}
      {activeTab === 'uncategorized' && (
        <>
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
          const isIncome = transaction.amount < 0; // Negative = income in Plaid
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
        </>
      )}

      {/* CATEGORIZED TAB */}
      {activeTab === 'categorized' && (
        <>
          {/* Stats Bar - show count of transactions needing evidence */}
          {(() => {
            const needsEvidence = categorizedTransactions.filter(
              txn => txn.tax_deductible && !txn.qualified
            ).length;
            const qualified = categorizedTransactions.filter(txn => txn.qualified).length;

            return needsEvidence > 0 || qualified > 0 ? (
              <View style={styles.statsBar}>
                {needsEvidence > 0 && (
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#FF6B6B' }]}>{needsEvidence}</Text>
                    <Text style={styles.statLabel}>need evidence</Text>
                  </View>
                )}
                {qualified > 0 && (
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#10B981' }]}>{qualified}</Text>
                    <Text style={styles.statLabel}>qualified</Text>
                  </View>
                )}
              </View>
            ) : null;
          })()}

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
          {categorizedTransactions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#64748B" />
              <Text style={styles.emptyStateText}>No categorized transactions yet</Text>
            </View>
          ) : (
            categorizedTransactions.map((txn) => {
              const isTaxDeductible = txn.tax_deductible;
              const isQualified = txn.qualified === true;
              const hasReceipt = !!txn.receipt_image_url;
              return (
                <View key={txn.id} style={styles.categorizedTransactionItem}>
                  <View style={styles.categorizedHeader}>
                    <View style={styles.categorizedLeft}>
                      <View style={[
                        styles.transactionIcon,
                        { backgroundColor: isTaxDeductible ? '#10B98120' : '#64748B20' }
                      ]}>
                        <Ionicons
                          name={isTaxDeductible ? "checkmark-circle" : "close-circle"}
                          size={24}
                          color={isTaxDeductible ? '#10B981' : '#64748B'}
                        />
                      </View>
                      <View style={styles.categorizedDetails}>
                        <View style={styles.merchantRow}>
                          <Text style={styles.merchantName}>{txn.merchant_name}</Text>
                          {isQualified && (
                            <View style={styles.qualifiedBadge}>
                              <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                            </View>
                          )}
                          {hasReceipt && !isQualified && (
                            <Ionicons name="receipt" size={14} color="#9CA3AF" />
                          )}
                        </View>
                        <Text style={styles.transactionDate}>
                          {formatDate(txn.transaction_date)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.transactionAmount}>
                      £{Math.abs(txn.amount).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.categorizedInfo}>
                    <View style={styles.infoRow}>
                      <Ionicons name="pricetag-outline" size={16} color="#9CA3AF" />
                      <Text style={styles.infoText}>{txn.category_name}</Text>
                    </View>
                    {txn.business_percent > 0 && (
                      <View style={styles.infoRow}>
                        <Ionicons name="briefcase-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.infoText}>{txn.business_percent}% business use</Text>
                      </View>
                    )}
                    {txn.explanation && (
                      <View style={styles.infoRow}>
                        <Ionicons name="information-circle-outline" size={16} color="#9CA3AF" />
                        <Text style={styles.infoText}>{txn.explanation}</Text>
                      </View>
                    )}
                    {isTaxDeductible && (
                      <View style={[styles.infoRow, styles.taxBadge]}>
                        <Ionicons name="checkmark" size={16} color="#10B981" />
                        <Text style={styles.taxBadgeText}>Tax Deductible</Text>
                      </View>
                    )}

                    {/* Add Evidence Button */}
                    {!isQualified && isTaxDeductible && (
                      <TouchableOpacity
                        style={styles.addEvidenceButton}
                        onPress={() => navigation.navigate('AddEvidence', { transaction: txn })}
                      >
                        <Ionicons name="camera-outline" size={16} color="#7C3AED" />
                        <Text style={styles.addEvidenceText}>
                          {hasReceipt ? 'Complete Evidence' : 'Add Evidence'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        </>
      )}

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
    color: '#FF6B6B',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#fff',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  categorizedTransactionItem: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categorizedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categorizedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categorizedDetails: {
    flex: 1,
  },
  categorizedInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  taxBadge: {
    backgroundColor: '#10B98120',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  taxBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qualifiedBadge: {
    backgroundColor: '#10B98120',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED20',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  addEvidenceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
});
