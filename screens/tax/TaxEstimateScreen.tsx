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
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

const PERSONAL_ALLOWANCE = 12570;
const BASIC_RATE = 0.2;
const HIGHER_RATE = 0.4;
const HIGHER_RATE_THRESHOLD = 50270;
const NI_LOWER = 12570;
const NI_UPPER = 50270;
const NI_BASIC_RATE = 0.08;

interface TaxBreakdown {
  totalIncome: number;
  qualifiedExpenses: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  totalTaxOwed: number;
  employmentIncome: number;
  studentLoanRepayment: number;
}

interface UserProfile {
  has_other_employment: boolean;
  employment_income: number;
  student_loan_plan: string;
  monthly_income: number;
  tracking_goal: string;
}

export default function TaxEstimateScreen({ navigation }: any) {
  const [breakdown, setBreakdown] = useState<TaxBreakdown | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaxData();
  }, []);

  const loadTaxData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profileData }, { data: transactions }] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('categorized_transactions').select('amount, tax_deductible, qualified, business_percent, category_id').eq('user_id', user.id),
      ]);

      if (profileData) setProfile(profileData);

      let selfEmployedIncome = 0;
      let qualifiedExpenses = 0;

      (transactions || []).forEach(t => {
        if (t.amount < 0) {
          selfEmployedIncome += Math.abs(t.amount);
        } else if (t.tax_deductible && t.qualified) {
          qualifiedExpenses += t.amount * ((t.business_percent || 100) / 100);
        }
      });

      const employmentIncome = profileData?.has_other_employment ? (profileData.employment_income || 0) : 0;
      const totalIncome = selfEmployedIncome + employmentIncome;
      const taxableIncome = Math.max(0, totalIncome - PERSONAL_ALLOWANCE - qualifiedExpenses);

      // Income tax
      let incomeTax = 0;
      if (taxableIncome > 0) {
        const basicBand = Math.min(taxableIncome, HIGHER_RATE_THRESHOLD - PERSONAL_ALLOWANCE);
        const higherBand = Math.max(0, taxableIncome - (HIGHER_RATE_THRESHOLD - PERSONAL_ALLOWANCE));
        incomeTax = basicBand * BASIC_RATE + higherBand * HIGHER_RATE;
      }

      // NI (Class 4 on self-employed profit)
      const selfEmployedProfit = Math.max(0, selfEmployedIncome - qualifiedExpenses);
      let nationalInsurance = 0;
      if (selfEmployedProfit > NI_LOWER) {
        const niBand = Math.min(selfEmployedProfit - NI_LOWER, NI_UPPER - NI_LOWER);
        nationalInsurance = niBand * NI_BASIC_RATE;
      }

      // Student loan
      let studentLoanRepayment = 0;
      const slPlan = profileData?.student_loan_plan;
      if (slPlan && slPlan !== 'none') {
        const threshold = slPlan === 'plan1' ? 24990 : slPlan === 'plan4' ? 31395 : 27295;
        const repaymentRate = slPlan === 'postgrad' ? 0.06 : 0.09;
        if (totalIncome > threshold) {
          studentLoanRepayment = (totalIncome - threshold) * repaymentRate;
        }
      }

      setBreakdown({
        totalIncome,
        qualifiedExpenses,
        personalAllowance: PERSONAL_ALLOWANCE,
        taxableIncome,
        incomeTax,
        nationalInsurance,
        totalTaxOwed: incomeTax + nationalInsurance,
        employmentIncome,
        studentLoanRepayment,
      });
    } catch (error) {
      console.error('Error loading tax data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax estimate</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.ember} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Total owed */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total tax owed</Text>
            <Text style={styles.totalValue}>{breakdown ? fmt(breakdown.totalTaxOwed) : '—'}</Text>
            <Text style={styles.totalSub}>2025–26 tax year estimate</Text>
          </View>

          {/* Breakdown */}
          <Text style={styles.sectionLabel}>HOW WE GOT THERE</Text>

          <View style={styles.breakdownCard}>
            <Row label="Self-employed income" value={breakdown ? fmt(breakdown.totalIncome - breakdown.employmentIncome) : '—'} />
            {breakdown && breakdown.employmentIncome > 0 && (
              <Row label="Employment income (PAYE)" value={fmt(breakdown.employmentIncome)} />
            )}
            <Row label="Total income" value={breakdown ? fmt(breakdown.totalIncome) : '—'} bold />
            <Divider />
            <Row label="Personal allowance" value={breakdown ? `− ${fmt(breakdown.personalAllowance)}` : '—'} color={colors.tagGreenText} />
            <Row label="Qualified business expenses" value={breakdown ? `− ${fmt(breakdown.qualifiedExpenses)}` : '—'} color={colors.tagGreenText} />
            <Divider />
            <Row label="Taxable income" value={breakdown ? fmt(breakdown.taxableIncome) : '—'} bold />
          </View>

          <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>TAX CALCULATION</Text>

          <View style={styles.breakdownCard}>
            <Row label="Income tax (20% basic rate)" value={breakdown ? fmt(breakdown.incomeTax) : '—'} />
            <Row label="National Insurance (Class 4)" value={breakdown ? fmt(breakdown.nationalInsurance) : '—'} />
            {breakdown && breakdown.studentLoanRepayment > 0 && (
              <Row label="Student loan repayment" value={fmt(breakdown.studentLoanRepayment)} />
            )}
            <Divider />
            <Row label="Total owed to HMRC" value={breakdown ? fmt(breakdown.totalTaxOwed) : '—'} bold accent />
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color={colors.midGrey} />
            <Text style={styles.disclaimerText}>
              This is an estimate based on your transactions and profile. It does not account for all allowances or reliefs. Consult an accountant for your official return.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({ label, value, bold, color, accent }: {
  label: string; value: string; bold?: boolean; color?: string; accent?: boolean;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={[rowStyles.label, bold && rowStyles.bold]}>{label}</Text>
      <Text style={[rowStyles.value, bold && rowStyles.bold, accent && rowStyles.accent, color ? { color } : {}]}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.mist, marginVertical: 10 }} />;
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    flex: 1,
  },
  value: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'right',
  },
  bold: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  accent: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ember,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  totalCard: {
    backgroundColor: colors.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadows.md,
  },
  totalLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  totalValue: {
    fontFamily: fonts.display,
    fontSize: 52,
    color: colors.volt,
    letterSpacing: -2,
    marginBottom: 6,
  },
  totalSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.midGrey,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  breakdownCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  disclaimer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.sm,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.tagBlueText,
    lineHeight: 18,
  },
});
