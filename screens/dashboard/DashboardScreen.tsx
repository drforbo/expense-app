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

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

      // Uncategorized count
      const uncategorizedResponse = await fetch(`${API_URL}/api/get_uncategorized_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const uncategorizedData = await uncategorizedResponse.json();
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

        setTotalIncome(income);
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
          <ActivityIndicator size="small" color={colors.ink} />
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
            {uploadState.result.transactions_saved} transactions added
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
            <Text style={styles.logo}>bo<Text style={styles.logoPop}>pp</Text></Text>
          </View>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('UploadStatement')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={colors.volt} />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hey {userName} 👋</Text>
        <Text style={styles.greetingSub}>Here's your tax snapshot</Text>

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
              color={uncategorizedCount > 0 ? colors.ink : colors.tagGreenText}
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
              color={unqualifiedCount > 0 ? colors.white : colors.tagGreenText}
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
    color: colors.ink,
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
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
  logoPop: {
    backgroundColor: colors.volt,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  uploadButtonText: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.volt,
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
    backgroundColor: colors.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  taxCardLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
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
    color: 'rgba(255,255,255,0.4)',
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
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    color: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
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
});
