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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

const CATEGORY_EMOJI: Record<string, string> = {
  'Office Supplies': '\u{1F58A}\uFE0F', 'Travel': '\u2708\uFE0F', 'Meals': '\u{1F37D}\uFE0F', 'Software': '\u{1F4BB}',
  'Marketing': '\u{1F4E3}', 'Insurance': '\u{1F6E1}\uFE0F', 'Utilities': '\u26A1', 'Rent': '\u{1F3E0}',
  'Professional Services': '\u{1F454}', 'Training': '\u{1F4DA}', 'Equipment': '\u{1F527}',
  'Phone': '\u{1F4F1}', 'Internet': '\u{1F310}', 'Subscriptions': '\u{1F504}', 'Bank Fees': '\u{1F3E6}',
  'Transport': '\u{1F697}', 'Clothing': '\u{1F455}', 'Entertainment': '\u{1F3AD}', 'Health': '\u{1F48A}',
  'Gifts': '\u{1F381}', 'Income': '\u{1F4B0}', 'Other': '\u{1F4CB}',
};
const getCategoryEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '\u{1F4CB}';

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
      console.log('Starting transaction load...');
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Fetch uncategorized transactions from server
      const startTime = Date.now();

      const data = await apiPost('/api/get_uncategorized_transactions', { user_id: user.id });

      const loadTime = Date.now() - startTime;
      console.log(`Server response time: ${loadTime}ms`);

      if (data.transactions && data.transactions.length > 0) {
        setTransactions(data.transactions);

        // Pre-generate Q1 for all transactions in the background
        preGenerateQuestions(data.transactions, user.id);

        // Detect subscriptions in the background
        detectSubscriptions(user.id);
      } else {
        setTransactions([]);
        setDetectedSubscriptions([]);
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Failed to load transactions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const detectSubscriptions = async (userId: string) => {
    try {
      const data = await apiPost('/api/detect_subscriptions', { user_id: userId });

      if (data.success && data.subscriptions?.length > 0) {
        console.log(`Detected ${data.subscriptions.length} subscriptions`);
        setDetectedSubscriptions(data.subscriptions);
        setSubscriptionBannerDismissed(false);
      } else {
        setDetectedSubscriptions([]);
      }
    } catch (error) {
      console.error('Error detecting subscriptions:', error);
    }
  };

  const preGenerateQuestions = async (txns: Transaction[], userId: string | undefined) => {
    if (isPreGenerating.current) {
      return;
    }

    if (lastTransactionCount.current === txns.length && Object.keys(preGeneratedQuestions).length > 0) {
      return;
    }

    try {
      isPreGenerating.current = true;
      lastTransactionCount.current = txns.length;

      let userProfile = {};
      if (userId) {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        userProfile = data || {};
      }

      const data = await apiPost('/api/bulk_generate_first_questions', {
        transactions: txns,
        userProfile
      });

      const questionsMap: Record<string, any> = {};
      data.results.forEach((result: any) => {
        if (result.questions) {
          questionsMap[result.transaction_id] = result.questions;
        }
      });

      setPreGeneratedQuestions(questionsMap);
    } catch (error) {
      console.error('Error pre-generating questions:', error);
    } finally {
      isPreGenerating.current = false;
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    navigation.navigate('TransactionCategorization', {
      transaction,
      allTransactions: [transaction],
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

  const normalizeMerchantName = (name: string): string => {
    return (name || 'Unknown')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

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

  const handleCategorizeGroup = (group: TransactionGroup) => {
    if (group.transactions.length === 1) {
      handleTransactionPress(group.transactions[0]);
    } else {
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
        <ActivityIndicator size="large" color={colors.gradientMid} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Gradient Header */}
        <LinearGradient
          colors={gradients.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          {/* Flare overlays */}
          <View style={styles.flareTopRight} />
          <View style={styles.flareBottomLeft} />

          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.screenLabel}>TRANSACTIONS</Text>
          <Text style={styles.headerTitle}>{'all your\ntransactions.'}</Text>
        </LinearGradient>

        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.positive} />
          </View>
          <Text style={styles.emptyStateTitle}>All done!</Text>
          <Text style={styles.emptyStateText}>
            All transactions have been categorized
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.primary as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={gradients.primary as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Flare overlays */}
        <View style={styles.flareTopRight} />
        <View style={styles.flareBottomLeft} />

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <Text style={styles.screenLabel}>TRANSACTIONS</Text>
        <Text style={styles.headerTitle}>{'all your\ntransactions.'}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statNumber}>{transactions.length}</Text>
          <Text style={styles.statLabel}>to categorize</Text>
        </View>
      </LinearGradient>

      {/* Subscription Detection Banner */}
      {detectedSubscriptions.length > 0 && !subscriptionBannerDismissed && (
        <TouchableOpacity
          style={styles.subscriptionBanner}
          onPress={() => navigation.navigate('SubscriptionReview', { subscriptions: detectedSubscriptions })}
          activeOpacity={0.8}
        >
          <View style={styles.subscriptionBannerIcon}>
            <Ionicons name="repeat" size={20} color={colors.tagExpenseText} />
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
            <Ionicons name="chevron-forward" size={20} color={colors.tagExpenseText} />
            <TouchableOpacity
              style={styles.subscriptionBannerDismiss}
              onPress={(e) => {
                e.stopPropagation();
                setSubscriptionBannerDismissed(true);
              }}
            >
              <Ionicons name="close" size={16} color={colors.midGrey} />
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
              activeOpacity={0.8}
              onPress={() => setSortBy(option)}
            >
              {sortBy === option ? (
                <LinearGradient
                  colors={gradients.primary as unknown as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sortOptionPill}
                >
                  <Text style={styles.sortOptionTextActive}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.sortOptionPill}>
                  <Text style={styles.sortOptionText}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {getGroupedTransactions().map((group, groupIndex) => (
          <View key={`group-${groupIndex}`}>
            {/* Group Header (only show when sorted by merchant) */}
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
                    <Ionicons name="arrow-forward" size={14} color={colors.tagExpenseText} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Transactions in this group */}
            {group.transactions.map((transaction) => {
              const isIncome = transaction.amount < 0;
              const category = transaction.category?.[0] || 'Other';
              const taxSaving = !isIncome ? Math.abs(transaction.amount) * 0.2 : 0;
              return (
                <TouchableOpacity
                  key={transaction.transaction_id}
                  style={[
                    styles.transactionItem,
                    sortBy === 'merchant' && styles.transactionItemGrouped
                  ]}
                  onPress={() => handleTransactionPress(transaction)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: isIncome ? colors.tagIncomeBg : colors.tagExpenseBg }
                  ]}>
                    <Text style={styles.emojiIcon}>{getCategoryEmoji(isIncome ? 'Income' : category)}</Text>
                  </View>

                  <View style={styles.transactionDetails}>
                    {sortBy !== 'merchant' && (
                      <Text style={styles.merchantName} numberOfLines={1}>
                        {transaction.merchant_name || transaction.name}
                      </Text>
                    )}
                    <View style={styles.transactionMeta}>
                      <Text style={styles.transactionDate}>
                        {formatDate(transaction.date)}
                      </Text>
                    </View>
                    {transaction.statement_filename && sortBy !== 'merchant' && (
                      <Text style={styles.statementSource}>
                        {transaction.statement_filename.replace(/\.pdf$/i, '')}
                      </Text>
                    )}
                  </View>

                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      { color: isIncome ? colors.positive : colors.negative }
                    ]}>
                      {isIncome ? '+' : ''}£{Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                    {!isIncome && taxSaving > 0 && (
                      <Text style={styles.taxSaving}>saves £{taxSaving.toFixed(2)}</Text>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  // Gradient Header
  gradientHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    overflow: 'hidden',
  },
  flareTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,224,128,0.15)',
  },
  flareBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.body,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.bodyBold,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
    lineHeight: 34,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  statNumber: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.white,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
  },
  // Sort toggle
  sortToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sortLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
    marginRight: 12,
    textTransform: 'uppercase',
  },
  sortToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sortOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  sortOptionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  sortOptionTextActive: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  // Transaction list
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  transactionItemGrouped: {
    marginLeft: spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiIcon: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 3,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transactionDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
  },
  statementSource: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  transactionAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  taxSaving: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.positive,
    marginTop: 2,
  },
  // Group header
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingTop: spacing.lg,
    marginBottom: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    marginRight: 8,
  },
  groupBadge: {
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  groupBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.tagExpenseText,
  },
  categorizeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  categorizeAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.tagExpenseText,
  },
  // Subscription banner
  subscriptionBanner: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionBannerContent: {
    flex: 1,
  },
  subscriptionBannerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  subscriptionBannerSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.midGrey,
  },
  subscriptionBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionBannerDismiss: {
    padding: 4,
  },
  // Loading / empty
  loadingText: {
    fontFamily: fonts.body,
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.midGrey,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.tagIncomeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyStateTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    marginBottom: 8,
  },
  emptyStateText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.midGrey,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  primaryButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primaryButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  transactionDatePrimary: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
  },
});
