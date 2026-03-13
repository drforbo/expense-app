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
          <Text style={styles.screenLabel}>QUALIFY</Text>
          <Text style={styles.headerTitle}>{'transactions\nto qualify.'}</Text>
        </LinearGradient>

        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="shield-checkmark" size={64} color={colors.positive} />
          </View>
          <Text style={styles.emptyStateTitle}>All done!</Text>
          <Text style={styles.emptyStateText}>
            All tax-deductible transactions have evidence
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
        <Text style={styles.screenLabel}>QUALIFY</Text>
        <Text style={styles.headerTitle}>{'transactions\nto qualify.'}</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Text style={styles.statNumber}>{transactions.length}</Text>
          <Text style={styles.statLabel}>to qualify</Text>
        </View>
      </LinearGradient>

      {/* Transaction List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        {transactions.map((transaction) => {
          const taxSaving = Math.abs(transaction.amount) * (transaction.business_percent / 100) * 0.2;
          return (
            <TouchableOpacity
              key={transaction.id}
              style={styles.transactionItem}
              onPress={() => handleTransactionPress(transaction)}
              activeOpacity={0.7}
            >
              <View style={[styles.transactionIcon, { backgroundColor: colors.tagExpenseBg }]}>
                <Text style={styles.emojiIcon}>{getCategoryEmoji(transaction.category_name || 'Other')}</Text>
              </View>

              <View style={styles.transactionDetails}>
                <Text style={styles.merchantName} numberOfLines={1}>
                  {transaction.merchant_name}
                </Text>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionDate}>
                    {formatDate(transaction.transaction_date)}
                  </Text>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>
                      {transaction.category_name}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>
                  {'\u00A3'}{Math.abs(transaction.amount).toFixed(2)}
                </Text>
                {taxSaving > 0 && (
                  <Text style={styles.taxSaving}>saves {'\u00A3'}{taxSaving.toFixed(2)}</Text>
                )}
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          );
        })}
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
  // Transaction list
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
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
  categoryTag: {
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  categoryTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.tagExpenseText,
  },
  transactionRight: {
    alignItems: 'flex-end',
    marginRight: spacing.sm,
  },
  transactionAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.negative,
  },
  taxSaving: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.positive,
    marginTop: 2,
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
});
