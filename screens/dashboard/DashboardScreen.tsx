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
    const isAfterApril6 = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6);
    const year = isAfterApril6 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(year, 3, 6); // April 6
    const end = new Date(year + 1, 3, 5); // April 5 next year
    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const taxYearPercent = getTaxYearProgress();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Upload progress banner */}
      {isUploading && (
        <LinearGradient
          colors={[...gradients.hero]}
          locations={[...gradients.heroLocations]}
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
          <ActivityIndicator size="small" color={colors.primary} />
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
            <Ionicons name="close" size={18} color={colors.onSurfaceMuted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: BOPP logo + gradient avatar */}
        <View style={styles.header}>
          <Text style={styles.logoText}>bopp</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[...gradients.hero]}
              locations={[...gradients.heroLocations]}
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


        {/* Hero gradient card — clean liquid gradient, no orbs */}
        <LinearGradient
          colors={[...gradients.hero]}
          locations={[...gradients.heroLocations]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>TAX SET ASIDE</Text>
          <Text style={styles.heroNumber}>
            {loadingCounts ? '...' : taxOwed !== null ? `£${taxOwed.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
          </Text>

          {taxOwed !== null && taxOwed > 0 && (
            <Text style={styles.heroStatusLine}>✓  On track for Jan payments</Text>
          )}

          <View style={styles.heroPills}>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>{taxYearPercent}% of tax year</Text>
            </View>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {taxOwed !== null && taxOwed > 0 ? 'on track' : 'no tax yet'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.heroPillAction}
              onPress={() => navigation.navigate('Tax')}
              activeOpacity={0.8}
            >
              <Text style={styles.heroPillActionText}>Optimise →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.heroProgressBg}>
            <View style={[styles.heroProgressFill, { width: `${taxYearPercent}%` as any }]} />
          </View>
        </LinearGradient>

        {/* Stat cards row: Earned + Owed */}
        <View style={styles.statRow}>
          {/* Earned card */}
          <View style={styles.statCard}>
            <LinearGradient
              colors={[...gradients.statEarned]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statAccent}
            />
            <View style={styles.statContent}>
              <View style={styles.statIconWrap}>
                <Text style={{ fontSize: 16 }}>💰</Text>
              </View>
              <Text style={styles.statLabel}>EARNED</Text>
              <Text style={styles.statNum}>
                {loadingCounts ? '...' : formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>

          {/* Owed card */}
          <View style={styles.statCard}>
            <LinearGradient
              colors={[...gradients.statOwed]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statAccent}
            />
            <View style={styles.statContent}>
              <View style={styles.statIconWrap}>
                <Text style={{ fontSize: 16 }}>📋</Text>
              </View>
              <Text style={styles.statLabel}>TOTAL OWED</Text>
              <Text style={styles.statNum}>
                {loadingCounts ? '...' : taxOwed !== null ? formatCurrency(taxOwed) : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Next steps section — prioritized: first card is a hero */}
        {(() => {
          type NextStep = {
            key: string;
            emoji: string;
            title: string;
            sub: string;
            cta: string;
            onPress: () => void;
          };

          const nextSteps: NextStep[] = [];

          if (profileLoaded && !profileCompleted) {
            nextSteps.push({
              key: 'profile',
              emoji: '👤',
              title: 'Finish setting up your profile',
              sub: 'Two quick questions about your work setup so we can give you an accurate tax estimate.',
              cta: 'Complete profile',
              onPress: () => navigation.navigate('Profile'),
            });
          }

          if (hasTransactions && uncategorizedCount > 0) {
            nextSteps.push({
              key: 'categorise',
              emoji: '🏷️',
              title: `Categorise ${uncategorizedCount} transaction${uncategorizedCount !== 1 ? 's' : ''}`,
              sub: 'Swipe through your transactions to sort them into the right categories.',
              cta: 'Start categorising',
              onPress: () => navigation.navigate('SwipeCategorize', { transactions: [] }),
            });
          }

          if (hasTransactions && unqualifiedCount > 0) {
            nextSteps.push({
              key: 'receipts',
              emoji: '🧾',
              title: `Add receipts to ${unqualifiedCount} expense${unqualifiedCount !== 1 ? 's' : ''}`,
              sub: 'Attach evidence so HMRC will accept these as valid deductions.',
              cta: 'Add receipts',
              onPress: () => navigation.navigate('QualifyTransactionList'),
            });
          }

          nextSteps.push({
            key: 'upload',
            emoji: '📄',
            title: hasTransactions ? 'Upload another statement' : 'Upload your first bank statement',
            sub: hasTransactions
              ? 'Keep your records up to date by adding the latest statement.'
              : "We'll read it and pull out every transaction automatically.",
            cta: hasTransactions ? 'Add statement' : 'Get started',
            onPress: () => navigation.navigate('Upload'),
          });

          if (receivesGifts) {
            nextSteps.push({
              key: 'gifted',
              emoji: '🎁',
              title: 'Log gifted items',
              sub: giftedItemsCount > 0
                ? `${giftedItemsCount} item${giftedItemsCount !== 1 ? 's' : ''} logged. PR packages count as taxable income.`
                : 'PR packages count as taxable income — log anything you received.',
              cta: 'Log items',
              onPress: () => navigation.navigate('GiftedTracker'),
            });
          }

          const [primary, ...rest] = nextSteps;
          return (
            <>
              <View style={styles.nextStepsHeader}>
                <Text style={styles.nextStepsTitle}>What's next</Text>
                <View style={styles.nextStepsCountChip}>
                  <Text style={styles.nextStepsCountText}>
                    {nextSteps.length} to do
                  </Text>
                </View>
              </View>

              {primary && (
                <TouchableOpacity
                  style={styles.primaryStepCard}
                  onPress={primary.onPress}
                  activeOpacity={0.9}
                >
                  <View style={styles.primaryStepHeader}>
                    <View style={styles.primaryStepIconWrap}>
                      <Text style={{ fontSize: 24 }}>{primary.emoji}</Text>
                    </View>
                    <Text style={styles.primaryStepEyebrow}>DO THIS NEXT</Text>
                  </View>
                  <Text style={styles.primaryStepTitle}>{primary.title}</Text>
                  <Text style={styles.primaryStepSub}>{primary.sub}</Text>
                  <View style={styles.primaryStepCtaButton}>
                    <Text style={styles.primaryStepCtaText}>{primary.cta} →</Text>
                  </View>
                </TouchableOpacity>
              )}

              {rest.map((step) => (
                <TouchableOpacity
                  key={step.key}
                  style={styles.ctaCard}
                  onPress={step.onPress}
                  activeOpacity={0.8}
                >
                  <View style={styles.ctaRow}>
                    <View style={styles.ctaIconWrap}>
                      <Text style={{ fontSize: 20 }}>{step.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ctaTitle}>{step.title}</Text>
                      <Text style={styles.ctaSub}>{step.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceMuted} />
                  </View>
                </TouchableOpacity>
              ))}
            </>
          );
        })()}

        {/* Timeline section */}
        {recentTransactions.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.sectionLink}>View Archive</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.map((item) => {
              const isIncome = item.transaction_type === 'income' || item.amount < 0;
              const isExpense = !isIncome;
              const taxSaving = isExpense && item.tax_deductible && item.qualified
                ? (Math.abs(item.amount) * ((item.business_percent || 100) / 100) * 0.2)
                : 0;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.tlItem}
                  onPress={() => navigation.navigate('EditTransaction', {
                    transactionId: item.id,
                    transactionType: item.transaction_type || (isIncome ? 'income' : 'expense'),
                  })}
                  activeOpacity={0.7}
                >
                  <View style={styles.tlIcon}>
                    <Text style={{ fontSize: 20 }}>{getCategoryEmoji(item.category_name)}</Text>
                  </View>

                  <View style={styles.tlMid}>
                    <Text style={styles.tlName} numberOfLines={1}>{item.merchant_name}</Text>
                    <Text style={styles.tlSub}>
                      {item.category_name || 'Uncategorised'} · {formatDate(item.transaction_date)}
                    </Text>
                  </View>

                  <View style={styles.tlRight}>
                    <Text style={[styles.tlAmt, { color: isIncome ? colors.primary : colors.onSurface }]}>
                      {isIncome ? '+' : '-'}{formatAmount(item.amount)}
                    </Text>
                    {isExpense && taxSaving > 0 && (
                      <Text style={styles.tlSaving}>saves £{taxSaving.toFixed(2)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Banners
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
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
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    gap: 10,
  },
  processingBannerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.primary,
    flex: 1,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 10,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
  },
  toastText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.onSurface,
  },

  scroll: { flex: 1 },
  content: { paddingBottom: 120 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  logoText: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
  },
  avatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.white,
  },

  // Profile prompt
  profilePromptCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  profilePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profilePromptTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 3,
  },
  profilePromptSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
    lineHeight: 19,
  },

  // Hero gradient card
  heroCard: {
    borderRadius: borderRadius.lg,
    paddingTop: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: 20,
    overflow: 'hidden',
    minHeight: 220,
  },
  heroEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    color: 'rgba(255,255,255,0.70)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroNumber: {
    fontFamily: fonts.display,
    fontSize: 52,
    color: colors.white,
    letterSpacing: -1,
    lineHeight: 52,
    marginBottom: 10,
  },
  heroStatusLine: {
    fontFamily: fonts.bodyMed,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 22,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  heroPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  heroPillAction: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: borderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    marginLeft: 'auto',
  },
  heroPillActionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  heroProgressBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 2,
    marginTop: 16,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: 3,
    backgroundColor: colors.white,
    borderRadius: 2,
  },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: spacing.md,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  statAccent: {
    height: 3,
  },
  statContent: {
    padding: 18,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurfaceMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statNum: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },

  // Section labels
  sectionRow: {
    paddingHorizontal: 20,
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: spacing.xs,
    paddingBottom: 14,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.secondary,
  },

  // "What's next" header + primary step hero card
  nextStepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: spacing.xs,
    marginBottom: 14,
  },
  nextStepsTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  nextStepsCountChip: {
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  nextStepsCountText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.onSurface,
    letterSpacing: 0.2,
  },
  primaryStepCard: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: 14,
  },
  primaryStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  primaryStepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(254,136,92,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryStepEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  primaryStepTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.onSurface,
    letterSpacing: -0.3,
    lineHeight: 26,
    marginBottom: 6,
  },
  primaryStepSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceMuted,
    lineHeight: 20,
    marginBottom: 18,
  },
  primaryStepCtaButton: {
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignSelf: 'flex-start',
  },
  primaryStepCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurface,
  },

  // CTA / next-action cards
  ctaCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: 10,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ctaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 3,
  },
  ctaSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
    lineHeight: 19,
  },

  // Timeline items — individual cards with spacing
  tlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: spacing.md,
    marginBottom: 10,
  },
  tlIcon: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tlMid: {
    flex: 1,
  },
  tlName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  tlSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceMuted,
    marginTop: 2,
  },
  tlRight: {
    alignItems: 'flex-end',
  },
  tlAmt: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  tlSaving: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.positive,
    marginTop: 2,
  },
});
