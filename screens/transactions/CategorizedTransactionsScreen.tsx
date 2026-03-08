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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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
    return `£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isIncome = item.transaction_type === 'income';
    const businessAmount = Math.abs(item.amount) * (item.business_percent / 100);

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => navigation.navigate('EditTransaction', {
          transactionId: item.id,
          transactionType: item.transaction_type,
        })}
      >
        <View style={[styles.transactionIcon, { backgroundColor: isIncome ? colors.tagGreenBg : colors.tagEmberBg }]}>
          <Ionicons
            name={isIncome ? 'trending-up' : 'receipt-outline'}
            size={20}
            color={isIncome ? colors.tagGreenText : colors.ember}
          />
        </View>

        <View style={styles.transactionDetails}>
          <Text style={styles.merchantName} numberOfLines={1}>{item.merchant_name}</Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>{formatDate(item.transaction_date)}</Text>
            <Text style={styles.categoryName}>{item.category_name || 'Uncategorized'}</Text>
            {item.business_percent < 100 && (
              <Text style={styles.businessPercent}>{item.business_percent}%</Text>
            )}
          </View>
        </View>

        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: isIncome ? colors.tagGreenText : colors.ember }]}>
            {formatCurrency(businessAmount)}
          </Text>
          {!isIncome && !item.qualified && (
            <View style={styles.needsEvidenceBadge}>
              <Ionicons name="document-text-outline" size={10} color={colors.ember} />
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categorized Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'expense' && styles.filterTabActive]}
          onPress={() => setActiveFilter('expense')}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeFilter === 'expense' ? colors.white : colors.midGrey}
          />
          <Text style={[styles.filterTabText, activeFilter === 'expense' && styles.filterTabTextActive]}>Expenses</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'income' && styles.filterTabActive, activeFilter === 'income' && styles.filterTabIncome]}
          onPress={() => setActiveFilter('income')}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={activeFilter === 'income' ? colors.white : colors.midGrey}
          />
          <Text style={[styles.filterTabText, activeFilter === 'income' && styles.filterTabTextActive]}>Income</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ember} />
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
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    ...shadows.sm,
  },
  filterTabActive: {
    backgroundColor: colors.ink,
  },
  filterTabIncome: {
    backgroundColor: colors.tagGreenText,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
  filterTabTextActive: {
    color: colors.white,
  },
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
    ...shadows.sm,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  categoryName: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.tagEmberText,
    backgroundColor: colors.tagEmberBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  businessPercent: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginRight: spacing.xs,
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: fonts.display,
  },
  needsEvidenceBadge: {
    backgroundColor: colors.tagEmberBg,
    borderRadius: borderRadius.sm,
    padding: 2,
    marginTop: 4,
  },
});
