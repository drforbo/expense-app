import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface StepData {
  id: string;
  title: string;
  description: string;
  status: 'done' | 'in_progress' | 'not_started';
  statusLabel: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

interface UserProfile {
  tracking_goal: string;
  receives_gifted_items: boolean;
  has_international_income: boolean;
  foreign_income_countries: string[];
  is_digital_nomad: boolean;
  monthly_income: number;
}

export default function FilingGuideScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [monthsCovered, setMonthsCovered] = useState(0);

  // Tax year: April 6 to April 5
  const now = new Date();
  const taxYearStart = now.getMonth() >= 3 && now.getDate() >= 6
    ? new Date(now.getFullYear(), 3, 6)
    : new Date(now.getFullYear() - 1, 3, 6);
  const taxYearEnd = new Date(taxYearStart.getFullYear() + 1, 3, 5);
  const taxYearLabel = `${taxYearStart.getFullYear()}/${(taxYearEnd.getFullYear()).toString().slice(2)}`;

  // Total months in tax year that have elapsed so far
  const monthsElapsed = Math.min(12, Math.max(1,
    (now.getFullYear() - taxYearStart.getFullYear()) * 12 +
    (now.getMonth() - taxYearStart.getMonth()) + 1
  ));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch everything in parallel
      const [
        { data: profileData },
        { data: completedData },
        uncategorizedData,
        { data: categorizedTxns },
        { data: giftedItems },
      ] = await Promise.all([
        supabase.from('user_profiles').select('tracking_goal, receives_gifted_items, has_international_income, foreign_income_countries, is_digital_nomad, monthly_income').eq('user_id', user.id).single(),
        supabase.from('user_checklist_progress').select('item_id').eq('user_id', user.id),
        apiPost('/api/get_uncategorized_transactions', { user_id: user.id }),
        supabase.from('categorized_transactions').select('transaction_date, tax_deductible, qualified').eq('user_id', user.id),
        supabase.from('gifted_items').select('id').eq('user_id', user.id),
      ]);

      // Build completed set
      const completed = new Set<string>((completedData || []).map((d: any) => d.item_id));
      setCompletedSteps(completed);

      // Calculate months covered by transactions
      const allDates = (categorizedTxns || []).map(t => new Date(t.transaction_date));
      const txnMonths = new Set(allDates
        .filter(d => d >= taxYearStart && d <= taxYearEnd)
        .map(d => `${d.getFullYear()}-${d.getMonth()}`)
      );
      setMonthsCovered(txnMonths.size);

      // Stats for step statuses
      const uncategorizedCount = uncategorizedData?.count || 0;
      const totalCategorized = categorizedTxns?.length || 0;
      const unqualifiedCount = (categorizedTxns || []).filter(
        t => t.tax_deductible && !t.qualified
      ).length;
      const giftedCount = giftedItems?.length || 0;
      const monthsRemaining = monthsElapsed - txnMonths.size;

      // Build personalised steps
      const generatedSteps: StepData[] = [];

      // Step 1: Registration (conditional)
      if (!profileData || profileData.tracking_goal === 'not_registered') {
        generatedSteps.push({
          id: 'register_hmrc',
          title: 'Register for Self Assessment',
          description: 'Register with HMRC as self-employed. Required if you earn over £1,000. You\'ll get a UTR number within 10 days.',
          status: completed.has('register_hmrc') ? 'done' : 'not_started',
          statusLabel: completed.has('register_hmrc') ? 'Done' : 'Action needed',
          icon: 'shield-checkmark-outline',
          color: colors.negative,
        });
      }

      // Step 2: Upload statements
      generatedSteps.push({
        id: 'upload_statements',
        title: 'Upload your bank statements',
        description: monthsRemaining > 0
          ? `You've covered ${txnMonths.size} of ${monthsElapsed} months so far this tax year. Upload statements for the remaining ${monthsRemaining} month${monthsRemaining !== 1 ? 's' : ''}.`
          : txnMonths.size === 0
            ? 'Upload PDF bank statements so we can read your transactions.'
            : `All ${txnMonths.size} months covered so far — you're up to date!`,
        status: txnMonths.size >= monthsElapsed ? 'done' : txnMonths.size > 0 ? 'in_progress' : 'not_started',
        statusLabel: txnMonths.size >= monthsElapsed ? 'Up to date' : txnMonths.size > 0 ? `${txnMonths.size}/${monthsElapsed} months` : 'Not started',
        icon: 'document-text-outline',
        color: colors.tagBlueText,
        onPress: () => navigation.navigate('UploadStatement'),
      });

      // Step 3: Categorise transactions
      generatedSteps.push({
        id: 'categorise',
        title: 'Categorise transactions',
        description: uncategorizedCount > 0
          ? `${uncategorizedCount} transaction${uncategorizedCount !== 1 ? 's' : ''} still need categorising.`
          : totalCategorized > 0
            ? 'All transactions categorised!'
            : 'Once you upload a statement, categorise each transaction as business or personal.',
        status: uncategorizedCount === 0 && totalCategorized > 0 ? 'done' : uncategorizedCount > 0 ? 'in_progress' : 'not_started',
        statusLabel: uncategorizedCount === 0 && totalCategorized > 0 ? 'All done' : uncategorizedCount > 0 ? `${uncategorizedCount} to review` : 'Waiting for upload',
        icon: 'pricetag-outline',
        color: colors.positive,
        onPress: () => navigation.navigate('TransactionList'),
      });

      // Step 4: Add evidence
      generatedSteps.push({
        id: 'add_evidence',
        title: 'Add receipts & evidence',
        description: unqualifiedCount > 0
          ? `${unqualifiedCount} business expense${unqualifiedCount !== 1 ? 's' : ''} need receipts. HMRC requires evidence for deductions.`
          : 'Attach receipts to your business expenses. Keep records for 5 years.',
        status: unqualifiedCount === 0 && totalCategorized > 0 ? 'done' : unqualifiedCount > 0 ? 'in_progress' : 'not_started',
        statusLabel: unqualifiedCount === 0 && totalCategorized > 0 ? 'All done' : unqualifiedCount > 0 ? `${unqualifiedCount} need receipts` : 'No expenses yet',
        icon: 'receipt-outline',
        color: colors.negative,
        onPress: () => navigation.navigate('QualifyTransactionList'),
      });

      // Step 5: Gifted items (conditional)
      if (profileData?.receives_gifted_items) {
        generatedSteps.push({
          id: 'track_gifted',
          title: 'Log gifted items',
          description: giftedCount > 0
            ? `${giftedCount} item${giftedCount !== 1 ? 's' : ''} logged. Keep adding any PR packages or freebies — they count as taxable income.`
            : 'Log any PR packages, gifted products, or freebies. Their retail value counts as income.',
          status: giftedCount > 0 ? 'in_progress' : 'not_started',
          statusLabel: giftedCount > 0 ? `${giftedCount} logged` : 'None logged',
          icon: 'gift-outline',
          color: colors.tagBlueText,
          onPress: () => navigation.navigate('GiftedTracker'),
        });
      }

      // Step 6: International (conditional)
      if (profileData?.has_international_income) {
        const foreignCountries = profileData.foreign_income_countries || [];
        let intlDesc = 'Declare income from overseas sources on your Self Assessment.';
        if (foreignCountries.includes('US')) {
          intlDesc += ' Submit a W-8BEN to US companies to reduce withholding tax under the UK-US treaty.';
        }
        generatedSteps.push({
          id: 'foreign_income',
          title: 'Declare foreign income',
          description: intlDesc,
          status: completed.has('foreign_income') ? 'done' : 'not_started',
          statusLabel: completed.has('foreign_income') ? 'Done' : 'Action needed',
          icon: 'globe-outline',
          color: colors.tagBlueText,
        });
      }

      // Step 7: Export records
      generatedSteps.push({
        id: 'export_records',
        title: 'Export your records',
        description: 'Download a CSV of your categorised transactions, receipts, and gifted items to share with your accountant or keep for your records.',
        status: completed.has('export_records') ? 'done' : 'not_started',
        statusLabel: completed.has('export_records') ? 'Done' : 'Not yet',
        icon: 'download-outline',
        color: colors.midGrey,
      });

      // Step 8: File return
      const filingDeadline = new Date(taxYearEnd.getFullYear() + 1, 0, 31);
      generatedSteps.push({
        id: 'file_return',
        title: 'File your Self Assessment',
        description: `Submit online at gov.uk by ${filingDeadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. You'll need your UTR number and the figures from your tax estimate.`,
        status: completed.has('file_return') ? 'done' : 'not_started',
        statusLabel: completed.has('file_return') ? 'Filed!' : `Due ${filingDeadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        icon: 'send-outline',
        color: colors.negative,
      });

      // Step 9: Pay tax
      generatedSteps.push({
        id: 'pay_tax',
        title: 'Pay your tax bill',
        description: 'Pay any tax owed by January 31st. You can pay via direct debit, bank transfer, or through your tax account on gov.uk.',
        status: completed.has('pay_tax') ? 'done' : 'not_started',
        statusLabel: completed.has('pay_tax') ? 'Paid!' : `Due ${filingDeadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
        icon: 'card-outline',
        color: colors.positive,
      });

      setSteps(generatedSteps);
    } catch (error) {
      console.error('Error loading filing guide:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = async (stepId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isCompleted = completedSteps.has(stepId);

      if (isCompleted) {
        await supabase.from('user_checklist_progress').delete()
          .eq('user_id', user.id).eq('item_id', stepId);
        setCompletedSteps(prev => {
          const next = new Set(prev);
          next.delete(stepId);
          return next;
        });
        setSteps(prev => prev.map(s =>
          s.id === stepId ? { ...s, status: 'not_started', statusLabel: 'Not done' } : s
        ));
      } else {
        await supabase.from('user_checklist_progress').upsert({
          user_id: user.id, item_id: stepId,
        });
        setCompletedSteps(prev => new Set(prev).add(stepId));
        setSteps(prev => prev.map(s =>
          s.id === stepId ? { ...s, status: 'done', statusLabel: 'Done' } : s
        ));
      }
    } catch (error) {
      console.error('Error toggling step:', error);
    }
  };

  const doneCount = steps.filter(s => s.status === 'done').length;
  const progressPercent = steps.length > 0 ? (doneCount / steps.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenLabel}>FILING GUIDE</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.gradientMid} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero heading */}
          <Text style={styles.heroHeading}>{'filing\nguide.'}</Text>

          {/* Progress header */}
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>{taxYearLabel} TAX YEAR</Text>
            <Text style={styles.progressTitle}>{doneCount} of {steps.length} steps complete</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          {/* Month coverage banner */}
          <View style={styles.monthBanner}>
            <Ionicons name="calendar-outline" size={16} color={colors.tagBlueText} />
            <Text style={styles.monthBannerText}>
              {monthsCovered === 0
                ? `No months covered yet. Upload statements covering April ${taxYearStart.getFullYear()} onwards.`
                : monthsCovered >= monthsElapsed
                  ? `All ${monthsCovered} months of the tax year covered so far.`
                  : `${monthsCovered} of ${monthsElapsed} months covered. Upload more statements to fill the gaps.`}
            </Text>
          </View>

          {/* Steps */}
          {steps.map((step, index) => {
            const isDone = step.status === 'done';
            const isInProgress = step.status === 'in_progress';
            // Steps with onPress navigate in-app; others are manual toggles
            const isAppStep = !!step.onPress;

            return (
              <TouchableOpacity
                key={step.id}
                style={[styles.stepCard, isDone && styles.stepCardDone]}
                onPress={() => {
                  if (step.onPress) {
                    step.onPress();
                  } else {
                    toggleStep(step.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.stepRow}>
                  {/* Step number / check */}
                  <View style={[
                    styles.stepCircle,
                    isDone && styles.stepCircleDone,
                    isInProgress && { borderColor: step.color },
                  ]}>
                    {isDone ? (
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    ) : (
                      <Text style={[styles.stepNumber, isInProgress && { color: step.color }]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>

                  <View style={styles.stepContent}>
                    <View style={styles.stepTitleRow}>
                      <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>{step.title}</Text>
                      <View style={[
                        styles.statusPill,
                        isDone && styles.statusPillDone,
                        isInProgress && styles.statusPillProgress,
                      ]}>
                        <Text style={[
                          styles.statusPillText,
                          isDone && styles.statusPillTextDone,
                          isInProgress && styles.statusPillTextProgress,
                        ]}>{step.statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={[styles.stepDesc, isDone && styles.stepDescDone]}>{step.description}</Text>
                    {isAppStep && !isDone && (
                      <View style={styles.stepAction}>
                        <Text style={styles.stepActionText}>Open in bopp →</Text>
                      </View>
                    )}
                    {!isAppStep && !isDone && (
                      <Text style={styles.stepToggleHint}>Tap to mark as done</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Footer */}
          <View style={styles.footer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.tagBlueText} />
            <Text style={styles.footerText}>
              This is a general guide — not tax advice. Speak to a qualified accountant for your specific situation.
            </Text>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.bodyBold,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: 48,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  progressLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  progressTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.positive,
  },
  monthBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  monthBannerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.tagBlueText,
    lineHeight: 18,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepCardDone: {
    opacity: 0.7,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepCircleDone: {
    backgroundColor: colors.positive,
    borderColor: colors.positive,
  },
  stepNumber: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.midGrey,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stepTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    flex: 1,
    marginRight: 8,
  },
  stepTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.midGrey,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
  },
  statusPillDone: {
    backgroundColor: colors.tagIncomeBg,
  },
  statusPillProgress: {
    backgroundColor: colors.tagExpenseBg,
  },
  statusPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.midGrey,
  },
  statusPillTextDone: {
    color: colors.positive,
  },
  statusPillTextProgress: {
    color: colors.gradientMid,
  },
  stepDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
    lineHeight: 18,
    marginBottom: 6,
  },
  stepDescDone: {
    color: colors.muted,
  },
  stepAction: {
    marginTop: 2,
  },
  stepActionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.gradientMid,
  },
  stepToggleHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.sm,
  },
  footerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.tagBlueText,
    lineHeight: 18,
  },
});
