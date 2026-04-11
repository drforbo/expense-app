import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useUpload } from '../../context/UploadContext';
import { colors, fonts, spacing, borderRadius, gradients, typography } from '../../lib/theme';
import { apiPost } from '../../lib/api';

// Category -> emoji mapping for recent transaction rows
const CATEGORY_EMOJI: Record<string, string> = {
  'Travel': '✈️',
  'Transport': '🚗',
  'Food & Drink': '🍔',
  'Food': '🍔',
  'Meals': '🍽️',
  'Office Supplies': '📎',
  'Office': '📎',
  'Software': '💻',
  'Technology': '💻',
  'Equipment': '🖥️',
  'Phone': '📱',
  'Internet': '🌐',
  'Utilities': '💡',
  'Rent': '🏠',
  'Insurance': '🛡️',
  'Marketing': '📣',
  'Advertising': '📣',
  'Professional Services': '👔',
  'Legal': '⚖️',
  'Accounting': '📊',
  'Training': '📚',
  'Education': '📚',
  'Entertainment': '🎭',
  'Clothing': '👕',
  'Health': '💊',
  'Subscriptions': '🔄',
  'Bank Fees': '🏦',
  'Gifts': '🎁',
  'Income': '💰',
  'Salary': '💰',
  'Freelance': '💼',
};

