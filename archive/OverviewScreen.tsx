import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { API_URL } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface CategoryBreakdown {
  category_name: string;
  total_amount: number;
  transaction_count: number;
  transactions?: TransactionDetail[];
}

interface TransactionDetail {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  business_percent: number;
  qualified: boolean;
}

interface GiftedItem {
  id: string;
  item_name: string;
  received_from?: string;
  rrp: number;
  received_date: string;
}

interface FinancialSummary {
  estimatedTaxOwed: number;
  runningTaxOwed: number;
  totalIncome: number;
  businessIncome: number;
  personalIncome: number;
  giftedItemsTotal: number;
  giftedItemsCount: number;
  giftedItems: GiftedItem[];
  totalExpenses: number;
  businessExpenses: number;
  personalExpenses: number;
  unqualifiedExpenses: number;
  unqualifiedCount: number;
  categoryBreakdown: CategoryBreakdown[];
  incomeCategoryBreakdown: CategoryBreakdown[];
  taxYear: string;
  hasEnoughData: boolean;
  monthsOfData: number;
}

interface UserProfile {
  tracking_goal: string;
  profile_completed: boolean;
  has_other_employment: boolean;
  employment_income: number;
  employment_is_paye: boolean;
  student_loan_plan: string;
  monthly_income: number;
  tax_region: string;
}

// Check if tax profile is complete for showing estimates
// Uses profile_completed flag - set when user explicitly confirms profile in Profile screen
const calculateTaxProfileCompleteness = (profile: UserProfile | null): { percentage: number; missingFields: string[]; isComplete: boolean } => {
  if (!profile) return { percentage: 0, missingFields: ['Profile not loaded'], isComplete: false };

  // Primary check: has user explicitly completed their profile?
  // This flag is only set when user saves from the Profile screen
  if (profile.profile_completed) {
    return { percentage: 100, missingFields: [], isComplete: true };
  }

  // Profile not completed - they need to review and confirm in Profile screen
  const missingFields = [
    'Review and confirm your tax settings in Profile',
  ];

  // Show 75% - they've done onboarding but haven't confirmed profile
  // This makes it clear there's one more step
  return {
    percentage: 75,
    missingFields: missingFields,
    isComplete: false,
  };
};

