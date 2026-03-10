import React, { useState, useCallback } from 'react';
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
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

interface Transaction {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name: string;
  business_percent: number;
  explanation: string;
}

export default function QualifyTransactionListScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload transactions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUnqualifiedTransactions();
    }, [])
  );

  const loadUnqualifiedTransactions = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setLoading(false);
        return;
      }

      // Fetch tax-deductible transactions that haven't been qualified yet
      const { data, error } = await supabase
        .from('categorized_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_deductible', true)
        .or('qualified.is.null,qualified.eq.false')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        Alert.alert('Error', 'Failed to load transactions');
        return;
      }

      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error in loadUnqualifiedTransactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionPress = (transaction: Transaction) => {
    navigation.navigate('QualifyTransactions', { transaction });
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
        <ActivityIndicator size="large" color={colors.ember} />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Qualify Transactions</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="shield-checkmark" size={64} color={colors.tagGreenText} />
          </View>
          <Text style={styles.emptyStateTitle}>All done!</Text>
          <Text style={styles.emptyStateText}>
            All tax-deductible transactions have evidence
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
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Qualify Transactions</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{transactions.length}</Text>
          <Text style={styles.statLabel}>to qualify</Text>
        </View>
      </View>

      {/* Transaction List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {transactions.map((transaction) => (
          <TouchableOpacity
            key={transaction.id}
            style={styles.transactionItem}
            onPress={() => handleTransactionPress(transaction)}
            activeOpacity={0.7}
          >
            <View style={styles.transactionIcon}>
              <Ionicons name="receipt-outline" size={24} color={colors.tagGreenText} />
            </View>

            <View style={styles.transactionDetails}>
              <Text style={styles.merchantName}>
                {transaction.merchant_name}
              </Text>
              <Text style={styles.transactionDate}>
                {formatDate(transaction.transaction_date)}
              </Text>
              <Text style={styles.categoryName}>
                {transaction.category_name}
              </Text>
            </View>

            <View style={styles.transactionRight}>
              <Text style={styles.transactionAmount}>
                £{Math.abs(transaction.amount).toFixed(2)}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  statsBar: {
    backgroundColor: colors.dark,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.volt,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mist,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  transactionItem: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.sm,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.tagGreenBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  merchantName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 4,
  },
  transactionDate: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
  },
  categoryName: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.tagGreenText,
    marginTop: 2,
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
  },
  loadingText: {
    fontFamily: fonts.body,
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.midGrey,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tagGreenBg,
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
  button: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.background,
  },
});
