import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients, typography } from '../../lib/theme';

// ── Category emoji mapping ──────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  'Office Supplies': '\u{1F58A}\uFE0F',
  'Travel': '\u2708\uFE0F',
  'Meals': '\u{1F37D}\uFE0F',
  'Software': '\u{1F4BB}',
  'Marketing': '\u{1F4E3}',
  'Insurance': '\u{1F6E1}\uFE0F',
  'Utilities': '\u26A1',
  'Rent': '\u{1F3E0}',
  'Professional Services': '\u{1F454}',
  'Training': '\u{1F4DA}',
  'Equipment': '\u{1F527}',
  'Phone': '\u{1F4F1}',
  'Internet': '\u{1F310}',
  'Subscriptions': '\u{1F504}',
  'Bank Fees': '\u{1F3E6}',
  'Transport': '\u{1F697}',
  'Clothing': '\u{1F455}',
  'Entertainment': '\u{1F3AD}',
  'Health': '\u{1F48A}',
  'Gifts': '\u{1F381}',
  'Income': '\u{1F4B0}',
  'Other': '\u{1F4CB}',
};
const getCategoryEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '\u{1F4CB}';

// ── Types ───────────────────────────────────────────────────────────
type FilterTab = 'all' | 'uncategorised' | 'business' | 'personal' | 'income';

interface CategorizedTransaction {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name: string;
  tax_deductible: boolean;
  qualified: boolean;
  business_percent: number;
  transaction_type: string;
  explanation: string;
  _source: 'categorized';
}

interface UncategorizedTransaction {
  transaction_id: string;
  name: string;
  merchant_name?: string;
  amount: number;
  date: string;
  category?: string[];
  _source: 'uncategorized';
}

type UnifiedTransaction = CategorizedTransaction | UncategorizedTransaction;

const isCategorized = (t: UnifiedTransaction): t is CategorizedTransaction =>
  t._source === 'categorized';

