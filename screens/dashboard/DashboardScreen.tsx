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
import { colors, fonts, spacing, borderRadius } from '../../lib/theme';
import { apiPost } from '../../lib/api';

// Category → emoji mapping for recent transaction rows
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

      // Phase 1: Profile (fast) — renders greeting, profile prompt, upload cards immediately
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
        apiPost('/api/batch_status', { user_id: user.id }),
        apiPost('/api/get_statements_by_month', { user_id: user.id }),
        apiPost('/api/get_uncategorized_transactions', { user_id: user.id }),
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
      console.error('Error loading dashboard data:', error);
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

  const taxYearPercent = getTaxYearProgress();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Upload progress banner */}
      {isUploading && (
        <LinearGradient
          colors={['#FF8C00', '#FF4500', '#CC1A00']}
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
          <ActivityIndicator size="small" color={colors.gradientMid} />
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
            <Ionicons name="close" size={18} color={colors.midGrey} />
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
            <Text style={styles.greetingSub}>hey {userName} 👋</Text>
            <Text style={!hasTransactions ? styles.heroHeadingSmall : styles.heroHeading}>
              {!hasTransactions ? "let's get your\ntaxes sorted." : "here's\nyour tax."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF8C00', '#FF4500', '#CC1A00']}
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

        {/* Upload progress card */}
        {profileLoaded && bankAccountCount > 0 && uploadedMonthBanks < bankAccountCount * 12 && (
          <TouchableOpacity
            style={styles.uploadProgressCard}
            onPress={() => navigation.navigate('BankStatements')}
            activeOpacity={0.8}
          >
            <View style={styles.uploadProgressHeader}>
              <Ionicons name="documents-outline" size={22} color={colors.gradientMid} />
              <Text style={styles.uploadProgressTitle}>Statement uploads</Text>
            </View>
            <Text style={styles.uploadProgressSub}>
              {uploadedMonthBanks} of {bankAccountCount * 12} month/account uploads done
            </Text>
            <View style={styles.uploadProgressBarBg}>
              <LinearGradient
                colors={['#FF8C00', '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.uploadProgressBarFill,
                  { width: `${Math.min(100, (uploadedMonthBanks / (bankAccountCount * 12)) * 100)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.uploadProgressHint}>
              {bankAccountCount} account{bankAccountCount > 1 ? 's' : ''} x 12 months · Tap to upload
            </Text>
          </TouchableOpacity>
        )}

        {/* First-time user: upload prompt */}
        {profileLoaded && !hasTransactions && bankAccountCount === 0 && (
          <TouchableOpacity
            style={styles.welcomeCard}
            onPress={() => navigation.navigate('BankStatements')}
            activeOpacity={0.8}
          >
            <View style={styles.welcomeIconWrap}>
              <Text style={{ fontSize: 28 }}>📄</Text>
            </View>
            <Text style={styles.welcomeTitle}>Upload a bank statement</Text>
            <Text style={styles.welcomeSub}>
              Get started by uploading a PDF bank statement. We'll read your transactions and help you track expenses for your tax return.
            </Text>
            <LinearGradient
              colors={['#FF8C00', '#FF4500', '#CC1A00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeCtaGradient}
            >
              <View style={styles.welcomeCta}>
                <Ionicons name="add" size={18} color={colors.white} />
                <Text style={styles.welcomeCtaText}>Upload statement</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Profile incomplete prompt */}
        {profileLoaded && !profileCompleted && (
          <TouchableOpacity
            style={styles.profilePromptCard}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={styles.profilePromptRow}>
              <View style={styles.profilePromptIcon}>
                <Ionicons name="person-outline" size={20} color={colors.gradientMid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profilePromptTitle}>Complete your profile</Text>
                <Text style={styles.profilePromptSub}>
                  Your tax estimate won't be accurate until you've added your employment details, student loan plan, and tax year info.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Hero gradient tax card */}
        <LinearGradient
          colors={['#FFD166', '#FF8C00', '#FF4500', '#990000']}
          locations={[0, 0.35, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Flare overlays */}
          <View style={styles.flareTopRight} />
          <View style={styles.flareBottomLeft} />

          <Text style={styles.heroCardLabel}>TAX SET ASIDE</Text>
          <Text style={styles.heroCardValue}>
            {loadingCounts ? '...' : taxOwed !== null ? `£${taxOwed.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
          </Text>

          {/* Pills row */}
          <View style={styles.heroPillsRow}>
            <View style={styles.heroPillGhost}>
              <Text style={styles.heroPillGhostText}>{taxYearPercent}% of year done</Text>
            </View>
            <View style={styles.heroPillSolid}>
              <Text style={styles.heroPillSolidText}>
                {taxOwed !== null && taxOwed > 0 ? 'on track ✓' : 'no tax yet'}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.heroProgressBg}>
            <View style={[styles.heroProgressFill, { width: `${taxYearPercent}%` as any }]} />
          </View>
        </LinearGradient>

        {/* Stat cards row: Earned + Owed */}
        <View style={styles.statCardsRow}>
          <View style={styles.statCardNeutral}>
            <Text style={styles.statCardLabel}>EARNED</Text>
            <Text style={styles.statCardValueBlack}>
              {loadingCounts ? '...' : formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.statCardWarning}>
            <Text style={styles.statCardLabelOrange}>OWED</Text>
            <Text style={styles.statCardValueRed}>
              {loadingCounts ? '...' : taxOwed !== null ? formatCurrency(taxOwed) : '—'}
            </Text>
          </View>
        </View>

        {/* Quick action pills */}
        <View style={styles.quickActionsRow}>
          <LinearGradient
            colors={['#FF8C00', '#FF4500', '#CC1A00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickActionGradient}
          >
            <TouchableOpacity
              style={styles.quickActionInner}
              onPress={() => navigation.navigate('CategorizedTransactions', { filterType: 'income' })}
              activeOpacity={0.8}
            >
              <Text style={styles.quickActionTextWhite}>+ income</Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity
            style={styles.quickActionOutlined}
            onPress={() => navigation.navigate('CategorizedTransactions', { filterType: 'expense' })}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionTextBlack}>expenses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionOutlined}
            onPress={() => navigation.navigate('TaxEstimate')}
            activeOpacity={0.8}
          >
            <Text style={styles.quickActionTextBlack}>checklist</Text>
          </TouchableOpacity>
        </View>

        {/* Your progress section */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>YOUR PROGRESS</Text>
        </View>

        {/* Step 1: Upload */}
        <TouchableOpacity
          style={styles.stepCard}
          onPress={() => navigation.navigate('BankStatements')}
          activeOpacity={0.8}
        >
          <View style={styles.stepHeaderRow}>
            {bankAccountCount > 0 && uploadedMonthBanks >= bankAccountCount * 12 ? (
              <LinearGradient
                colors={['#FF8C00', '#FF4500', '#CC1A00']}
                style={styles.stepNumberDone}
              >
                <Ionicons name="checkmark" size={14} color={colors.white} />
              </LinearGradient>
            ) : (
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Upload statements</Text>
              <Text style={styles.stepSub}>
                {bankAccountCount > 0
                  ? `${uploadedMonthBanks} of ${bankAccountCount * 12} uploads`
                  : 'Add your bank statements'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
          {bankAccountCount > 0 && (
            <View style={styles.stepProgressBg}>
              <LinearGradient
                colors={['#FF8C00', '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.stepProgressFill, {
                  width: `${Math.min(100, (uploadedMonthBanks / (bankAccountCount * 12)) * 100)}%` as any,
                }]}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Step 2: Categorise */}
        <TouchableOpacity
          style={styles.stepCard}
          onPress={() => navigation.navigate('ReviewCategorization')}
          activeOpacity={0.8}
        >
          <View style={styles.stepHeaderRow}>
            {totalTransactionCount > 0 && uncategorizedCount === 0 ? (
              <LinearGradient
                colors={['#FF8C00', '#FF4500', '#CC1A00']}
                style={styles.stepNumberDone}
              >
                <Ionicons name="checkmark" size={14} color={colors.white} />
              </LinearGradient>
            ) : (
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Categorise transactions</Text>
              <Text style={styles.stepSub}>
                {loadingCounts ? 'Loading...'
                  : totalTransactionCount === 0 ? 'Upload statements first'
                  : uncategorizedCount > 0 ? `${categorizedCount} of ${totalTransactionCount} done`
                  : 'All done!'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
          {totalTransactionCount > 0 && (
            <View style={styles.stepProgressBg}>
              <LinearGradient
                colors={['#FF8C00', '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.stepProgressFill, {
                  width: `${Math.min(100, (categorizedCount / totalTransactionCount) * 100)}%` as any,
                }]}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Step 3: Add evidence */}
        <TouchableOpacity
          style={styles.stepCard}
          onPress={() => navigation.navigate('QualifyTransactionList')}
          activeOpacity={0.8}
        >
          <View style={styles.stepHeaderRow}>
            {categorizedCount > 0 && unqualifiedCount === 0 ? (
              <LinearGradient
                colors={['#FF8C00', '#FF4500', '#CC1A00']}
                style={styles.stepNumberDone}
              >
                <Ionicons name="checkmark" size={14} color={colors.white} />
              </LinearGradient>
            ) : (
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Add receipts & evidence</Text>
              <Text style={styles.stepSub}>
                {loadingCounts ? 'Loading...'
                  : categorizedCount === 0 ? 'Categorise transactions first'
                  : unqualifiedCount > 0 ? `${qualifiedCount} of ${categorizedCount} done`
                  : 'All done!'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
          {categorizedCount > 0 && (
            <View style={styles.stepProgressBg}>
              <LinearGradient
                colors={['#FF8C00', '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.stepProgressFill, {
                  width: `${Math.min(100, (qualifiedCount / categorizedCount) * 100)}%` as any,
                }]}
              />
            </View>
          )}
        </TouchableOpacity>

        {/* Gifted items card */}
        {receivesGifts && (
          <TouchableOpacity
            style={styles.stepCard}
            onPress={() => navigation.navigate('GiftedTracker')}
            activeOpacity={0.8}
          >
            <View style={styles.stepHeaderRow}>
              <View style={styles.stepNumber}>
                <Text style={{ fontSize: 14 }}>🎁</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>Log gifted items</Text>
                <Text style={styles.stepSub}>
                  {giftedItemsCount > 0
                    ? `${giftedItemsCount} item${giftedItemsCount !== 1 ? 's' : ''} logged`
                    : 'PR packages count as income'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </TouchableOpacity>
        )}

        {/* Recent drops section */}
        {recentTransactions.length > 0 && (
          <>
            <View style={styles.sectionRowSpaced}>
              <Text style={styles.sectionHeading}>{'recent drops \u{1F4B8}'}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CategorizedTransactions')}>
                <Text style={styles.sectionLink}>all</Text>
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
                  style={styles.transactionRow}
                  onPress={() => navigation.navigate('EditTransaction', {
                    transactionId: item.id,
                    transactionType: item.transaction_type || (isIncome ? 'income' : 'expense'),
                  })}
                  activeOpacity={0.7}
                >
                  {/* Emoji icon */}
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: isExpense ? colors.tagExpenseBg : colors.surface },
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
                      { color: isIncome ? colors.positive : colors.negative },
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
          </>
        )}

        {/* All transactions link */}
        <TouchableOpacity
          style={styles.allTransactionsLink}
          onPress={() => navigation.navigate('CategorizedTransactions')}
        >
          <Text style={styles.allTransactionsText}>View all transactions</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.gradientMid} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    gap: 10,
  },
  processingBannerText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.gradientMid,
    flex: 1,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xxl,
    marginTop: spacing.lg,
  },
  greetingSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: 4,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -1.5,
    lineHeight: 42,
  },
  heroHeadingSmall: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 34,
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
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
  },

  // Hero gradient card
  heroCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  flareTopRight: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
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
  heroCardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroCardValue: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.white,
    letterSpacing: -2,
    lineHeight: 46,
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  heroPillGhost: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  heroPillGhostText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.white,
  },
  heroPillSolid: {
    backgroundColor: colors.white,
    borderRadius: 9999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  heroPillSolidText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: '#FF4500',
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

  // Stat cards
  statCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.xl,
  },
  statCardNeutral: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
  },
  statCardWarning: {
    flex: 1,
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,69,0,0.13)',
  },
  statCardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statCardLabelOrange: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.tagExpenseText,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statCardValueBlack: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  statCardValueRed: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.negative,
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
  quickActionTextWhite: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  quickActionOutlined: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 9999,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  quickActionTextBlack: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.ink,
  },

  // Section labels
  sectionRow: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionRowSpaced: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  sectionLink: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#FF4500',
  },

  // Step cards
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberDone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontFamily: fonts.displaySemi,
    fontSize: 13,
    color: colors.midGrey,
  },
  stepTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  stepSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
  },
  stepProgressBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  stepProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Transaction rows
  transactionRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
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
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  categoryTagText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.tagExpenseText,
  },
  transactionDate: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
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
    color: colors.gradientMid,
  },

  // Upload progress card
  uploadProgressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  uploadProgressTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.ink,
  },
  uploadProgressSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: spacing.sm,
  },
  uploadProgressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  uploadProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  uploadProgressHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },

  // Welcome card
  welcomeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  welcomeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  welcomeSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  welcomeCtaGradient: {
    borderRadius: 9999,
    overflow: 'hidden',
  },
  welcomeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  welcomeCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },

  // Profile prompt
  profilePromptCard: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  profilePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
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
    color: colors.midGrey,
    lineHeight: 18,
  },
});
