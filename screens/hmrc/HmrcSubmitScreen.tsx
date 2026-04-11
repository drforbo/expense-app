import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

// Human-readable labels for HMRC expense fields
const HMRC_FIELD_LABELS: Record<string, string> = {
  adminCosts: 'Admin costs',
  advertisingCosts: 'Advertising',
  carVanTravelExpenses: 'Travel & mileage',
  premisesRunningCosts: 'Premises & insurance',
  professionalFees: 'Professional fees',
  otherExpenses: 'Other expenses',
  costOfGoods: 'Cost of goods',
  wagesAndStaffCosts: 'Wages & staff',
  maintenanceCosts: 'Maintenance',
  businessEntertainmentCosts: 'Entertainment',
  interestOnBankOtherLoans: 'Interest on loans',
  financeCharges: 'Finance charges',
  irrecoverableDebts: 'Bad debts',
  depreciation: 'Depreciation',
  paymentsToSubcontractors: 'Subcontractors',
};

const HMRC_FIELD_ICONS: Record<string, string> = {
  adminCosts: 'desktop-outline',
  advertisingCosts: 'megaphone-outline',
  carVanTravelExpenses: 'car-outline',
  premisesRunningCosts: 'home-outline',
  professionalFees: 'briefcase-outline',
  otherExpenses: 'ellipsis-horizontal-outline',
  costOfGoods: 'cube-outline',
  wagesAndStaffCosts: 'people-outline',
  maintenanceCosts: 'construct-outline',
};

interface PreviewData {
  taxYear: string;
  period: { from: string; to: string };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    transactionCount: number;
    incomeCount: number;
    expenseCount: number;
  };
  submission: {
    periodIncome: { turnover: number };
    periodExpenses: Record<string, number>;
  };
  breakdown: Record<string, { total: number; categories: Record<string, number> }>;
  canUseConsolidated: boolean;
}

export default function HmrcSubmitScreen({ navigation, route }: any) {
  const taxYear = route?.params?.taxYear || '2026-27';
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const result = await apiPost('/api/hmrc/preview-submission', { taxYear });
      setPreview(result);
    } catch (error: any) {
      console.error('Preview error:', error);
      Alert.alert('Error', 'Failed to load submission preview. Make sure you have categorised transactions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      'Submit to HMRC',
      'This will submit your cumulative income and expenses for the current tax year to HMRC. This is a real submission that updates your MTD record.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);
              const result = await apiPost('/api/hmrc/submit-update', { taxYear });

              if (result.success) {
                setSubmitted(true);
              }
            } catch (error: any) {
              console.error('Submit error:', error);
              Alert.alert('Submission Failed', error.message || 'Failed to submit to HMRC. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const fmt = (n: number) => `\u00A3${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Building your submission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.positive} />
          </View>
          <Text style={styles.successTitle}>Submitted</Text>
          <Text style={styles.successText}>
            Your quarterly update has been sent to HMRC. You can view your obligations to confirm it was received.
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <LinearGradient
              colors={gradients.hero as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Back to HMRC</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expenseEntries = preview
    ? Object.entries(preview.submission.periodExpenses).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'\u2190'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenLabel}>SUBMIT</Text>
        <Text style={styles.heroHeading}>{'quarterly\nupdate.'}</Text>

        {preview && (
          <>
            {/* Summary card */}
            <LinearGradient
              colors={gradients.hero as unknown as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryLabel}>TAX YEAR {taxYear.replace('-', '/')}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryColumn}>
                  <Text style={styles.summaryValue}>{fmt(preview.summary.totalIncome)}</Text>
                  <Text style={styles.summaryCaption}>income</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryColumn}>
                  <Text style={styles.summaryValue}>{fmt(preview.summary.totalExpenses)}</Text>
                  <Text style={styles.summaryCaption}>expenses</Text>
                </View>
              </View>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Net profit</Text>
                <Text style={styles.profitValue}>{fmt(preview.summary.netProfit)}</Text>
              </View>
              <Text style={styles.summaryNote}>
                Based on {preview.summary.transactionCount} categorised transactions
              </Text>
            </LinearGradient>

            {/* Income section */}
            <Text style={styles.sectionLabel}>INCOME</Text>
            <View style={styles.card}>
              <View style={styles.fieldRow}>
                <View style={[styles.fieldIcon, { backgroundColor: colors.tagIncomeBg }]}>
                  <Ionicons name="trending-up-outline" size={18} color={colors.positive} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Trading turnover</Text>
                  <Text style={styles.fieldSub}>{preview.summary.incomeCount} transactions</Text>
                </View>
                <Text style={styles.fieldAmount}>{fmt(preview.summary.totalIncome)}</Text>
              </View>
            </View>

            {/* Expenses breakdown */}
            <Text style={styles.sectionLabel}>EXPENSES BY HMRC CATEGORY</Text>
            <View style={styles.card}>
              {expenseEntries.map(([field, amount], i) => (
                <View key={field}>
                  {i > 0 && <View style={styles.fieldDivider} />}
                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldIcon, { backgroundColor: colors.tagExpenseBg }]}>
                      <Ionicons
                        name={(HMRC_FIELD_ICONS[field] || 'receipt-outline') as any}
                        size={18}
                        color={colors.tagExpenseText}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>{HMRC_FIELD_LABELS[field] || field}</Text>
                      {preview.breakdown[field] && (
                        <Text style={styles.fieldSub} numberOfLines={1}>
                          {Object.keys(preview.breakdown[field].categories).join(', ')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.fieldAmount}>{fmt(amount)}</Text>
                  </View>
                </View>
              ))}

              {expenseEntries.length === 0 && (
                <Text style={styles.emptyText}>No expenses to report for this period.</Text>
              )}

              <View style={styles.fieldDivider} />
              <View style={styles.fieldRow}>
                <Text style={styles.totalLabel}>Total expenses</Text>
                <Text style={styles.totalAmount}>{fmt(preview.summary.totalExpenses)}</Text>
              </View>
            </View>

            {/* Consolidated note */}
            {preview.canUseConsolidated && (
              <View style={styles.noteCard}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.noteText}>
                  Your turnover is under {'\u00A3'}90,000 so you could use a single consolidated expenses figure instead. Bopp submits the full breakdown for accuracy.
                </Text>
              </View>
            )}

            {/* Disclaimer */}
            <View style={styles.noteCard}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
              <Text style={[styles.noteText, { color: colors.warning }]}>
                This is a cumulative year-to-date submission. It replaces any previous quarterly update for this tax year.
              </Text>
            </View>

            {/* Submit CTA */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={submitting}
              style={{ marginTop: spacing.lg }}
            >
              <LinearGradient
                colors={gradients.hero as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.surfaceLowest} />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color={colors.surfaceLowest} />
                    <Text style={styles.ctaText}>Submit to HMRC</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.onSurface,
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    marginTop: -1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
  },
  screenLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    marginBottom: spacing.xs,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.onSurface,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.onSurfaceMuted,
  },
  // Summary card
  summaryCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  summaryLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryColumn: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  summaryValue: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.surfaceLowest,
    letterSpacing: -1,
  },
  summaryCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  profitLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  profitValue: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.surfaceLowest,
  },
  summaryNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  // Section
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  // Card
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  fieldSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceMuted,
    marginTop: 1,
  },
  fieldAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  totalAmount: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onSurface,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceFaint,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  // Note card
  noteCard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.surfaceLowest,
  },
  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.tagIncomeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  successText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
});