// ── Helpers ─────────────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
  `\u00A3${Math.abs(amount).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
};

const getTransactionDate = (t: UnifiedTransaction): string =>
  isCategorized(t) ? t.transaction_date : t.date;

const getTransactionId = (t: UnifiedTransaction): string =>
  isCategorized(t) ? t.id : t.transaction_id;

const getMerchantName = (t: UnifiedTransaction): string =>
  isCategorized(t) ? t.merchant_name : (t.merchant_name || t.name || 'Unknown');

const getAmount = (t: UnifiedTransaction): number => t.amount;

// ── Filter tabs config ──────────────────────────────────────────────
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'uncategorised', label: 'Uncategorised' },
  { key: 'business', label: 'Business' },
  { key: 'personal', label: 'Personal' },
  { key: 'income', label: 'Income' },
];

// ── Component ───────────────────────────────────────────────────────
export default function TransactionsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [categorized, setCategorized] = useState<CategorizedTransaction[]>([]);
  const [uncategorized, setUncategorized] = useState<UncategorizedTransaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // ── Data loading ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch categorized + uncategorized in parallel
      const [catResult, uncatResult] = await Promise.all([
        supabase
          .from('categorized_transactions')
          .select(
            'id, merchant_name, amount, transaction_date, category_name, tax_deductible, qualified, business_percent, transaction_type, explanation'
          )
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false }),
        apiPost('/api/get_uncategorized_transactions', { user_id: user.id }).catch(() => ({
          transactions: [],
        })),
      ]);

      const catData: CategorizedTransaction[] = (catResult.data || []).map((t: any) => ({
        ...t,
        _source: 'categorized' as const,
      }));

      const uncatData: UncategorizedTransaction[] = (
        uncatResult.transactions || []
      ).map((t: any) => ({
        ...t,
        _source: 'uncategorized' as const,
      }));

      setCategorized(catData);
      setUncategorized(uncatData);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh on screen focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  // ── Filtering ───────────────────────────────────────────────────
  const getFilteredTransactions = (): UnifiedTransaction[] => {
    switch (activeFilter) {
      case 'uncategorised':
        return [...uncategorized].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

      case 'business':
        return categorized.filter(
          (t) => t.transaction_type === 'expense' && t.tax_deductible
        );

      case 'personal':
        return categorized.filter(
          (t) => t.transaction_type === 'personal' || t.transaction_type === 'paye_income'
        );

      case 'income':
        return categorized.filter(
          (t) => t.transaction_type === 'income' || t.amount < 0
        );

      case 'all':
      default: {
        const all: UnifiedTransaction[] = [...categorized, ...uncategorized];
        return all.sort(
          (a, b) =>
            new Date(getTransactionDate(b)).getTime() -
            new Date(getTransactionDate(a)).getTime()
        );
      }
    }
  };

  const filtered = getFilteredTransactions();

  // ── Filter pill renderer ────────────────────────────────────────
  const renderFilterPill = (filter: FilterTab, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        key={filter}
        activeOpacity={0.8}
        onPress={() => setActiveFilter(filter)}
      >
        {isActive ? (
          <LinearGradient
            colors={gradients.button as unknown as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.filterPillActive}
          >
            <Text style={styles.filterPillTextActive}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.filterPillInactive}>
            <Text style={styles.filterPillText}>{label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Uncategorised CTA card ──────────────────────────────────────
  const renderUncategorisedCTA = () => {
    if (activeFilter !== 'uncategorised' || uncategorized.length === 0) return null;
    return (
      <LinearGradient
        colors={gradients.hero as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ctaCard}
      >
        <Text style={styles.ctaTitle}>
          You have {uncategorized.length} transaction{uncategorized.length !== 1 ? 's' : ''} to
          categorise
        </Text>
        <Text style={styles.ctaSubtitle}>
          Swipe through them to organise your expenses
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SwipeCategorize')}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaButtonText}>Start categorising</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.ink} />
        </TouchableOpacity>
      </LinearGradient>
    );
  };

  // ── Transaction row ─────────────────────────────────────────────
  const renderTransaction = ({ item }: { item: UnifiedTransaction }) => {
    const isUncat = !isCategorized(item);
    const merchant = getMerchantName(item);
    const date = getTransactionDate(item);
    const amount = getAmount(item);
    const isIncome = isCategorized(item)
      ? item.transaction_type === 'income'
      : amount < 0;

    // Category + emoji
    const categoryName = isCategorized(item)
      ? item.category_name || 'Other'
      : 'Uncategorised';
    const emoji = isIncome
      ? getCategoryEmoji('Income')
      : getCategoryEmoji(isCategorized(item) ? categoryName : 'Other');

    // Tax deductible?
    const taxDeductible = isCategorized(item) && item.tax_deductible;

    const handlePress = () => {
      if (isCategorized(item)) {
        navigation.navigate('EditTransaction', {
          transactionId: item.id,
          transactionType: item.transaction_type,
        });
      } else {
        navigation.navigate('SwipeCategorize', {
          transactions: [item],
        });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.transactionRow, isUncat && styles.transactionRowUncat]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={styles.transactionIcon}>
          <Text style={styles.emojiIcon}>{emoji}</Text>
        </View>

        {/* Middle */}
        <View style={styles.transactionMiddle}>
          <Text style={styles.merchantName} numberOfLines={1}>
            {merchant}
          </Text>
          <Text style={styles.transactionMeta}>
            {formatDate(date)}
            {!isUncat ? ` \u00B7 ${categoryName}` : ''}
          </Text>
        </View>

        {/* Right */}
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              { color: isIncome ? colors.ember : colors.ink },
            ]}
          >
            {isIncome ? '+' : ''}
            {formatCurrency(amount)}
          </Text>

          {/* Tags */}
          {isUncat ? (
            <View style={styles.tagUncategorised}>
              <Text style={styles.tagUncategorisedText}>Tap to categorise</Text>
            </View>
          ) : taxDeductible ? (
            <View style={styles.tagTaxDeductible}>
              <Text style={styles.tagTaxDeductibleText}>Tax deductible</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  // ── Empty state ─────────────────────────────────────────────────
  const renderEmpty = () => {
    if (loading) return null;
    const messages: Record<FilterTab, string> = {
      all: 'No transactions yet',
      uncategorised: 'All caught up — nothing to categorise',
      business: 'No business expenses found',
      personal: 'No personal transactions found',
      income: 'No income transactions found',
    };
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={48} color={colors.inkMuted} />
        <Text style={styles.emptyText}>{messages[activeFilter]}</Text>
      </View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenLabel}>TRANSACTIONS</Text>
        <Text style={styles.sectionHeading}>your transactions.</Text>
      </View>

      {/* Filter pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => renderFilterPill(tab.key, tab.label))}
        </ScrollView>
      </View>

      {/* Uncategorised CTA */}
      {renderUncategorisedCTA()}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ember} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : filtered.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderTransaction}
          keyExtractor={(item) => getTransactionId(item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.parchment,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  screenLabel: {
    ...typography.screenLabel,
    color: colors.ember,
    marginBottom: spacing.xs,
  },
  sectionHeading: {
    ...typography.sectionHeading,
    color: colors.ink,
  },

  // Filter pills
  filterContainer: {
    paddingBottom: spacing.md,
  },
  filterScroll: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  filterPillActive: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  filterPillInactive: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  filterPillTextActive: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },

  // Uncategorised CTA card
  ctaCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: fonts.displayMed,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.lg,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },

  // Transaction list
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkFaint,
  },
  transactionRowUncat: {
    backgroundColor: colors.blush,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blush,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  emojiIcon: {
    fontSize: 18,
  },
  transactionMiddle: {
    flex: 1,
    marginRight: spacing.sm,
  },
  merchantName: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 2,
  },
  transactionMeta: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontFamily: fonts.displayMed,
  },

  // Tags
  tagTaxDeductible: {
    backgroundColor: colors.blush,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: 4,
  },
  tagTaxDeductibleText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.ember,
  },
  tagUncategorised: {
    backgroundColor: colors.inkFaint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: 4,
  },
  tagUncategorisedText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
