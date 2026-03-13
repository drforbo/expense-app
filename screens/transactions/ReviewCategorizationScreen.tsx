import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';
import { apiPost } from '../../lib/api';

const CATEGORY_EMOJI: Record<string, string> = {
  'Office Supplies': '🖊️', 'Travel': '✈️', 'Meals': '🍽️', 'Software': '💻',
  'Marketing': '📣', 'Insurance': '🛡️', 'Utilities': '⚡', 'Rent': '🏠',
  'Professional Services': '👔', 'Training': '📚', 'Equipment': '🔧',
  'Phone': '📱', 'Internet': '🌐', 'Subscriptions': '🔄', 'Bank Fees': '🏦',
  'Transport': '🚗', 'Clothing': '👕', 'Entertainment': '🎭', 'Health': '💊',
  'Gifts': '🎁', 'Income': '💰', 'Other': '📋',
};
const getCategoryEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '📋';

const CATEGORY_LABELS: Record<string, string> = {
  supplies: 'Supplies & Equipment',
  software: 'Software & Subscriptions',
  marketing: 'Marketing & Ads',
  subsistence: 'Business Travel Meals',
  travel: 'Travel',
  mileage: 'Mileage',
  home_office: 'Home Office',
  professional_services: 'Professional Services',
  training: 'Training & Development',
  insurance: 'Insurance',
  personal: 'Personal',
  sponsorship_income: 'Sponsorship Income',
  ad_revenue: 'Ad Revenue',
  affiliate_income: 'Affiliate Income',
  client_fees: 'Client Fees',
  sales_income: 'Sales Income',
  employment_income: 'Employment Income',
  other_income: 'Other Income',
};