export default function OverviewScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    estimatedTaxOwed: 0,
    runningTaxOwed: 0,
    totalIncome: 0,
    businessIncome: 0,
    personalIncome: 0,
    giftedItemsTotal: 0,
    giftedItemsCount: 0,
    giftedItems: [],
    totalExpenses: 0,
    businessExpenses: 0,
    personalExpenses: 0,
    unqualifiedExpenses: 0,
    unqualifiedCount: 0,
    categoryBreakdown: [],
    incomeCategoryBreakdown: [],
    taxYear: '2024/25',
    hasEnoughData: false,
    monthsOfData: 0,
  });
  const [showEstimateInfo, setShowEstimateInfo] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<{
    title: string;
    type: 'expense' | 'income' | 'gifted';
    transactions?: TransactionDetail[];
    giftedItems?: GiftedItem[];
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [pendingExportDates, setPendingExportDates] = useState<{ start?: string; end?: string }>({});

  useEffect(() => {
    fetchFinancialSummary();
    fetchLastExportDate();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFinancialSummary();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchLastExportDate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${API_URL}/api/get_last_export_date`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
        },
        body: JSON.stringify({ user_id: user.id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) return;

      const data = await response.json();
      setLastExportDate(data.last_export_date);
    } catch (error) {
      console.warn('Failed to fetch last export date');
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current tax year dates (April 6 to April 5)
      const now = new Date();
      const currentYear = now.getFullYear();
      const taxYearStart = now.getMonth() >= 3 && now.getDate() >= 6
        ? new Date(currentYear, 3, 6)
        : new Date(currentYear - 1, 3, 6);
      const taxYearEnd = new Date(taxYearStart.getFullYear() + 1, 3, 5);

      const taxYearLabel = `${taxYearStart.getFullYear()}/${(taxYearEnd.getFullYear()).toString().slice(-2)}`;

      // Fetch all categorized transactions for this tax year
      const { data: transactions, error } = await supabase
        .from('categorized_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', taxYearStart.toISOString().split('T')[0])
        .lte('transaction_date', taxYearEnd.toISOString().split('T')[0]);

      if (error) throw error;

      // Fetch gifted items for this tax year
      const { data: giftedItems } = await supabase
        .from('gifted_items')
        .select('*')
        .eq('user_id', user.id)
        .gte('received_date', taxYearStart.toISOString().split('T')[0])
        .lte('received_date', taxYearEnd.toISOString().split('T')[0]);

      // Calculate gifted items total using RRP (Recommended Retail Price) - this is taxable
      let giftedItemsTotal = 0;
      const giftedItemsList: GiftedItem[] = (giftedItems || []).map(item => {
        giftedItemsTotal += item.rrp || 0;
        return {
          id: item.id,
          item_name: item.item_name,
          received_from: item.received_from,
          rrp: item.rrp || 0,
          received_date: item.received_date,
        };
      });

      // Calculate totals - separate income from expenses
      let businessExpenses = 0;
      let personalExpenses = 0;
      let businessIncome = 0;
      let personalIncome = 0;
      let unqualifiedExpenses = 0;
      let unqualifiedCount = 0;
      const expenseCategoryMap = new Map<string, { total: number; count: number; transactions: TransactionDetail[] }>();
      const incomeCategoryMap = new Map<string, { total: number; count: number; transactions: TransactionDetail[] }>();

      // Categories that are NOT self-employment income (shouldn't count towards taxable business income)
      const nonBusinessIncomeCategories = ['Personal Income', 'Employment Income'];

      transactions?.forEach((t) => {
        const amount = Math.abs(t.amount);
        const isIncome = t.transaction_type === 'income'; // Use explicit transaction_type field
        const businessAmount = amount * (t.business_percent / 100);
        const personalAmount = amount - businessAmount;

        const txDetail: TransactionDetail = {
          id: t.id,
          merchant_name: t.merchant_name,
          amount: t.amount,
          transaction_date: t.transaction_date,
          business_percent: t.business_percent,
          qualified: t.qualified || false,
        };

        if (isIncome) {
          // Check if this is non-business income (PAYE salary or personal transfers)
          const isNonBusinessIncome = nonBusinessIncomeCategories.includes(t.category_name);

          if (isNonBusinessIncome) {
            // PAYE or personal income - don't count as self-employment business income
            personalIncome += amount;
          } else {
            // This is self-employment/business income
            businessIncome += businessAmount;
            personalIncome += personalAmount;
          }

          // Track by category for income breakdown (include all for visibility)
          if (amount > 0 && t.category_name) {
            const existing = incomeCategoryMap.get(t.category_name) || { total: 0, count: 0, transactions: [] };
            existing.transactions.push(txDetail);
            incomeCategoryMap.set(t.category_name, {
              total: existing.total + (isNonBusinessIncome ? amount : businessAmount),
              count: existing.count + 1,
              transactions: existing.transactions,
            });
          }
        } else {
          // This is an expense
          businessExpenses += businessAmount;
          personalExpenses += personalAmount;

          // Track unqualified business expenses (no receipt or explanation)
          if (businessAmount > 0 && !t.qualified) {
            unqualifiedExpenses += businessAmount;
            unqualifiedCount += 1;
          }

          // Track by category for business expenses
          if (businessAmount > 0 && t.category_name) {
            const existing = expenseCategoryMap.get(t.category_name) || { total: 0, count: 0, transactions: [] };
            existing.transactions.push(txDetail);
            expenseCategoryMap.set(t.category_name, {
              total: existing.total + businessAmount,
              count: existing.count + 1,
              transactions: existing.transactions,
            });
          }
        }
      });

      // Convert expense categories to array and sort
      const categoryBreakdown: CategoryBreakdown[] = Array.from(expenseCategoryMap.entries())
        .map(([name, data]) => ({
          category_name: name,
          total_amount: data.total,
          transaction_count: data.count,
          transactions: data.transactions,
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Convert income categories to array and sort
      const incomeCategoryBreakdown: CategoryBreakdown[] = Array.from(incomeCategoryMap.entries())
        .map(([name, data]) => ({
          category_name: name,
          total_amount: data.total,
          transaction_count: data.count,
          transactions: data.transactions,
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Fetch user profile with all tax-relevant fields
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('monthly_income, tracking_goal, profile_completed, has_other_employment, employment_income, employment_is_paye, student_loan_plan, tax_region')
        .eq('user_id', user.id)
        .single();

      console.log('Profile data:', JSON.stringify(profile, null, 2));
      console.log('profile_completed value:', profile?.profile_completed);
      setUserProfile(profile);

      // Calculate months of data based on transaction dates
      const transactionDates = transactions?.map(t => new Date(t.transaction_date)) || [];
      let monthsOfData = 0;
      if (transactionDates.length > 0) {
        const earliestDate = new Date(Math.min(...transactionDates.map(d => d.getTime())));
        const now = new Date();
        monthsOfData = Math.max(1, Math.ceil((now.getTime() - earliestDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
      }
      const hasEnoughData = monthsOfData >= 3;

      // Tax calculation helper function - CONSERVATIVE estimates (intentionally higher)
      const calculateTax = (taxableProfit: number, profile: any) => {
        let tax = 0;
        const personalAllowance = 12570;
        const basicRateLimit = 50270;
        const taxRegion = profile?.tax_region || 'england';

        if (profile?.tracking_goal === 'limited_company') {
          return 0;
        }

        const employmentIncome = profile?.has_other_employment ? (profile?.employment_income || 0) : 0;
        const totalIncome = taxableProfit + employmentIncome;

        let adjustedAllowance = personalAllowance;
        if (totalIncome > 100000) {
          adjustedAllowance = Math.max(0, personalAllowance - ((totalIncome - 100000) / 2));
        }

        // Scottish tax rates are higher - use these for Scotland
        const isScotland = taxRegion === 'scotland';

        if (profile?.has_other_employment && employmentIncome > 0) {
          if (employmentIncome >= basicRateLimit) {
            tax = taxableProfit * (isScotland ? 0.42 : 0.4); // Scottish higher rate is 42%
          } else if (employmentIncome > personalAllowance) {
            const roomInBasicBand = basicRateLimit - employmentIncome;
            if (taxableProfit <= roomInBasicBand) {
              tax = taxableProfit * (isScotland ? 0.21 : 0.2); // Scottish basic rate is 21%
            } else {
              tax = (roomInBasicBand * (isScotland ? 0.21 : 0.2)) + ((taxableProfit - roomInBasicBand) * (isScotland ? 0.42 : 0.4));
            }
          } else {
            const unusedAllowance = personalAllowance - employmentIncome;
            const taxableAfterAllowance = Math.max(0, taxableProfit - unusedAllowance);
            if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
              tax = taxableAfterAllowance * (isScotland ? 0.21 : 0.2);
            } else {
              const basicRatePortion = basicRateLimit - personalAllowance;
              const higherRatePortion = taxableAfterAllowance - basicRatePortion;
              tax = (basicRatePortion * (isScotland ? 0.21 : 0.2)) + (higherRatePortion * (isScotland ? 0.42 : 0.4));
            }
          }
        } else {
          if (taxableProfit > adjustedAllowance) {
            const taxableAfterAllowance = taxableProfit - adjustedAllowance;
            if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
              tax = taxableAfterAllowance * (isScotland ? 0.21 : 0.2);
            } else {
              const basicRatePortion = basicRateLimit - personalAllowance;
              const higherRatePortion = taxableAfterAllowance - basicRatePortion;
              tax = (basicRatePortion * (isScotland ? 0.21 : 0.2)) + (higherRatePortion * (isScotland ? 0.42 : 0.4));
            }
          }
        }

        // Class 4 NI
        if (taxableProfit > personalAllowance) {
          const niTaxable = Math.min(taxableProfit, basicRateLimit) - personalAllowance;
          tax += niTaxable * 0.09;
          if (taxableProfit > basicRateLimit) {
            tax += (taxableProfit - basicRateLimit) * 0.02;
          }
        }

        // Student loan - includes Plan 5
        if (profile?.student_loan_plan && profile.student_loan_plan !== 'none') {
          const totalIncomeForSL = taxableProfit + employmentIncome;
          let slThreshold = 0;
          let slRate = 0.09;

          switch (profile.student_loan_plan) {
            case 'plan1': slThreshold = 22015; break;
            case 'plan2': slThreshold = 27295; break;
            case 'plan4': slThreshold = 27660; break;
            case 'plan5': slThreshold = 25000; break; // Plan 5 (2023+)
            case 'postgrad': slThreshold = 21000; slRate = 0.06; break;
          }

          if (totalIncomeForSL > slThreshold) {
            if (!profile?.has_other_employment) {
              tax += (totalIncomeForSL - slThreshold) * slRate;
            } else if (employmentIncome < slThreshold) {
              tax += (totalIncomeForSL - slThreshold) * slRate;
            }
          }
        }

        // Apply 5% conservative buffer - ensures users save enough
        // Better to overestimate than leave them short at tax time
        tax = tax * 1.05;

        return tax;
      };

      // ESTIMATED TAX: Based on onboarding monthly income projection
      const monthlyIncome = profile?.monthly_income || 0;
      const estimatedYearlyIncome = monthlyIncome * 12;
      const estimatedTaxableProfit = Math.max(0, estimatedYearlyIncome);
      const estimatedTax = calculateTax(estimatedTaxableProfit, profile);

      // RUNNING TAX: Based on actual tracked transactions + gifted items
      const actualTaxableIncome = businessIncome + giftedItemsTotal;
      const runningTaxableProfit = Math.max(0, actualTaxableIncome - businessExpenses);
      const runningTax = calculateTax(runningTaxableProfit, profile);

      setSummary({
        estimatedTaxOwed: estimatedTax,
        runningTaxOwed: runningTax,
        totalIncome: businessIncome + personalIncome,
        businessIncome,
        personalIncome,
        giftedItemsTotal,
        giftedItemsCount: giftedItemsList.length,
        giftedItems: giftedItemsList,
        totalExpenses: businessExpenses + personalExpenses,
        businessExpenses,
        personalExpenses,
        unqualifiedExpenses,
        unqualifiedCount,
        categoryBreakdown,
        incomeCategoryBreakdown,
        taxYear: taxYearLabel,
        hasEnoughData,
        monthsOfData,
      });
    } catch (error) {
      console.error('Error fetching financial summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTransactions = async (selectedStartDate?: string, selectedEndDate?: string) => {
    try {
      setExporting(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to export transactions');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const fileUri = `${FileSystem.cacheDirectory}bopp_export.zip`;
      const body: Record<string, string> = { user_id: user.id };
      if (selectedStartDate) body.start_date = selectedStartDate;
      if (selectedEndDate) body.end_date = selectedEndDate;

      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/export_bundle`,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          body: JSON.stringify(body),
        }
      );

      if (result.status === 404) {
        Alert.alert('Nothing to export', 'Upload some bank statements first, then you can export your transactions.');
        return;
      }
      if (result.status !== 200) {
        throw new Error('Export failed');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/zip',
          dialogTitle: 'Export transactions & receipts',
          UTI: 'public.zip-archive',
        });
      } else {
        Alert.alert('Export ready', 'File saved but sharing is not available on this device.');
      }

      fetchLastExportDate();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const openDatePicker = () => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 3); // Default to last 3 months

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
    setShowDatePicker(true);
  };

  const checkDisclaimerAndExport = async (selectedStartDate: string, selectedEndDate: string) => {
    try {
      const lastDisclaimerDate = await AsyncStorage.getItem('export_disclaimer_date');
      const today = new Date().toISOString().split('T')[0];

      if (lastDisclaimerDate === today) {
        // Already shown today, proceed directly
        handleExportTransactions(selectedStartDate, selectedEndDate);
      } else {
        // Show disclaimer first
        setPendingExportDates({ start: selectedStartDate, end: selectedEndDate });
        setShowDisclaimerModal(true);
      }
    } catch (error) {
      // If error reading storage, show disclaimer to be safe
      setPendingExportDates({ start: selectedStartDate, end: selectedEndDate });
      setShowDisclaimerModal(true);
    }
  };

  const acceptDisclaimerAndExport = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('export_disclaimer_date', today);
    } catch (error) {
      console.warn('Failed to save disclaimer date');
    }
    setShowDisclaimerModal(false);
    handleExportTransactions(pendingExportDates.start, pendingExportDates.end);
  };

  const confirmExport = () => {
    setShowDatePicker(false);
    checkDisclaimerAndExport(startDate, endDate);
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLastExportDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const totalExpenses = summary.businessExpenses + summary.personalExpenses;
  const businessPercent = totalExpenses > 0 ? Math.round((summary.businessExpenses / totalExpenses) * 100) : 0;
  const personalPercent = totalExpenses > 0 ? 100 - businessPercent : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenLabel}>OVERVIEW</Text>
            <Text style={styles.subtitle}>Tax Year {summary.taxYear}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchFinancialSummary}
          >
            <Ionicons name="refresh" size={24} color={colors.midGrey} />
          </TouchableOpacity>
        </View>

        {/* Hero heading */}
        <Text style={styles.heroHeading}>{'your\noverview.'}</Text>

        {/* Tax Estimate Card - Different for Limited Company */}
        {userProfile?.tracking_goal === 'limited_company' ? (
          <View style={styles.limitedCompanyCard}>
            <View style={styles.taxHeader}>
              <View style={[styles.taxIconContainer, { backgroundColor: colors.surface }]}>
                <Ionicons name="business" size={24} color={colors.ink} />
              </View>
              <Text style={styles.taxLabel}>Limited Company</Text>
            </View>
            <Text style={styles.limitedCompanyTitle}>Tax estimates coming soon!</Text>
            <Text style={styles.limitedCompanyText}>
              We're working on bringing corporation tax and director salary calculations to bopp. In the meantime, you can still track and categorize all your business expenses.
            </Text>
            <View style={styles.comingSoonBadge}>
              <Ionicons name="rocket" size={14} color={colors.white} />
              <Text style={styles.comingSoonText}>Coming soon to bopp</Text>
            </View>
          </View>
        ) : (() => {
          const profileCompleteness = calculateTaxProfileCompleteness(userProfile);

          return profileCompleteness.isComplete ? (
            <>
              {/* Estimated Tax Card - Based on Onboarding */}
              <View style={styles.taxCard}>
                <View style={styles.taxHeader}>
                  <View style={styles.taxIconContainer}>
                    <Ionicons name="calculator" size={24} color={colors.gradientMid} />
                  </View>
                  <Text style={styles.taxLabel}>
                    {userProfile?.has_other_employment && userProfile?.employment_is_paye
                      ? 'Estimated Additional Tax'
                      : 'Estimated Annual Tax'}
                  </Text>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => setShowEstimateInfo(true)}
                  >
                    <Ionicons name="information-circle-outline" size={20} color={colors.midGrey} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.taxAmount}>{formatCurrency(summary.estimatedTaxOwed)}</Text>
                <Text style={styles.taxNote}>
                  Based on your expected monthly income of {formatCurrency(userProfile?.monthly_income || 0)}
                </Text>
                {userProfile?.has_other_employment && userProfile?.employment_is_paye && (
                  <View style={styles.payeInfoContainer}>
                    <View style={styles.payeInfoRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.positive} />
                      <Text style={styles.payeInfoText}>
                        Your PAYE job already handles tax on your £{((userProfile.employment_income || 0) / 1000).toFixed(0)}k salary
                      </Text>
                    </View>
                    <Text style={styles.payeInfoDetail}>
                      This estimate is only for the additional tax you'll owe on your side hustle profits via Self Assessment
                    </Text>
                  </View>
                )}
                {userProfile?.has_other_employment && !userProfile?.employment_is_paye && (
                  <View style={styles.taxInfoRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.gradientMid} />
                    <Text style={styles.taxInfoText}>
                      Includes tax on contractor income (£{((userProfile.employment_income || 0) / 1000).toFixed(0)}k/yr) + side hustle
                    </Text>
                  </View>
                )}
              </View>

              {/* Running Total Tax Card - Based on Actual Transactions */}
              <View style={styles.runningTaxCard}>
                <View style={styles.taxHeader}>
                  <View style={[styles.taxIconContainer, { backgroundColor: colors.tagIncomeBg }]}>
                    <Ionicons name="trending-up" size={24} color={colors.positive} />
                  </View>
                  <View style={styles.runningTaxLabelContainer}>
                    <Text style={styles.taxLabel}>Tax on Tracked Income</Text>
                    <Text style={styles.runningTaxSubLabel}>
                      {summary.monthsOfData > 0 ? `${summary.monthsOfData} month${summary.monthsOfData !== 1 ? 's' : ''} of data` : 'No data yet'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.taxAmount, { color: colors.positive }]}>{formatCurrency(summary.runningTaxOwed)}</Text>
                <Text style={styles.taxNote}>
                  Tax Year {summary.taxYear} • Based on {formatCurrency(Math.max(0, (summary.businessIncome + summary.giftedItemsTotal) - summary.businessExpenses))} taxable profit
                </Text>
                <View style={styles.taxBreakdownRow}>
                  <Text style={styles.taxBreakdownItem}>
                    Income: {formatCurrency(summary.businessIncome + summary.giftedItemsTotal)}
                  </Text>
                  <Text style={styles.taxBreakdownItem}>
                    Expenses: {formatCurrency(summary.businessExpenses)}
                  </Text>
                </View>
                {(summary.businessIncome + summary.giftedItemsTotal) === 0 && (
                  <View style={styles.noDataHint}>
                    <Ionicons name="bulb-outline" size={14} color={colors.midGrey} />
                    <Text style={styles.noDataHintText}>
                      Start categorizing income transactions to see your actual tax liability
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.disclaimerContainer}>
                <Ionicons name="information-circle-outline" size={14} color={colors.midGrey} />
                <Text style={styles.disclaimerText}>
                  These are estimates only, not financial advice. Consult an accountant for accurate figures.
                </Text>
              </View>
            </>
          ) : (
            /* Profile Incomplete - Show completion card instead of estimates */
            <TouchableOpacity
              style={styles.profileIncompleteCard}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.8}
            >
              <View style={styles.profileIncompleteHeader}>
                <View style={styles.profileIncompleteIconContainer}>
                  <Ionicons name="calculator-outline" size={28} color={colors.gradientMid} />
                </View>
                <View style={styles.profileIncompleteHeaderText}>
                  <Text style={styles.profileIncompleteTitle}>Complete your profile</Text>
                  <Text style={styles.profileIncompleteSubtitle}>to see your tax estimate</Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.profileProgressContainer}>
                <View style={styles.profileProgressHeader}>
                  <Text style={styles.profileProgressLabel}>Profile completeness</Text>
                  <Text style={styles.profileProgressPercentage}>{profileCompleteness.percentage}%</Text>
                </View>
                <View style={styles.profileProgressBarBg}>
                  <View
                    style={[
                      styles.profileProgressBarFill,
                      { width: `${profileCompleteness.percentage}%` }
                    ]}
                  />
                </View>
              </View>

              {/* Missing fields */}
              <View style={styles.missingFieldsContainer}>
                <Text style={styles.missingFieldsLabel}>Still needed:</Text>
                {profileCompleteness.missingFields.map((field, index) => (
                  <View key={index} style={styles.missingFieldItem}>
                    <Ionicons name="ellipse-outline" size={8} color={colors.midGrey} />
                    <Text style={styles.missingFieldText}>{field}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.profileIncompleteButton} activeOpacity={0.8}>
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.profileIncompleteBtnGradient}
                >
                  <Text style={styles.profileIncompleteButtonText}>Complete Profile</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })()}

        {/* Income Section - Always shown */}
        <Text style={styles.sectionTitle}>INCOME</Text>

        {/* Business Income Card */}
        <TouchableOpacity
          style={styles.incomeCard}
          onPress={() => {
            if (summary.incomeCategoryBreakdown.length > 0) {
              const allIncomeTransactions = summary.incomeCategoryBreakdown.flatMap(c => c.transactions || []);
              setSelectedBreakdown({
                title: 'Business Income',
                type: 'income',
                transactions: allIncomeTransactions,
              });
              setShowBreakdownModal(true);
            }
          }}
          disabled={summary.businessIncome === 0}
        >
          <View style={styles.incomeHeader}>
            <View style={styles.incomeIconContainer}>
              <Ionicons name="cash-outline" size={24} color={colors.positive} />
            </View>
            <View style={styles.incomeInfo}>
              <Text style={styles.incomeLabel}>Business Income</Text>
              <Text style={styles.incomeAmount}>{formatCurrency(summary.businessIncome)}</Text>
            </View>
            {summary.businessIncome > 0 && (
              <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
            )}
          </View>
          {summary.businessIncome === 0 && (
            <View style={styles.emptyIncomeMessage}>
              <Text style={styles.emptyIncomeSubtext}>Categorize income transactions to see them here</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Gifted Items Card - Always shown separately */}
        <TouchableOpacity
          style={styles.giftedItemsCard}
          onPress={() => {
            if (summary.giftedItemsCount > 0) {
              setSelectedBreakdown({
                title: 'Gifted Items',
                type: 'gifted',
                giftedItems: summary.giftedItems,
              });
              setShowBreakdownModal(true);
            } else {
              navigation.navigate('GiftedTracker');
            }
          }}
        >
          <View style={styles.incomeHeader}>
            <View style={[styles.incomeIconContainer, { backgroundColor: colors.tagExpenseBg }]}>
              <Ionicons name="gift-outline" size={24} color={colors.gradientMid} />
            </View>
            <View style={styles.incomeInfo}>
              <Text style={styles.incomeLabel}>Gifted Items</Text>
              <Text style={[styles.incomeAmount, { color: colors.gradientMid }]}>{formatCurrency(summary.giftedItemsTotal)}</Text>
              {summary.giftedItemsCount > 0 && (
                <Text style={styles.giftedItemsCount}>{summary.giftedItemsCount} item{summary.giftedItemsCount !== 1 ? 's' : ''} tracked</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
          </View>
          {summary.giftedItemsCount === 0 && (
            <View style={styles.emptyIncomeMessage}>
              <Text style={styles.emptyIncomeSubtext}>Tap to track gifted items (PR packages, etc.)</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Total Taxable Income Summary */}
        <View style={styles.totalIncomeRow}>
          <Text style={styles.totalIncomeLabel}>Total Taxable Income</Text>
          <Text style={styles.totalIncomeAmount}>{formatCurrency(summary.businessIncome + summary.giftedItemsTotal)}</Text>
        </View>

        {/* Income by Category */}
        {summary.incomeCategoryBreakdown.length > 0 && (
          <View style={styles.categoryList}>
            <Text style={styles.categoryListTitle}>Income by Category</Text>
            {summary.incomeCategoryBreakdown.map((category, index) => {
              const maxAmount = summary.incomeCategoryBreakdown[0]?.total_amount || 1;
              const barWidth = (category.total_amount / maxAmount) * 100;

              return (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryItem}
                  onPress={() => {
                    setSelectedBreakdown({
                      title: category.category_name,
                      type: 'income',
                      transactions: category.transactions,
                    });
                    setShowBreakdownModal(true);
                  }}
                >
                  <View style={styles.categoryHeaderRow}>
                    <Text style={styles.categoryName}>{category.category_name}</Text>
                    <View style={styles.categoryHeaderRight}>
                      <Text style={[styles.categoryAmount, { color: colors.positive }]}>{formatCurrency(category.total_amount)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
                    </View>
                  </View>
                  <View style={[styles.categoryBarContainer, { backgroundColor: colors.tagIncomeBg }]}>
                    <View style={[styles.categoryBar, { width: `${barWidth}%`, backgroundColor: colors.positive }]} />
                  </View>
                  <Text style={styles.categoryCount}>
                    {category.transaction_count} transaction{category.transaction_count !== 1 ? 's' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Expenses Split */}
        <Text style={styles.sectionTitle}>EXPENSES</Text>
        <View style={styles.expensesRow}>
          <View style={[styles.expenseCard, styles.businessCard]}>
            <View style={styles.expenseIconContainer}>
              <Ionicons name="briefcase" size={20} color={colors.ink} />
            </View>
            <Text style={styles.expenseLabel}>Business</Text>
            <Text style={styles.expenseAmount}>{formatCurrency(summary.businessExpenses)}</Text>
            <Text style={styles.expensePercent}>{businessPercent}% of total</Text>
          </View>

          <View style={[styles.expenseCard, styles.personalCard]}>
            <View style={[styles.expenseIconContainer, styles.personalIcon]}>
              <Ionicons name="person" size={20} color={colors.midGrey} />
            </View>
            <Text style={styles.expenseLabel}>Personal</Text>
            <Text style={styles.expenseAmount}>{formatCurrency(summary.personalExpenses)}</Text>
            <Text style={styles.expensePercent}>{personalPercent}% of total</Text>
          </View>
        </View>

        {/* Unqualified Expenses */}
        {summary.unqualifiedExpenses > 0 && (
          <TouchableOpacity
            style={styles.unqualifiedCard}
            onPress={() => navigation.navigate('QualifyTransactionList')}
          >
            <View style={styles.unqualifiedHeader}>
              <View style={styles.unqualifiedIconContainer}>
                <Ionicons name="document-text-outline" size={24} color={colors.gradientMid} />
              </View>
              <View style={styles.unqualifiedInfo}>
                <Text style={styles.unqualifiedLabel}>Needs Evidence</Text>
                <Text style={styles.unqualifiedAmount}>{formatCurrency(summary.unqualifiedExpenses)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
            </View>
            <Text style={styles.unqualifiedDescription}>
              {summary.unqualifiedCount} expense{summary.unqualifiedCount !== 1 ? 's' : ''} need receipts to be HMRC-ready
            </Text>
            <View style={styles.unqualifiedAction}>
              <Text style={styles.unqualifiedActionText}>Add receipts & explanations</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Category Breakdown */}
        {summary.categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>BUSINESS EXPENSES BY CATEGORY</Text>
            <View style={styles.categoryList}>
              {summary.categoryBreakdown.map((category, index) => {
                const maxAmount = summary.categoryBreakdown[0]?.total_amount || 1;
                const barWidth = (category.total_amount / maxAmount) * 100;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryItem}
                    onPress={() => {
                      setSelectedBreakdown({
                        title: category.category_name,
                        type: 'expense',
                        transactions: category.transactions,
                      });
                      setShowBreakdownModal(true);
                    }}
                  >
                    <View style={styles.categoryHeaderRow}>
                      <Text style={styles.categoryName}>{category.category_name}</Text>
                      <View style={styles.categoryHeaderRight}>
                        <Text style={styles.categoryAmount}>{formatCurrency(category.total_amount)}</Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.midGrey} />
                      </View>
                    </View>
                    <View style={styles.categoryBarContainer}>
                      <View style={[styles.categoryBar, { width: `${barWidth}%` }]} />
                    </View>
                    <Text style={styles.categoryCount}>
                      {category.transaction_count} transaction{category.transaction_count !== 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Export Button - Full Width */}
        <TouchableOpacity
          style={styles.exportButton}
          onPress={openDatePicker}
          disabled={exporting}
        >
          <View style={styles.exportButtonContent}>
            <View style={[styles.actionIcon, { backgroundColor: colors.tagExpenseBg }]}>
              {exporting ? (
                <ActivityIndicator size={24} color={colors.gradientMid} />
              ) : (
                <Ionicons name="download" size={24} color={colors.gradientMid} />
              )}
            </View>
            <View style={styles.exportButtonText}>
              <Text style={styles.actionTitle}>Export Transactions</Text>
              <Text style={styles.actionSubtitle}>Last export: {formatLastExportDate(lastExportDate)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
        </TouchableOpacity>

      </ScrollView>

      {/* Date Range Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            <Text style={styles.modalSubtitle}>Choose the period to export</Text>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={confirmExport}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.confirmButtonText}>Export</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Export Disclaimer Modal */}
      <Modal
        visible={showDisclaimerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDisclaimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.disclaimerHeader}>
              <Ionicons name="alert-circle" size={32} color={colors.gradientMid} />
            </View>
            <Text style={styles.modalTitle}>Important Disclaimer</Text>
            <Text style={styles.disclaimerBody}>
              The data you are about to export is provided for informational purposes only and should not be considered as professional tax, accounting, or financial advice.
            </Text>
            <Text style={styles.disclaimerBody}>
              Tax estimates shown in the app are intentionally conservative (higher than may be owed) to ensure you save enough. Your actual tax bill may be lower.
            </Text>
            <Text style={styles.disclaimerBody}>
              You are solely responsible for verifying all information and consulting with a qualified accountant or tax professional before submitting any tax returns.
            </Text>
            <Text style={styles.disclaimerEmphasis}>
              By proceeding, you acknowledge that you understand and accept these terms.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDisclaimerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={acceptDisclaimerAndExport}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.confirmButtonText}>I Understand</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Breakdown Modal */}
      <Modal
        visible={showBreakdownModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBreakdownModal(false)}
      >
        <View style={styles.breakdownModalOverlay}>
          <View style={styles.breakdownModalContent}>
            <View style={styles.breakdownModalHeader}>
              <Text style={styles.breakdownModalTitle}>{selectedBreakdown?.title}</Text>
              <TouchableOpacity onPress={() => setShowBreakdownModal(false)}>
                <Ionicons name="close" size={24} color={colors.midGrey} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.breakdownList}>
              {selectedBreakdown?.type === 'gifted' ? (
                // Gifted items list - navigate to gifted tracker for editing
                selectedBreakdown.giftedItems?.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.breakdownItem}
                    onPress={() => {
                      setShowBreakdownModal(false);
                      navigation.navigate('GiftedTracker');
                    }}
                  >
                    <View style={styles.breakdownItemIcon}>
                      <Ionicons name="gift" size={20} color={colors.gradientMid} />
                    </View>
                    <View style={styles.breakdownItemDetails}>
                      <Text style={styles.breakdownItemName}>{item.item_name}</Text>
                      <Text style={styles.breakdownItemMeta}>
                        {item.received_from ? `From ${item.received_from} • ` : ''}{new Date(item.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={[styles.breakdownItemAmount, { color: colors.gradientMid }]}>
                      {formatCurrency(item.rrp)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.midGrey} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))
              ) : (
                // Transaction list - navigate to edit screen
                selectedBreakdown?.transactions?.map((txn, index) => (
                  <TouchableOpacity
                    key={txn.id || index}
                    style={styles.breakdownItem}
                    onPress={() => {
                      setShowBreakdownModal(false);
                      // Navigate to edit transaction screen
                      navigation.navigate('EditTransaction', {
                        transactionId: txn.id,
                        transactionType: selectedBreakdown.type,
                      });
                    }}
                  >
                    <View style={[styles.breakdownItemIcon, {
                      backgroundColor: selectedBreakdown.type === 'income' ? colors.tagIncomeBg : colors.surface
                    }]}>
                      <Ionicons
                        name={selectedBreakdown.type === 'income' ? 'trending-up' : 'receipt-outline'}
                        size={20}
                        color={selectedBreakdown.type === 'income' ? colors.positive : colors.ink}
                      />
                    </View>
                    <View style={styles.breakdownItemDetails}>
                      <Text style={styles.breakdownItemName}>{txn.merchant_name}</Text>
                      <View style={styles.breakdownItemMetaRow}>
                        <Text style={styles.breakdownItemMeta}>
                          {new Date(txn.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                        {txn.business_percent < 100 && (
                          <Text style={styles.breakdownItemPercent}>{txn.business_percent}% business</Text>
                        )}
                        {selectedBreakdown.type === 'expense' && !txn.qualified && (
                          <View style={styles.needsEvidenceBadge}>
                            <Text style={styles.needsEvidenceText}>Needs evidence</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.breakdownItemAmount, {
                      color: selectedBreakdown.type === 'income' ? colors.positive : colors.negative
                    }]}>
                      {formatCurrency(Math.abs(txn.amount) * (txn.business_percent / 100))}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.midGrey} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.breakdownModalButtons}>
              <TouchableOpacity
                style={styles.breakdownCloseButton}
                onPress={() => setShowBreakdownModal(false)}
              >
                <Text style={styles.breakdownCloseButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.breakdownEditButton}
                onPress={() => {
                  setShowBreakdownModal(false);
                  if (selectedBreakdown?.type === 'gifted') {
                    navigation.navigate('GiftedTracker');
                  } else {
                    // Navigate to transaction list filtered by type
                    navigation.navigate('CategorizedTransactions', {
                      filterType: selectedBreakdown?.type,
                    });
                  }
                }}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.breakdownEditBtnGradient}
                >
                  <Ionicons name="pencil" size={18} color={colors.white} />
                  <Text style={styles.breakdownEditButtonText}>Edit All</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Estimated Tax Info Modal */}
      <Modal
        visible={showEstimateInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEstimateInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.infoModalHeader}>
              <View style={[styles.taxIconContainer, { marginRight: 0 }]}>
                <Ionicons name="information-circle" size={28} color={colors.gradientMid} />
              </View>
            </View>
            <Text style={styles.modalTitle}>About Estimated Tax</Text>
            <Text style={styles.infoModalText}>
              This estimate is calculated using the expected monthly income you provided during onboarding ({formatCurrency(userProfile?.monthly_income || 0)}/month).
            </Text>
            <Text style={styles.infoModalText}>
              It projects your annual tax liability based on this figure, giving you a year-end target to plan for.
            </Text>
            <View style={styles.infoModalHighlight}>
              <Ionicons name="shield-checkmark" size={18} color={colors.positive} />
              <Text style={styles.infoModalHighlightText}>
                This estimate is intentionally conservative - we'd rather you save a bit too much than be caught short at tax time. Your actual bill may be lower.
              </Text>
            </View>
            <Text style={styles.infoModalNote}>
              You can update your expected monthly income and tax settings in your Profile.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 16 }}
              onPress={() => setShowEstimateInfo(false)}
            >
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.confirmButtonText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingTop: spacing.lg,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
    marginBottom: 4,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  subtitle: {
    fontSize: 13,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePromptCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profilePromptText: {
    flex: 1,
  },
  profilePromptTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 2,
  },
  profilePromptSubtitle: {
    fontSize: 13,
    color: colors.midGrey,
  },
  // Profile Incomplete Card Styles
  profileIncompleteCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: 24,
  },
  profileIncompleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileIncompleteIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileIncompleteHeaderText: {
    flex: 1,
  },
  profileIncompleteTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 2,
  },
  profileIncompleteSubtitle: {
    fontSize: 14,
    color: colors.midGrey,
  },
  profileProgressContainer: {
    marginBottom: 16,
  },
  profileProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileProgressLabel: {
    fontSize: 13,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  profileProgressPercentage: {
    fontSize: 15,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  profileProgressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  profileProgressBarFill: {
    height: '100%',
    backgroundColor: colors.gradientMid,
    borderRadius: 4,
  },
  missingFieldsContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  missingFieldsLabel: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missingFieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  missingFieldText: {
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  profileIncompleteButton: {
    overflow: 'hidden',
    borderRadius: borderRadius.full,
  },
  profileIncompleteBtnGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: borderRadius.full,
  },
  profileIncompleteButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  limitedCompanyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: 24,
  },
  limitedCompanyTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 8,
  },
  limitedCompanyText: {
    fontSize: 14,
    color: colors.midGrey,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gradientMid,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  taxCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: 24,
  },
  taxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taxIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taxLabel: {
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  taxAmount: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.negative,
    marginBottom: 4,
  },
  taxNote: {
    fontSize: 12,
    color: colors.midGrey,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: colors.midGrey,
    lineHeight: 16,
    fontFamily: fonts.body,
  },
  taxInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: colors.tagExpenseBg,
    padding: 8,
    borderRadius: 8,
  },
  taxInfoText: {
    fontSize: 12,
    color: colors.midGrey,
    flex: 1,
    fontFamily: fonts.body,
  },
  payeInfoContainer: {
    backgroundColor: colors.tagIncomeBg,
    borderRadius: borderRadius.sm,
    padding: 12,
    marginBottom: 12,
  },
  payeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  payeInfoText: {
    fontSize: 13,
    color: colors.positive,
    fontFamily: fonts.bodyBold,
    flex: 1,
  },
  payeInfoDetail: {
    fontSize: 12,
    color: colors.midGrey,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  incomeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: 12,
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.tagIncomeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeLabel: {
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: 4,
    fontFamily: fonts.body,
  },
  incomeAmount: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.positive,
  },
  incomeBreakdown: {
    flexDirection: 'row',
    gap: 12,
  },
  incomeBreakdownItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
  },
  incomeBreakdownLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  incomeBreakdownAmount: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
    marginTop: 8,
  },
  expensesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  expenseCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
  },
  businessCard: {},
  personalCard: {},
  expenseIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  personalIcon: {
    backgroundColor: colors.white,
  },
  expenseLabel: {
    fontSize: 12,
    color: colors.midGrey,
    marginBottom: 4,
    fontFamily: fonts.body,
  },
  expenseAmount: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.negative,
    marginBottom: 4,
  },
  expensePercent: {
    fontSize: 12,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  categoryList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 24,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    flex: 1,
  },
  categoryAmount: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  categoryBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryBar: {
    height: '100%',
    backgroundColor: colors.gradientMid,
    borderRadius: 4,
  },
  categoryCount: {
    fontSize: 11,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    minHeight: 120,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: 24,
    fontFamily: fonts.body,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 16,
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.body,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  gradientButton: {
    borderRadius: borderRadius.full,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  disclaimerHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  disclaimerBody: {
    fontSize: 14,
    color: colors.midGrey,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  disclaimerEmphasis: {
    fontSize: 14,
    color: colors.gradientMid,
    fontFamily: fonts.bodyBold,
    marginTop: 8,
    marginBottom: 8,
  },
  unqualifiedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 24,
  },
  unqualifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  unqualifiedIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unqualifiedInfo: {
    flex: 1,
  },
  unqualifiedLabel: {
    fontSize: 12,
    color: colors.gradientMid,
    fontFamily: fonts.bodyBold,
    marginBottom: 2,
  },
  unqualifiedAmount: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.negative,
  },
  unqualifiedDescription: {
    fontSize: 14,
    color: colors.midGrey,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  unqualifiedAction: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  unqualifiedActionText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.gradientMid,
  },
  // Income source styles
  incomeSourceList: {
    marginTop: 12,
    gap: 8,
  },
  incomeSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
  },
  incomeSourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.tagIncomeBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeSourceLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  incomeSourceAmount: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.positive,
    marginRight: 4,
  },
  // Empty income message
  emptyIncomeMessage: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyIncomeText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
    marginBottom: 4,
  },
  emptyIncomeSubtext: {
    fontSize: 13,
    color: colors.midGrey,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  // Category list title
  categoryListTitle: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
    marginBottom: 12,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Breakdown Modal styles
  breakdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  breakdownModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  breakdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownModalTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  breakdownList: {
    maxHeight: 400,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakdownItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.tagExpenseBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakdownItemDetails: {
    flex: 1,
  },
  breakdownItemName: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 4,
  },
  breakdownItemMeta: {
    fontSize: 13,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  breakdownItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  breakdownItemPercent: {
    fontSize: 11,
    color: colors.midGrey,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: fonts.body,
  },
  breakdownItemAmount: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  needsEvidenceBadge: {
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  needsEvidenceText: {
    fontSize: 10,
    fontFamily: fonts.bodyBold,
    color: colors.gradientMid,
  },
  breakdownModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  breakdownCloseButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    padding: 16,
    alignItems: 'center',
  },
  breakdownCloseButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  breakdownEditButton: {
    flex: 1,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  breakdownEditBtnGradient: {
    borderRadius: borderRadius.full,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  breakdownEditButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  // Running tax card styles
  runningTaxCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: 16,
  },
  runningTaxLabelContainer: {
    flex: 1,
  },
  runningTaxSubLabel: {
    fontSize: 12,
    color: colors.midGrey,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  // Info button styles
  infoButton: {
    marginLeft: 'auto',
    padding: 4,
  },
  // No data hint styles
  noDataHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  noDataHintText: {
    flex: 1,
    fontSize: 12,
    color: colors.midGrey,
    lineHeight: 16,
    fontFamily: fonts.body,
  },
  // Info modal styles
  infoModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoModalText: {
    fontSize: 14,
    color: colors.midGrey,
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  infoModalHighlight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tagIncomeBg,
    borderRadius: borderRadius.sm,
    padding: 12,
    gap: 10,
    marginVertical: 8,
  },
  infoModalHighlightText: {
    flex: 1,
    fontSize: 13,
    color: colors.positive,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
  infoModalNote: {
    fontSize: 13,
    color: colors.midGrey,
    fontStyle: 'italic',
    marginTop: 8,
    fontFamily: fonts.body,
  },
  // Tax breakdown row styles
  taxBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taxBreakdownItem: {
    fontSize: 12,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  // Gifted items card styles
  giftedItemsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: 12,
  },
  giftedItemsCount: {
    fontSize: 12,
    color: colors.midGrey,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  // Total income row styles
  totalIncomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.tagIncomeBg,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 24,
  },
  totalIncomeLabel: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.positive,
  },
  totalIncomeAmount: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.positive,
  },
  // Export button styles
  exportButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  exportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exportButtonText: {
    flex: 1,
    marginLeft: 12,
  },
});
