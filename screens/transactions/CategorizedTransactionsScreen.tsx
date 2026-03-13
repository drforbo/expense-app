import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
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
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name: string;
  business_percent: number;
  qualified: boolean;
  transaction_type: string;
}

export default function CategorizedTransactionsScreen({ route, navigation }: any) {
  const { filterType } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'expense' | 'income'>(filterType || 'all');

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [activeFilter])
  );

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('categorized_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('transaction_type', activeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `\u00A3${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderFilterTab = (filter: 'all' | 'expense' | 'income', label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        activeOpacity={0.8}
        onPress={() => setActiveFilter(filter)}
      >
        {isActive ? (
          <LinearGradient
            colors={gradients.primary as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.filterTabPill}
          >
            <Text style={styles.filterTabTextActive}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.filterTabOutlined}>
            <Text style={styles.filterTabText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isIncome = item.transaction_type === 'income';
    const businessAmount = Math.abs(item.amount) * (item.business_percent / 100);
    const taxSaving = !isIncome ? businessAmount * 0.2 : 0;

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => navigation.navigate('EditTransaction', {
          transactionId: item.id,
          transactionType: item.transaction_type,
        })}
        activeOpacity={0.7}
      >
        <View style={[styles.transactionIcon, { backgroundColor: isIncome ? colors.tagIncomeBg : colors.tagExpenseBg }]}>
          <Text style={styles.emojiIcon}>{getCategoryEmoji(isIncome ? 'Income' : (item.category_name || 'Other'))}</Text>
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.merchantName} numberOfLines={1}>{item.merchant_name}</Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>{formatDate(item.transaction_date)}</Text>
            <View style={[styles.categoryTag, { backgroundColor: isIncome ? colors.tagIncomeBg : colors.tagExpenseBg }]}>
              <Text style={[styles.categoryTagText, { color: isIncome ? colors.tagIncomeText : colors.tagExpenseText }]}>
                {item.category_name || 'Uncategorized'}
              </Text>
            </View>
            {item.business_percent < 100 && (
              <Text style={styles.businessPercent}>{item.business_percent}%</Text>
            )}
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: isIncome ? colors.positive : colors.negative }]}>
            {formatCurrency(businessAmount)}
          </Text>
          {!isIncome && taxSaving > 0 && (
            <Text style={styles.taxSaving}>saves {'\u00A3'}{taxSaving.toFixed(2)}</Text>
          )}
          {!isIncome && !item.qualified && (
            <View style={styles.needsEvidenceBadge}>
              <Ionicons name="document-text-outline" size={10} color={colors.tagExpenseText} />
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </TouchableOpacity>
    );
  };

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
        <Text style={styles.screenLabel}>CATEGORIZED</Text>
        <Text style={styles.headerTitle}>{'categorized\ntransactions.'}</Text>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {renderFilterTab('all', 'All')}
        {renderFilterTab('expense', 'Expenses')}
        {renderFilterTab('income', 'Income')}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color={colors.midGrey} />
          <Text style={styles.emptyText}>No {activeFilter !== 'all' ? activeFilter : ''} transactions</Text>
          <Text style={styles.emptySubtext}>
            {activeFilter === 'income'
              ? 'Income transactions will appear here once categorized'
              : 'Expense transactions will appear here once categorized'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  // Filter tabs
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterTabPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  filterTabOutlined: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterTabText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  filterTabTextActive: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  // Transaction list
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  emojiIcon: {
    fontSize: 18,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 3,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  transactionDate: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  categoryTagText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
  },
  businessPercent: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginRight: spacing.xs,
  },
  transactionAmount: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
  },
  taxSaving: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.positive,
    marginTop: 2,
  },
  needsEvidenceBadge: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.xs,
    padding: 2,
    marginTop: 4,
  },
});