const getCategoryEmoji = (categoryName: string | undefined): string => {
  if (!categoryName) return '📄';
  for (const [key, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return '📄';
};

interface RecentTransaction {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name?: string;
  tax_deductible?: boolean;
  qualified?: boolean;
  business_percent?: number;
  transaction_type?: string;
}

export default function DashboardScreen({ navigation }: any) {
  const { uploadState, clearUpload } = useUpload();
  const [userName, setUserName] = useState('');
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [unqualifiedCount, setUnqualifiedCount] = useState(0);
  const [taxOwed, setTaxOwed] = useState<number | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showUploadComplete, setShowUploadComplete] = useState(false);
  const [hasTransactions, setHasTransactions] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [receivesGifts, setReceivesGifts] = useState(false);
  const [giftedItemsCount, setGiftedItemsCount] = useState(0);
  const [statementsProcessing, setStatementsProcessing] = useState(0);
  const [bankAccountCount, setBankAccountCount] = useState(0);
  const [uploadedMonthBanks, setUploadedMonthBanks] = useState(0);
  const [totalTransactionCount, setTotalTransactionCount] = useState(0);
  const [categorizedCount, setCategorizedCount] = useState(0);
  const [qualifiedCount, setQualifiedCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const slideAnim = useRef(new Animated.Value(-80)).current;

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (uploadState.status === 'complete' && uploadState.result) {
      setShowUploadComplete(true);
      loadData();
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
      const timer = setTimeout(hideUploadComplete, 5000);
      return () => clearTimeout(timer);
    }
  }, [uploadState.status]);

  const hideUploadComplete = () => {
    Animated.timing(slideAnim, { toValue: -80, duration: 300, useNativeDriver: true }).start(() => {
      setShowUploadComplete(false);
      clearUpload();
    });
  };

  const loadData = async () => {
    try {
      setLoadingCounts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Safe wrapper so one failed API call doesn't break the others
      const safeApiPost = async <T = any>(path: string, body: any, fallback: T): Promise<T> => {
        try { return await apiPost(path, body); } catch { return fallback; }
      };

      // Phase 1: Profile (fast) -- renders greeting, profile prompt, upload cards immediately
      const profilePromise = supabase.from('user_profiles')
        .select('first_name, profile_completed, receives_gifted_items, bank_account_count')
        .eq('user_id', user.id).single();

      profilePromise.then(({ data: profileData }) => {
        setUserName(profileData?.first_name || user.email?.split('@')[0] || 'there');
        setProfileCompleted(profileData?.profile_completed ?? false);
        setReceivesGifts(profileData?.receives_gifted_items ?? false);
        setBankAccountCount(profileData?.bank_account_count ?? 0);
        setProfileLoaded(true);
      });

      // Phase 2: Everything else in parallel
      const [
        ,  // profileData already handled above
        { data: giftedCountData },
        { data: unqualifiedData },
        { data: allCategorizedData },
        { data: recentData },
        { data: financialData },
        { data: giftedRrpData },
        batchData,
        statementsData,
        uncategorizedData,
      ] = await Promise.all([
        profilePromise,
        supabase.from('gifted_items').select('id').eq('user_id', user.id),
        supabase.from('categorized_transactions').select('id')
          .eq('user_id', user.id).eq('tax_deductible', true)
          .or('qualified.is.null,qualified.eq.false'),
        supabase.from('categorized_transactions')
          .select('id, tax_deductible, qualified')
          .eq('user_id', user.id),
        supabase.from('categorized_transactions')
          .select('id, merchant_name, amount, transaction_date, category_name, tax_deductible, qualified, business_percent, transaction_type')
          .eq('user_id', user.id).order('transaction_date', { ascending: false }).limit(5),
        supabase.from('categorized_transactions')
          .select('amount, tax_deductible, qualified, business_percent, category_id')
          .eq('user_id', user.id),
        supabase.from('gifted_items').select('rrp').eq('user_id', user.id),
        safeApiPost('/api/batch_status', { user_id: user.id }, {}),
        safeApiPost('/api/get_statements_by_month', { user_id: user.id }, []),
        safeApiPost('/api/get_uncategorized_transactions', { user_id: user.id }, { count: 0 }),
      ]);

      // Gifted items count
      setGiftedItemsCount(giftedCountData?.length || 0);

      // Statements
      setStatementsProcessing((batchData?.processing || 0) + (batchData?.pending || 0));
      if (Array.isArray(statementsData)) {
        const uniquePairs = new Set(
          statementsData.map((s: any) => `${s.statement_month}|${s.bank_name || 'unknown'}`)
        );
        setUploadedMonthBanks(uniquePairs.size);
      }

      // Transaction counts
      const uncatCount = uncategorizedData.count || 0;
      setUncategorizedCount(uncatCount);
      setUnqualifiedCount(unqualifiedData?.length || 0);

      const catCount = allCategorizedData?.length || 0;
      setCategorizedCount(catCount);
      setTotalTransactionCount(catCount + uncatCount);
      const qualCount = allCategorizedData?.filter(t => !t.tax_deductible || t.qualified)?.length || 0;
      setQualifiedCount(qualCount);

      // Recent transactions
      setRecentTransactions(recentData || []);

      // Financial summary
      setHasTransactions((financialData?.length || 0) > 0 || uncatCount > 0);

      let giftedTotal = 0;
      if (giftedRrpData) {
        giftedTotal = giftedRrpData.reduce((sum, g) => sum + (g.rrp || 0), 0);
      }

      if (financialData) {
        let income = 0;
        let qualifiedExpenses = 0;

        financialData.forEach(t => {
          if (t.amount < 0) {
            income += Math.abs(t.amount);
          } else if (t.tax_deductible && t.qualified) {
            qualifiedExpenses += t.amount * ((t.business_percent || 100) / 100);
          }
        });

        setTotalIncome(income + giftedTotal);
        setTotalExpenses(qualifiedExpenses);

        const taxableIncome = Math.max(0, income - 12570 - qualifiedExpenses);
        const estimated = taxableIncome > 0 ? taxableIncome * 0.2 : 0;
        setTaxOwed(estimated);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingCounts(false);
    }
  };

  const formatCurrency = (n: number) =>
    n >= 1000 ? `£${(n / 1000).toFixed(1)}k` : `£${n.toFixed(0)}`;

  const formatAmount = (amount: number) =>
    `£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  // Tax year progress (April 6 to April 5)
  const getTaxYearProgress = () => {
    const now = new Date();
    const year = now.getMonth() >= 3 && now.getDate() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(year, 3, 6); // April 6
    const end = new Date(year + 1, 3, 5); // April 5 next year
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  // Calculate next SA deadline: 31 Jan following the tax year end
  const getNextDueDate = () => {
    const now = new Date();
    const year = now.getMonth() >= 3 && now.getDate() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    // Tax year is year/year+1, filing deadline is 31 Jan year+2
    const deadline = new Date(year + 2, 0, 31);
    if (now > deadline) {
      // Already past this deadline, show next year's
      return new Date(year + 3, 0, 31);
    }
    return deadline;
  };

  const formatDueDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const taxYearPercent = getTaxYearProgress();
  const nextDueDate = getNextDueDate();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Upload progress banner */}
      {isUploading && (
        <LinearGradient
          colors={[...gradients.hero]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.uploadBanner}
        >
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.uploadBannerText}>
            {uploadState.status === 'uploading' ? 'Uploading...' : 'Reading your statement...'}
          </Text>
        </LinearGradient>
      )}

      {/* Statements processing banner */}
      {!isUploading && statementsProcessing > 0 && (
        <View style={styles.processingBanner}>
          <ActivityIndicator size="small" color={colors.ember} />
          <Text style={styles.processingBannerText}>
            Processing {statementsProcessing} statement{statementsProcessing > 1 ? 's' : ''}... We'll notify you when done
          </Text>
        </View>
      )}

      {/* Upload complete toast */}
      {showUploadComplete && uploadState.result && (
        <Animated.View style={[styles.toastBanner, { transform: [{ translateY: slideAnim }] }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.positive} />
          <Text style={styles.toastText}>
            {uploadState.result.transaction_count} transactions added
          </Text>
          <TouchableOpacity onPress={hideUploadComplete}>
            <Ionicons name="close" size={18} color={colors.inkMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: greeting left, avatar right */}
        <View style={styles.header}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.screenLabel}>DASHBOARD</Text>
            <Text style={styles.sectionHeading}>
              {!hasTransactions ? "Let's get your\ntaxes sorted." : `Hey ${userName}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[...gradients.hero]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Profile incomplete prompt (subtle) */}
        {profileLoaded && !profileCompleted && (
          <TouchableOpacity
            style={styles.profilePromptCard}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={styles.profilePromptRow}>
              <View style={styles.profilePromptIcon}>
                <Ionicons name="person-outline" size={18} color={colors.ember} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profilePromptTitle}>Complete your profile</Text>
                <Text style={styles.profilePromptSub}>
                  Add your employment details for an accurate tax estimate.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Hero gradient tax card */}
        <LinearGradient
          colors={[...gradients.hero]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Decorative orbs */}
          <View style={styles.orbLarge} />
          <View style={styles.orbSmall} />

          <Text style={styles.heroCardLabel}>TAX SET ASIDE</Text>
          <Text style={styles.heroCardValue}>
            {loadingCounts ? '...' : taxOwed !== null ? `£${taxOwed.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
          </Text>

          {/* Pills row */}
          <View style={styles.heroPillsRow}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{taxYearPercent}% of year done</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {taxOwed !== null && taxOwed > 0 ? 'on track' : 'no tax yet'}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.heroProgressBg}>
            <View style={[styles.heroProgressFill, { width: `${taxYearPercent}%` as any }]} />
          </View>

          {/* Next due date sub-card */}
          <View style={styles.heroDueDateCard}>
            <Text style={styles.heroDueDateLabel}>NEXT DUE DATE</Text>
            <Text style={styles.heroDueDateValue}>{formatDueDate(nextDueDate)}</Text>
          </View>
        </LinearGradient>

        {/* Stat cards row: Earned + Owed */}
        <View style={styles.statCardsRow}>
          <View style={styles.statCardEarned}>
            <Text style={styles.cardLabel}>EARNED</Text>
            <Text style={styles.statCardValue}>
              {loadingCounts ? '...' : formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.statCardOwed}>
            <Text style={styles.cardLabel}>OWED</Text>
            <Text style={[styles.statCardValue, { color: colors.ember }]}>
              {loadingCounts ? '...' : taxOwed !== null ? formatCurrency(taxOwed) : '—'}
            </Text>
          </View>
        </View>

        {/* Quick action pills */}
        <View style={styles.quickActionsRow}>
          <LinearGradient
            colors={[...gradients.button]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <TouchableOpacity
              style={styles.quickActionInner}
              onPress={() => navigation.getParent()?.navigate('Transactions')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickActionTextActive}>+ income</Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity
            style={styles.quickActionOutlined}
            onPress={() => navigation.getParent()?.navigate('Transactions')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionTextInactive}>expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionOutlined}
            onPress={() => navigation.getParent()?.navigate('Tax')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionTextInactive}>tax</Text>
          </TouchableOpacity>
        </View>

        {/* Next actions section */}
        <View style={styles.sectionRow}>
          <Text style={styles.screenLabel}>NEXT STEPS</Text>
        </View>

        {/* CTA: No transactions -- upload prompt */}
        {profileLoaded && !hasTransactions && (
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.getParent()?.navigate('Upload')}
            activeOpacity={0.8}
          >
            <View style={styles.ctaRow}>
              <View style={styles.ctaIconWrap}>
                <Text style={{ fontSize: 20 }}>📄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Upload a statement</Text>
                <Text style={styles.ctaSub}>
                  Get started by uploading a bank statement to track your expenses.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* CTA: Uncategorised transactions */}
        {hasTransactions && uncategorizedCount > 0 && (
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.navigate('SwipeCategorize', { transactions: [] })}
            activeOpacity={0.8}
          >
            <View style={styles.ctaRow}>
              <View style={styles.ctaIconWrap}>
                <Text style={{ fontSize: 20 }}>🏷️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>
                  You have {uncategorizedCount} to categorise
                </Text>
                <Text style={styles.ctaSub}>
                  Swipe through your transactions to categorise them.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* CTA: Needs evidence */}
        {hasTransactions && unqualifiedCount > 0 && (
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.navigate('QualifyTransactionList')}
            activeOpacity={0.8}
          >
            <View style={styles.ctaRow}>
              <View style={styles.ctaIconWrap}>
                <Text style={{ fontSize: 20 }}>🧾</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>
                  {unqualifiedCount} expense{unqualifiedCount !== 1 ? 's' : ''} need a receipt
                </Text>
                <Text style={styles.ctaSub}>
                  Add receipts to qualify your deductions.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Gifted items card */}
        {receivesGifts && (
          <TouchableOpacity
            style={styles.ctaCard}
            onPress={() => navigation.navigate('GiftedTracker')}
            activeOpacity={0.8}
          >
            <View style={styles.ctaRow}>
              <View style={styles.ctaIconWrap}>
                <Text style={{ fontSize: 20 }}>🎁</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>Log gifted items</Text>
                <Text style={styles.ctaSub}>
                  {giftedItemsCount > 0
                    ? `${giftedItemsCount} item${giftedItemsCount !== 1 ? 's' : ''} logged`
                    : 'PR packages count as income'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* All good state */}
        {hasTransactions && uncategorizedCount === 0 && unqualifiedCount === 0 && !receivesGifts && (
          <View style={styles.ctaCard}>
            <View style={styles.ctaRow}>
              <View style={styles.ctaIconWrap}>
                <Text style={{ fontSize: 20 }}>✅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>You're all caught up</Text>
                <Text style={styles.ctaSub}>
                  No actions needed right now.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Recent transactions section */}
        {recentTransactions.length > 0 && (
          <>
            <View style={styles.sectionRowSpaced}>
              <Text style={styles.sectionHeading}>Recent</Text>
              <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Transactions')}>
                <Text style={styles.sectionLink}>See all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.recentCard}>
              {recentTransactions.map((item, index) => {
                const isIncome = item.transaction_type === 'income' || item.amount < 0;
                const isExpense = !isIncome;
                const taxSaving = isExpense && item.tax_deductible && item.qualified
                  ? (Math.abs(item.amount) * ((item.business_percent || 100) / 100) * 0.2)
                  : 0;
                const isLast = index === recentTransactions.length - 1;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.transactionRow,
                      isLast && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => navigation.navigate('EditTransaction', {
                      transactionId: item.id,
                      transactionType: item.transaction_type || (isIncome ? 'income' : 'expense'),
                    })}
                    activeOpacity={0.7}
                  >
                    {/* Emoji icon */}
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: isExpense ? colors.blush : colors.parchment },
                    ]}>
                      <Text style={{ fontSize: 15 }}>{getCategoryEmoji(item.category_name)}</Text>
                    </View>

                    {/* Details */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transactionName} numberOfLines={1}>
                        {item.merchant_name}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                        {item.category_name && (
                          <View style={styles.categoryTag}>
                            <Text style={styles.categoryTagText}>{item.category_name}</Text>
                          </View>
                        )}
                        <Text style={styles.transactionDate}>{formatDate(item.transaction_date)}</Text>
                      </View>
                    </View>

                    {/* Amount */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[
                        styles.transactionAmount,
                        { color: isIncome ? colors.ember : colors.ink },
                      ]}>
                        {isIncome ? '+' : '-'}{formatAmount(item.amount)}
                      </Text>
                      {isExpense && taxSaving > 0 && (
                        <Text style={styles.taxSaving}>
                          saves £{taxSaving.toFixed(2)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* View all transactions link */}
            <TouchableOpacity
              style={styles.allTransactionsLink}
              onPress={() => navigation.getParent()?.navigate('Transactions')}
            >
              <Text style={styles.allTransactionsText}>View all transactions</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.ember} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    gap: 10,
  },
  uploadBannerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.white,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blush,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    gap: 10,
  },
  processingBannerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ember,
    flex: 1,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    gap: 10,
  },
  toastText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
    marginTop: spacing.lg,
  },
  screenLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.5,
    color: colors.ember,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 28,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avatarText: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    color: colors.white,
  },

  // Hero gradient card
  heroCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  orbLarge: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: colors.white,
    opacity: 0.15,
  },
  orbSmall: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: colors.white,
    opacity: 0.15,
  },
  heroCardLabel: {
    ...typography.cardLabel,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  heroCardValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 52,
    color: colors.white,
    letterSpacing: -2,
    lineHeight: 58,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  heroPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  heroProgressBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999,
    marginTop: 12,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 3,
    backgroundColor: colors.white,
    borderRadius: 9999,
  },
  heroDueDateCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  heroDueDateLabel: {
    ...typography.cardLabel,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  heroDueDateValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.white,
  },

  // Stat cards
  statCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  statCardEarned: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  statCardOwed: {
    flex: 1,
    backgroundColor: colors.blush,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  cardLabel: {
    ...typography.cardLabel,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  statCardValue: {
    fontFamily: fonts.displaySemi,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.5,
  },

  // Quick action pills
  quickActionsRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: spacing.xxl,
  },
  quickActionGradient: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  quickActionInner: {
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  quickActionTextActive: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  quickActionOutlined: {
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
    borderRadius: 9999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  quickActionTextInactive: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.ink,
  },

  // Section labels
  sectionRow: {
    marginBottom: spacing.md,
  },
  sectionRowSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ember,
  },

  // CTA / next-action cards
  ctaCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ctaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  ctaSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },

  // Recent transactions card
  recentCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },

  // Transaction rows
  transactionRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkFaint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionIcon: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  transactionName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 2,
  },
  categoryTag: {
    backgroundColor: colors.blush,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.ember,
  },
  transactionDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.inkMuted,
  },
  transactionAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  taxSaving: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.positive,
    marginTop: 1,
  },

  // All transactions link
  allTransactionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  allTransactionsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ember,
  },

  // Profile prompt (subtle)
  profilePromptCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profilePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blush,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profilePromptTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  profilePromptSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkMuted,
    lineHeight: 18,
  },
});
