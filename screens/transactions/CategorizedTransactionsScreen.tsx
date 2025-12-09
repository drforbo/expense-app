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
        <View style={[styles.transactionIcon, { backgroundColor: isIncome ? '#10B98120' : '#7C3AED20' }]}>
          <Ionicons
            name={isIncome ? 'trending-up' : 'receipt-outline'}
            size={20}
            color={isIncome ? '#10B981' : '#7C3AED'}
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
          <Text style={[styles.transactionAmount, { color: isIncome ? '#10B981' : '#7C3AED' }]}>
            {formatCurrency(businessAmount)}
          </Text>
          {!isIncome && !item.qualified && (
            <View style={styles.needsEvidenceBadge}>
              <Ionicons name="document-text-outline" size={10} color="#F59E0B" />
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color="#6B7280" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
            color={activeFilter === 'expense' ? '#fff' : '#9CA3AF'}
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
            color={activeFilter === 'income' ? '#fff' : '#9CA3AF'}
          />
          <Text style={[styles.filterTabText, activeFilter === 'income' && styles.filterTabTextActive]}>Income</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#6B7280" />
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
    backgroundColor: '#2E1A47',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1F1333',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterTabActive: {
    backgroundColor: '#7C3AED',
  },
  filterTabIncome: {
    backgroundColor: '#10B981',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryName: {
    fontSize: 11,
    color: '#7C3AED',
    backgroundColor: '#7C3AED20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  businessPercent: {
    fontSize: 11,
    color: '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  needsEvidenceBadge: {
    backgroundColor: '#F59E0B20',
    borderRadius: 4,
    padding: 2,
    marginTop: 4,
  },
});
