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
import { supabase } from '../../lib/supabase';
import { useUpload } from '../../context/UploadContext';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';
import { apiPost } from '../../lib/api';

export default function DashboardScreen({ navigation }: any) {
  const { uploadState, clearUpload } = useUpload();
  const [userName, setUserName] = useState('');
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [unqualifiedCount, setUnqualifiedCount] = useState(0);
  const [taxOwed, setTaxOwed] = useState<number | null>(null);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [showUploadComplete, setShowUploadComplete] = useState(false);
  const [hasTransactions, setHasTransactions] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [receivesGifts, setReceivesGifts] = useState(false);
  const [giftedItemsCount, setGiftedItemsCount] = useState(0);
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

      // Get user name from email
      setUserName(user.email?.split('@')[0] || 'there');

      // Check profile completion + gifted items preference
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('profile_completed, receives_gifted_items')
        .eq('user_id', user.id)
        .single();
      setProfileCompleted(profileData?.profile_completed ?? false);
      setReceivesGifts(profileData?.receives_gifted_items ?? false);

      // Gifted items count
      if (profileData?.receives_gifted_items) {
        const { data: giftedItems } = await supabase
          .from('gifted_items')
          .select('id')
          .eq('user_id', user.id);
        setGiftedItemsCount(giftedItems?.length || 0);
      }

      // Uncategorized count
      const uncategorizedData = await apiPost('/api/get_uncategorized_transactions', { user_id: user.id });
      setUncategorizedCount(uncategorizedData.count || 0);

      // Unqualified count
      const { data: unqualified } = await supabase
        .from('categorized_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('tax_deductible', true)
        .or('qualified.is.null,qualified.eq.false');
      setUnqualifiedCount(unqualified?.length || 0);

      // Financial summary
      const { data: transactions } = await supabase
        .from('categorized_transactions')
        .select('amount, tax_deductible, qualified, business_percent, category_id')
        .eq('user_id', user.id);

      setHasTransactions((transactions?.length || 0) > 0 || (uncategorizedData.count || 0) > 0);

      // Gifted items total (counts as income)
      let giftedTotal = 0;
      const { data: giftedData } = await supabase
        .from('gifted_items')
        .select('rrp')
        .eq('user_id', user.id);
      if (giftedData) {
        giftedTotal = giftedData.reduce((sum, g) => sum + (g.rrp || 0), 0);
      }

      if (transactions) {
        let income = 0;
        let qualifiedExpenses = 0;

        transactions.forEach(t => {
          if (t.amount < 0) {
            income += Math.abs(t.amount);
          } else if (t.tax_deductible && t.qualified) {
            qualifiedExpenses += t.amount * ((t.business_percent || 100) / 100);
          }
        });

        setTotalIncome(income + giftedTotal);
        setTotalExpenses(qualifiedExpenses);

        // Simple tax estimate (basic rate 20% after personal allowance £12,570)
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Upload progress banner */}
      {isUploading && (
        <View style={styles.uploadBanner}>
          <ActivityIndicator size="small" color={colors.background} />
          <Text style={styles.uploadBannerText}>
            {uploadState.status === 'uploading' ? 'Uploading...' : 'Reading your statement...'}
          </Text>
        </View>
      )}

      {/* Upload complete toast */}
      {showUploadComplete && uploadState.result && (
        <Animated.View style={[styles.toastBanner, { transform: [{ translateY: slideAnim }] }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.tagGreenText} />
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>bopp.</Text>
          </View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('BankStatements')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.background} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hey {userName} 👋</Text>
        <Text style={styles.greetingSub}>
          {!hasTransactions ? 'Let\'s get your taxes sorted' : 'Here\'s your tax snapshot'}
        </Text>

        {/* First-time user: upload prompt */}
        {!loadingCounts && !hasTransactions && (
          <TouchableOpacity
            style={styles.welcomeCard}
            onPress={() => navigation.navigate('BankStatements')}
            activeOpacity={0.8}
          >
            <View style={styles.welcomeIconWrap}>
              <Ionicons name="document-text-outline" size={28} color={colors.volt} />
            </View>
            <Text style={styles.welcomeTitle}>Upload a bank statement</Text>
            <Text style={styles.welcomeSub}>
              Get started by uploading a PDF bank statement. We'll read your transactions and help you track expenses for your tax return.
            </Text>
            <View style={styles.welcomeCta}>
              <Ionicons name="add" size={18} color={colors.background} />
              <Text style={styles.welcomeCtaText}>Upload statement</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Profile incomplete prompt */}
        {!loadingCounts && !profileCompleted && (
          <TouchableOpacity
            style={styles.profilePromptCard}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={styles.profilePromptRow}>
              <View style={styles.profilePromptIcon}>
                <Ionicons name="person-outline" size={20} color={colors.ember} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profilePromptTitle}>Complete your profile</Text>
                <Text style={styles.profilePromptSub}>
                  Your tax estimate won't be accurate until you've added your employment details, student loan plan, and tax year info.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
            </View>
          </TouchableOpacity>
        )}

        {/* Tax snapshot card */}
        <View style={styles.taxCard}>
          <Text style={styles.taxCardLabel}>Estimated tax owed</Text>
          <Text style={styles.taxCardValue}>
            {loadingCounts ? '...' : taxOwed !== null ? `£${taxOwed.toFixed(0)}` : '—'}
          </Text>
          <View style={styles.taxCardRow}>
            <View style={styles.taxMini}>
              <Text style={styles.taxMiniLabel}>Income</Text>
              <Text style={styles.taxMiniValue}>{loadingCounts ? '...' : formatCurrency(totalIncome)}</Text>
            </View>
            <View style={styles.taxMiniDivider} />
            <View style={styles.taxMini}>
              <Text style={styles.taxMiniLabel}>Deductions</Text>
              <Text style={styles.taxMiniValue}>{loadingCounts ? '...' : formatCurrency(totalExpenses)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.taxCardCta}
            onPress={() => navigation.navigate('TaxEstimate')}
            activeOpacity={0.8}
          >
            <Text style={styles.taxCardCtaText}>See full breakdown →</Text>
          </TouchableOpacity>
        </View>

        {/* To do section */}
        <Text style={styles.sectionLabel}>TO DO</Text>

        {/* Categorize card */}
        <TouchableOpacity
          style={[styles.actionCard, uncategorizedCount === 0 && styles.actionCardDone]}
          onPress={() => navigation.navigate('TransactionList')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: uncategorizedCount > 0 ? colors.volt : colors.tagGreenBg }]}>
            <Ionicons
              name={uncategorizedCount > 0 ? 'card-outline' : 'checkmark'}
              size={22}
              color={uncategorizedCount > 0 ? colors.background : colors.tagGreenText}
            />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Categorise transactions</Text>
            <Text style={styles.actionSub}>
              {loadingCounts
                ? 'Loading...'
                : uncategorizedCount > 0
                  ? `${uncategorizedCount} to review`
                  : 'All done!'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
        </TouchableOpacity>

        {/* Qualify card */}
        <TouchableOpacity
          style={[styles.actionCard, unqualifiedCount === 0 && styles.actionCardDone]}
          onPress={() => navigation.navigate('QualifyTransactionList')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIcon, { backgroundColor: unqualifiedCount > 0 ? colors.ember : colors.tagGreenBg }]}>
            <Ionicons
              name={unqualifiedCount > 0 ? 'shield-checkmark-outline' : 'checkmark'}
              size={22}
              color={unqualifiedCount > 0 ? colors.background : colors.tagGreenText}
            />
          </View>
          <View style={styles.actionText}>
            <Text style={styles.actionTitle}>Add evidence</Text>
            <Text style={styles.actionSub}>
              {loadingCounts
                ? 'Loading...'
                : unqualifiedCount > 0
                  ? `${unqualifiedCount} need receipts`
                  : 'All done!'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
        </TouchableOpacity>

        {/* Gifted items card */}
        {receivesGifts && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('GiftedTracker')}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.tagBlueBg }]}>
              <Ionicons name="gift-outline" size={22} color={colors.tagBlueText} />
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Log gifted items</Text>
              <Text style={styles.actionSub}>
                {loadingCounts
                  ? 'Loading...'
                  : giftedItemsCount > 0
                    ? `${giftedItemsCount} item${giftedItemsCount !== 1 ? 's' : ''} logged`
                    : 'PR packages count as income'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
          </TouchableOpacity>
        )}

        {/* All transactions link */}
        <TouchableOpacity
          style={styles.allTransactionsLink}
          onPress={() => navigation.navigate('CategorizedTransactions')}
        >
          <Text style={styles.allTransactionsText}>View all transactions</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.ember} />
        </TouchableOpacity>
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
    backgroundColor: colors.volt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  uploadBannerText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.background,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
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
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.coralBlaze,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  uploadButtonText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.background,
  },
  greeting: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  greetingSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: spacing.lg,
  },
  taxCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taxCardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.midGrey,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  taxCardValue: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.volt,
    letterSpacing: -1.5,
    marginBottom: spacing.md,
  },
  taxCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  taxMini: {
    flex: 1,
  },
  taxMiniLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.midGrey,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  taxMiniValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    letterSpacing: -0.5,
  },
  taxMiniDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  taxCardCta: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  taxCardCtaText: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.background,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.midGrey,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionCardDone: {
    opacity: 0.7,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  actionSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
  },
  allTransactionsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  allTransactionsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ember,
  },
  welcomeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.volt,
    borderStyle: 'dashed',
  },
  welcomeIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.tagVoltBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  welcomeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.volt,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
  },
  welcomeCtaText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.background,
  },
  profilePromptCard: {
    backgroundColor: colors.tagEmberBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  profilePromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  profilePromptTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  profilePromptSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.midGrey,
    lineHeight: 17,
  },
});