export default function ReviewCategorizationScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [categorizing, setCategorizing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Data
  const [autoBusiness, setAutoBusiness] = useState<any[]>([]);
  const [autoPersonal, setAutoPersonal] = useState<any[]>([]);
  const [needsReview, setNeedsReview] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [learningPhase, setLearningPhase] = useState(1);
  const [totalConfirmed, setTotalConfirmed] = useState(0);

  // Correction state
  const [correctedIds, setCorrectedIds] = useState<Set<string>>(new Set());
  const [expandedSection, setExpandedSection] = useState<'business' | 'personal' | null>('business');

  const fetchReviewData = useCallback(async () => {
    try {
      const data = await apiPost('/api/get_review_transactions', {});
      setAutoBusiness(data.auto_business || []);
      setAutoPersonal(data.auto_personal || []);
      setNeedsReview(data.needs_review || []);
      setPendingCount(data.pending_count || 0);
      setLearningPhase(data.learning_phase || 1);
      setTotalConfirmed(data.total_confirmed || 0);
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewData();
  }, [fetchReviewData]);

  const handleSmartCategorize = async () => {
    setCategorizing(true);
    try {
      const result = await apiPost('/api/smart_categorize', {});
      if (result.success) {
        Alert.alert(
          'Categorization complete',
          `${result.auto_categorized} auto-categorized, ${result.needs_review} need your review.`
        );
        await fetchReviewData();
      } else {
        Alert.alert('Error', result.error || 'Failed to categorize');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to categorize');
    } finally {
      setCategorizing(false);
    }
  };

  const handleConfirmAll = async (transactions: any[], type: 'business' | 'personal') => {
    if (transactions.length === 0) return;

    const ids = transactions
      .filter(t => !correctedIds.has(t.id))
      .map(t => t.id);

    if (ids.length === 0) return;

    setConfirming(true);
    try {
      const result = await apiPost('/api/confirm_categorization', {
        transaction_ids: ids,
        action: 'confirm',
      });

      if (result.success) {
        if (type === 'business') {
          setAutoBusiness(prev => prev.filter(t => correctedIds.has(t.id)));
        } else {
          setAutoPersonal(prev => prev.filter(t => correctedIds.has(t.id)));
        }
        await fetchReviewData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  };

  const handleCorrectTransaction = async (transaction: any, newCategoryId: string) => {
    try {
      const result = await apiPost('/api/confirm_categorization', {
        transaction_ids: [transaction.id],
        action: 'correct',
        correction: {
          category_id: newCategoryId,
          category_name: CATEGORY_LABELS[newCategoryId] || newCategoryId,
          business_percent: newCategoryId === 'personal' ? 0 : 100,
          tax_deductible: newCategoryId !== 'personal',
        },
      });

      if (result.success) {
        setCorrectedIds(prev => new Set([...prev, transaction.id]));
        await fetchReviewData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to correct');
    }
  };

  const handleMarkAsPersonal = (transaction: any) => {
    handleCorrectTransaction(transaction, 'personal');
  };

  const handleMarkAsBusiness = (transaction: any, categoryId: string) => {
    handleCorrectTransaction(transaction, categoryId);
  };

  const handleReviewGroupAsPersonal = async (group: any) => {
    const ids = group.transactions.map((t: any) => t.id);
    try {
      await apiPost('/api/confirm_categorization', {
        transaction_ids: ids,
        action: 'correct',
        correction: {
          category_id: 'personal',
          category_name: 'Personal',
          business_percent: 0,
          tax_deductible: false,
        },
      });
      await fetchReviewData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleReviewGroupAsBusiness = async (group: any, categoryId: string) => {
    const ids = group.transactions.map((t: any) => t.id);
    try {
      await apiPost('/api/confirm_categorization', {
        transaction_ids: ids,
        action: 'correct',
        correction: {
          category_id: categoryId,
          category_name: CATEGORY_LABELS[categoryId] || categoryId,
          business_percent: 100,
          tax_deductible: true,
        },
      });
      await fetchReviewData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const totalAutoCount = autoBusiness.length + autoPersonal.length;
  const totalReviewCount = needsReview.reduce((sum: number, g: any) => sum + g.count, 0);
  const totalCount = totalAutoCount + totalReviewCount + pendingCount;

  const renderTransactionRow = (item: any, showCorrectButton: boolean, type: 'business' | 'personal') => (
    <View key={item.id} style={styles.transactionRow}>
      <View style={styles.transactionInfo}>
        <Text style={styles.merchantName} numberOfLines={1}>{item.merchant_name}</Text>
        <Text style={styles.transactionDate}>{item.transaction_date}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          parseFloat(item.amount) < 0 && styles.incomeAmount
        ]}>
          {parseFloat(item.amount) < 0 ? '+' : ''}£{Math.abs(parseFloat(item.amount)).toFixed(2)}
        </Text>
        <View style={[
          styles.categoryPill,
          type === 'business' ? styles.businessPill : styles.personalPill
        ]}>
          <Text style={[
            styles.categoryPillText,
            type === 'business' ? styles.businessPillText : styles.personalPillText
          ]} numberOfLines={1}>
            {getCategoryEmoji(CATEGORY_LABELS[item.auto_category_id] || item.auto_category_name || '')} {CATEGORY_LABELS[item.auto_category_id] || item.auto_category_name || 'Unknown'}
          </Text>
        </View>
      </View>
      {showCorrectButton && (
        <TouchableOpacity
          style={styles.correctButton}
          onPress={() => {
            if (type === 'business') {
              handleMarkAsPersonal(item);
            } else {
              // Show category picker for marking personal as business
              Alert.alert(
                'Recategorize',
                `What category is this ${item.merchant_name} transaction?`,
                [
                  { text: 'Supplies', onPress: () => handleMarkAsBusiness(item, 'supplies') },
                  { text: 'Software', onPress: () => handleMarkAsBusiness(item, 'software') },
                  { text: 'Travel', onPress: () => handleMarkAsBusiness(item, 'travel') },
                  { text: 'Training', onPress: () => handleMarkAsBusiness(item, 'training') },
                  { text: 'Client Fees', onPress: () => handleMarkAsBusiness(item, 'client_fees') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }
          }}
        >
          <Ionicons
            name={type === 'business' ? 'close-circle' : 'checkmark-circle'}
            size={20}
            color={type === 'business' ? colors.midGrey : colors.positive}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderGroupCard = (group: any) => (
    <View key={group.normalized} style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View>
          <Text style={styles.groupMerchant}>{group.merchant}</Text>
          <Text style={styles.groupSubtext}>
            {group.count} transaction{group.count !== 1 ? 's' : ''} — £{group.total_amount}
          </Text>
        </View>
      </View>

      <View style={styles.groupActions}>
        <TouchableOpacity
          style={styles.groupActionPersonal}
          onPress={() => handleReviewGroupAsPersonal(group)}
        >
          <Text style={styles.groupActionText}>All personal</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.groupActionBusiness}
          onPress={() => {
            Alert.alert(
              'Business category',
              `What category for all ${group.count} ${group.merchant} transactions?`,
              [
                { text: 'Supplies', onPress: () => handleReviewGroupAsBusiness(group, 'supplies') },
                { text: 'Software', onPress: () => handleReviewGroupAsBusiness(group, 'software') },
                { text: 'Travel', onPress: () => handleReviewGroupAsBusiness(group, 'travel') },
                { text: 'Marketing', onPress: () => handleReviewGroupAsBusiness(group, 'marketing') },
                { text: 'Training', onPress: () => handleReviewGroupAsBusiness(group, 'training') },
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          }}
        >
          <Text style={styles.groupActionBusinessText}>All business</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.groupActionMix}
          onPress={() => {
            // Navigate to individual review for this group
            navigation.navigate('TransactionList');
          }}
        >
          <Text style={styles.groupActionMixText}>It's a mix</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenLabel}>REVIEW</Text>
      </View>

      {/* Hero heading */}
      <View style={styles.heroContainer}>
        <Text style={styles.heroHeading}>{'review\ncategories.'}</Text>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {/* Learning phase indicator */}
        <View style={styles.phaseCard}>
          <View style={styles.phaseRow}>
            <Ionicons
              name={learningPhase >= 3 ? 'sparkles' : learningPhase >= 2 ? 'trending-up' : 'school'}
              size={20}
              color={colors.gradientMid}
            />
            <Text style={styles.phaseText}>
              {learningPhase === 1
                ? `Learning your patterns (${totalConfirmed}/50 confirmed)`
                : learningPhase === 2
                ? `Getting smarter (${totalConfirmed}/200 confirmed)`
                : `Expert mode (${totalConfirmed} confirmed)`}
            </Text>
          </View>
          <View style={styles.phaseBar}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.phaseFill, {
                width: `${learningPhase === 3 ? 100 : learningPhase === 2
                  ? ((totalConfirmed - 50) / 150 * 100)
                  : (totalConfirmed / 50 * 100)}%`
              }]}
            />
          </View>
        </View>

        {/* Run smart categorization if pending */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={[styles.categorizeButtonWrap, categorizing && styles.buttonDisabled]}
            onPress={handleSmartCategorize}
            disabled={categorizing}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {categorizing ? (
                <>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.gradientButtonText}>Categorizing {pendingCount} transactions...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={colors.white} />
                  <Text style={styles.gradientButtonText}>
                    Smart categorize {pendingCount} transaction{pendingCount !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Nothing to review */}
        {totalAutoCount === 0 && totalReviewCount === 0 && pendingCount === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color={colors.positive} />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No transactions to review</Text>
          </View>
        )}

        {/* SECTION: Auto-categorized as Business */}
        {autoBusiness.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'business' ? null : 'business')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.statusDot, { backgroundColor: colors.positive }]} />
                <Text style={styles.sectionTitle}>Business expenses</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{autoBusiness.length}</Text>
                </View>
              </View>
              <Ionicons
                name={expandedSection === 'business' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.midGrey}
              />
            </TouchableOpacity>

            {expandedSection === 'business' && (
              <>
                <View style={styles.transactionList}>
                  {autoBusiness.map(t => renderTransactionRow(t, learningPhase <= 2, 'business'))}
                </View>
                <TouchableOpacity
                  style={[styles.confirmAllButtonWrap, confirming && styles.buttonDisabled]}
                  onPress={() => handleConfirmAll(autoBusiness, 'business')}
                  disabled={confirming}
                >
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Ionicons name="checkmark-done" size={20} color={colors.white} />
                    <Text style={styles.gradientButtonText}>
                      {confirming ? 'Confirming...' : `Confirm all ${autoBusiness.length} as business`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* SECTION: Auto-categorized as Personal */}
        {autoPersonal.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setExpandedSection(expandedSection === 'personal' ? null : 'personal')}
            >
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.statusDot, { backgroundColor: colors.midGrey }]} />
                <Text style={styles.sectionTitle}>Personal</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{autoPersonal.length}</Text>
                </View>
              </View>
              <Ionicons
                name={expandedSection === 'personal' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.midGrey}
              />
            </TouchableOpacity>

            {expandedSection === 'personal' && (
              <>
                <View style={styles.transactionList}>
                  {autoPersonal.map(t => renderTransactionRow(t, learningPhase <= 2, 'personal'))}
                </View>
                <TouchableOpacity
                  style={[styles.confirmAllPersonalButton, confirming && styles.buttonDisabled]}
                  onPress={() => handleConfirmAll(autoPersonal, 'personal')}
                  disabled={confirming}
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.ink} />
                  <Text style={styles.confirmAllPersonalText}>
                    {confirming ? 'Confirming...' : `Confirm all ${autoPersonal.length} as personal`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* SECTION: Needs Review (grouped by merchant) */}
        {needsReview.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.statusDot, { backgroundColor: colors.gradientMid }]} />
                <Text style={styles.sectionTitle}>Needs your input</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{totalReviewCount}</Text>
                </View>
              </View>
            </View>
            {needsReview.map(renderGroupCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.midGrey,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
  },
  heroContainer: {
    paddingHorizontal: 20,
    marginBottom: spacing.xl,
  },
  heroHeading: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.ink,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  phaseCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  phaseText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  phaseBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  phaseFill: {
    height: '100%',
    borderRadius: 2,
  },
  categorizeButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradientButton: {
    borderRadius: borderRadius.full,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  gradientButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  emptySubtext: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
  },
  countBadge: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  countBadgeText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  transactionList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  merchantName: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  transactionDate: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.negative,
  },
  incomeAmount: {
    color: colors.positive,
  },
  categoryPill: {
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: 160,
  },
  businessPill: {
    backgroundColor: colors.tagExpenseBg,
  },
  personalPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillText: {
    fontSize: 11,
    fontFamily: fonts.body,
    letterSpacing: 0.2,
  },
  businessPillText: {
    color: colors.tagExpenseText,
  },
  personalPillText: {
    color: colors.midGrey,
  },
  correctButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  confirmAllButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  confirmAllPersonalButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  confirmAllPersonalText: {
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  groupHeader: {
    marginBottom: spacing.md,
  },
  groupMerchant: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  groupSubtext: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginTop: 2,
  },
  groupActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  groupActionPersonal: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  groupActionBusiness: {
    flex: 1,
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  groupActionMix: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  groupActionText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  groupActionBusinessText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.tagExpenseText,
  },
  groupActionMixText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
});
