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
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

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
}

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
        headers: { 'Content-Type': 'application/json' },
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
        .select('monthly_income, tracking_goal, profile_completed, has_other_employment, employment_income, employment_is_paye, student_loan_plan')
        .eq('user_id', user.id)
        .single();

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

      // Tax calculation helper function
      const calculateTax = (taxableProfit: number, profile: any) => {
        let tax = 0;
        const personalAllowance = 12570;
        const basicRateLimit = 50270;

        if (profile?.tracking_goal === 'limited_company') {
          return 0;
        }

        const employmentIncome = profile?.has_other_employment ? (profile?.employment_income || 0) : 0;
        const totalIncome = taxableProfit + employmentIncome;

        let adjustedAllowance = personalAllowance;
        if (totalIncome > 100000) {
          adjustedAllowance = Math.max(0, personalAllowance - ((totalIncome - 100000) / 2));
        }

        if (profile?.has_other_employment && employmentIncome > 0) {
          if (employmentIncome >= basicRateLimit) {
            tax = taxableProfit * 0.4;
          } else if (employmentIncome > personalAllowance) {
            const roomInBasicBand = basicRateLimit - employmentIncome;
            if (taxableProfit <= roomInBasicBand) {
              tax = taxableProfit * 0.2;
            } else {
              tax = (roomInBasicBand * 0.2) + ((taxableProfit - roomInBasicBand) * 0.4);
            }
          } else {
            const unusedAllowance = personalAllowance - employmentIncome;
            const taxableAfterAllowance = Math.max(0, taxableProfit - unusedAllowance);
            if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
              tax = taxableAfterAllowance * 0.2;
            } else {
              const basicRatePortion = basicRateLimit - personalAllowance;
              const higherRatePortion = taxableAfterAllowance - basicRatePortion;
              tax = (basicRatePortion * 0.2) + (higherRatePortion * 0.4);
            }
          }
        } else {
          if (taxableProfit > adjustedAllowance) {
            const taxableAfterAllowance = taxableProfit - adjustedAllowance;
            if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
              tax = taxableAfterAllowance * 0.2;
            } else {
              const basicRatePortion = basicRateLimit - personalAllowance;
              const higherRatePortion = taxableAfterAllowance - basicRatePortion;
              tax = (basicRatePortion * 0.2) + (higherRatePortion * 0.4);
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

        // Student loan
        if (profile?.student_loan_plan && profile.student_loan_plan !== 'none') {
          const totalIncomeForSL = taxableProfit + employmentIncome;
          let slThreshold = 0;
          let slRate = 0.09;

          switch (profile.student_loan_plan) {
            case 'plan1': slThreshold = 22015; break;
            case 'plan2': slThreshold = 27295; break;
            case 'plan4': slThreshold = 27660; break;
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

      const params = new URLSearchParams({
        user_id: user.id,
        ...(selectedStartDate && { start_date: selectedStartDate }),
        ...(selectedEndDate && { end_date: selectedEndDate }),
      });

      const downloadUrl = `${API_URL}/api/download_transactions?${params.toString()}`;
      const canOpen = await Linking.canOpenURL(downloadUrl);

      if (canOpen) {
        await Linking.openURL(downloadUrl);
        Alert.alert(
          'Export Started',
          'The file will download in your browser. You can then save it to Files or share it.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Cannot open browser');
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
          <ActivityIndicator size="large" color="#7C3AED" />
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
            <Text style={styles.title}>Overview</Text>
            <Text style={styles.subtitle}>Tax Year {summary.taxYear}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchFinancialSummary}
          >
            <Ionicons name="refresh" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Profile Completion Prompt */}
        {userProfile && !userProfile.profile_completed && userProfile.tracking_goal !== 'limited_company' && (
          <TouchableOpacity
            style={styles.profilePromptCard}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.profilePromptIcon}>
              <Ionicons name="person-circle" size={24} color="#7C3AED" />
            </View>
            <View style={styles.profilePromptText}>
              <Text style={styles.profilePromptTitle}>Complete your profile</Text>
              <Text style={styles.profilePromptSubtitle}>Get a more accurate tax estimate</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}

        {/* Tax Estimate Card - Different for Limited Company */}
        {userProfile?.tracking_goal === 'limited_company' ? (
          <View style={styles.limitedCompanyCard}>
            <View style={styles.taxHeader}>
              <View style={[styles.taxIconContainer, { backgroundColor: '#7C3AED20' }]}>
                <Ionicons name="business" size={24} color="#7C3AED" />
              </View>
              <Text style={styles.taxLabel}>Limited Company</Text>
            </View>
            <Text style={styles.limitedCompanyTitle}>Tax estimates coming soon!</Text>
            <Text style={styles.limitedCompanyText}>
              We're working on bringing corporation tax and director salary calculations to bopp. In the meantime, you can still track and categorize all your business expenses.
            </Text>
            <View style={styles.comingSoonBadge}>
              <Ionicons name="rocket" size={14} color="#7C3AED" />
              <Text style={styles.comingSoonText}>Coming soon to bopp</Text>
            </View>
          </View>
        ) : (
          <>
            {/* Estimated Tax Card - Based on Onboarding */}
            <View style={styles.taxCard}>
              <View style={styles.taxHeader}>
                <View style={styles.taxIconContainer}>
                  <Ionicons name="calculator" size={24} color="#F59E0B" />
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
                  <Ionicons name="information-circle-outline" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.taxAmount}>{formatCurrency(summary.estimatedTaxOwed)}</Text>
              <Text style={styles.taxNote}>
                Based on your expected monthly income of {formatCurrency(userProfile?.monthly_income || 0)}
              </Text>
              {userProfile?.has_other_employment && userProfile?.employment_is_paye && (
                <View style={styles.payeInfoContainer}>
                  <View style={styles.payeInfoRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
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
                  <Ionicons name="alert-circle-outline" size={14} color="#F59E0B" />
                  <Text style={styles.taxInfoText}>
                    Includes tax on contractor income (£{((userProfile.employment_income || 0) / 1000).toFixed(0)}k/yr) + side hustle
                  </Text>
                </View>
              )}
            </View>

            {/* Running Total Tax Card - Based on Actual Transactions */}
            <View style={styles.runningTaxCard}>
              <View style={styles.taxHeader}>
                <View style={[styles.taxIconContainer, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="trending-up" size={24} color="#10B981" />
                </View>
                <View style={styles.runningTaxLabelContainer}>
                  <Text style={styles.taxLabel}>Tax on Tracked Income</Text>
                  <Text style={styles.runningTaxSubLabel}>
                    {summary.monthsOfData > 0 ? `${summary.monthsOfData} month${summary.monthsOfData !== 1 ? 's' : ''} of data` : 'No data yet'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.taxAmount, { color: '#10B981' }]}>{formatCurrency(summary.runningTaxOwed)}</Text>
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
                  <Ionicons name="bulb-outline" size={14} color="#6B7280" />
                  <Text style={styles.noDataHintText}>
                    Start categorizing income transactions to see your actual tax liability
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.disclaimerContainer}>
              <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
              <Text style={styles.disclaimerText}>
                These are estimates only, not financial advice. Consult an accountant for accurate figures.
              </Text>
            </View>
          </>
        )}

        {/* Income Section - Always shown */}
        <Text style={styles.sectionTitle}>Income</Text>

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
              <Ionicons name="cash-outline" size={24} color="#10B981" />
            </View>
            <View style={styles.incomeInfo}>
              <Text style={styles.incomeLabel}>Business Income</Text>
              <Text style={styles.incomeAmount}>{formatCurrency(summary.businessIncome)}</Text>
            </View>
            {summary.businessIncome > 0 && (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
            <View style={[styles.incomeIconContainer, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="gift-outline" size={24} color="#F59E0B" />
            </View>
            <View style={styles.incomeInfo}>
              <Text style={styles.incomeLabel}>Gifted Items</Text>
              <Text style={[styles.incomeAmount, { color: '#F59E0B' }]}>{formatCurrency(summary.giftedItemsTotal)}</Text>
              {summary.giftedItemsCount > 0 && (
                <Text style={styles.giftedItemsCount}>{summary.giftedItemsCount} item{summary.giftedItemsCount !== 1 ? 's' : ''} tracked</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{category.category_name}</Text>
                    <View style={styles.categoryHeaderRight}>
                      <Text style={[styles.categoryAmount, { color: '#10B981' }]}>{formatCurrency(category.total_amount)}</Text>
                      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </View>
                  </View>
                  <View style={[styles.categoryBarContainer, { backgroundColor: '#10B98120' }]}>
                    <View style={[styles.categoryBar, { width: `${barWidth}%`, backgroundColor: '#10B981' }]} />
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
        <Text style={styles.sectionTitle}>Expenses</Text>
        <View style={styles.expensesRow}>
          <View style={[styles.expenseCard, styles.businessCard]}>
            <View style={styles.expenseIconContainer}>
              <Ionicons name="briefcase" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.expenseLabel}>Business</Text>
            <Text style={styles.expenseAmount}>{formatCurrency(summary.businessExpenses)}</Text>
            <Text style={styles.expensePercent}>{businessPercent}% of total</Text>
          </View>

          <View style={[styles.expenseCard, styles.personalCard]}>
            <View style={[styles.expenseIconContainer, styles.personalIcon]}>
              <Ionicons name="person" size={20} color="#6B7280" />
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
                <Ionicons name="document-text-outline" size={24} color="#F59E0B" />
              </View>
              <View style={styles.unqualifiedInfo}>
                <Text style={styles.unqualifiedLabel}>Needs Evidence</Text>
                <Text style={styles.unqualifiedAmount}>{formatCurrency(summary.unqualifiedExpenses)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
            <Text style={styles.sectionTitle}>Business Expenses by Category</Text>
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
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{category.category_name}</Text>
                      <View style={styles.categoryHeaderRight}>
                        <Text style={styles.categoryAmount}>{formatCurrency(category.total_amount)}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
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
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B20' }]}>
              {exporting ? (
                <ActivityIndicator size={24} color="#F59E0B" />
              ) : (
                <Ionicons name="download" size={24} color="#F59E0B" />
              )}
            </View>
            <View style={styles.exportButtonText}>
              <Text style={styles.actionTitle}>Export Transactions</Text>
              <Text style={styles.actionSubtitle}>Last export: {formatLastExportDate(lastExportDate)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
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
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.dateInputContainer}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
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
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmExport}
              >
                <Text style={styles.confirmButtonText}>Export</Text>
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
              <Ionicons name="alert-circle" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.modalTitle}>Important Disclaimer</Text>
            <Text style={styles.disclaimerBody}>
              The data you are about to export is provided for informational purposes only and should not be considered as professional tax, accounting, or financial advice.
            </Text>
            <Text style={styles.disclaimerBody}>
              We do not guarantee the accuracy, completeness, or suitability of this information for your tax return or any other purpose.
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
                style={[styles.modalButton, styles.confirmButton]}
                onPress={acceptDisclaimerAndExport}
              >
                <Text style={styles.confirmButtonText}>I Understand</Text>
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
                <Ionicons name="close" size={24} color="#9CA3AF" />
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
                      <Ionicons name="gift" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.breakdownItemDetails}>
                      <Text style={styles.breakdownItemName}>{item.item_name}</Text>
                      <Text style={styles.breakdownItemMeta}>
                        {item.received_from ? `From ${item.received_from} • ` : ''}{new Date(item.received_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={[styles.breakdownItemAmount, { color: '#F59E0B' }]}>
                      {formatCurrency(item.rrp)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 4 }} />
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
                      backgroundColor: selectedBreakdown.type === 'income' ? '#10B98120' : '#7C3AED20'
                    }]}>
                      <Ionicons
                        name={selectedBreakdown.type === 'income' ? 'trending-up' : 'receipt-outline'}
                        size={20}
                        color={selectedBreakdown.type === 'income' ? '#10B981' : '#7C3AED'}
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
                      color: selectedBreakdown.type === 'income' ? '#10B981' : '#7C3AED'
                    }]}>
                      {formatCurrency(Math.abs(txn.amount) * (txn.business_percent / 100))}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" style={{ marginLeft: 4 }} />
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
                <Ionicons name="pencil" size={18} color="#fff" />
                <Text style={styles.breakdownEditButtonText}>Edit All</Text>
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
                <Ionicons name="information-circle" size={28} color="#F59E0B" />
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
              <Ionicons name="bulb" size={18} color="#10B981" />
              <Text style={styles.infoModalHighlightText}>
                After 3+ months of tracking, the "Tax on Tracked Income" below will become a more accurate reflection of your actual tax position based on real transactions.
              </Text>
            </View>
            <Text style={styles.infoModalNote}>
              You can update your expected monthly income in your Profile settings.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, { marginTop: 16 }]}
              onPress={() => setShowEstimateInfo(false)}
            >
              <Text style={styles.confirmButtonText}>Got it</Text>
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
    backgroundColor: '#2E1A47',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePromptCard: {
    backgroundColor: '#7C3AED15',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  profilePromptIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C3AED20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profilePromptText: {
    flex: 1,
  },
  profilePromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  profilePromptSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  limitedCompanyCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#6B728030',
  },
  limitedCompanyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  limitedCompanyText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 12,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C3AED',
  },
  taxCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F59E0B30',
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
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taxLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  taxAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#F59E0B',
    marginBottom: 4,
  },
  taxNote: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2E1A47',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  taxInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    backgroundColor: '#F59E0B10',
    padding: 8,
    borderRadius: 8,
  },
  taxInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  payeInfoContainer: {
    backgroundColor: '#10B98110',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B98120',
  },
  payeInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  payeInfoText: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    flex: 1,
  },
  payeInfoDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  incomeCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  incomeAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10B981',
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
    backgroundColor: '#2E1A47',
    borderRadius: 8,
    padding: 12,
  },
  incomeBreakdownLabel: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
  },
  incomeBreakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  expensesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  expenseCard: {
    flex: 1,
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
  },
  businessCard: {
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  personalCard: {
    borderWidth: 1,
    borderColor: '#6B728030',
  },
  expenseIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#7C3AED20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  personalIcon: {
    backgroundColor: '#6B728020',
  },
  expenseLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  expensePercent: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryList: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  categoryBarContainer: {
    height: 8,
    backgroundColor: '#2E1A47',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  categoryBar: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 4,
  },
  categoryCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#1F1333',
    borderRadius: 16,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: '#2E1A47',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#7C3AED20',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2E1A47',
  },
  confirmButton: {
    backgroundColor: '#7C3AED',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  disclaimerHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  disclaimerBody: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 12,
  },
  disclaimerEmphasis: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
  },
  unqualifiedCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F59E0B30',
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
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  unqualifiedInfo: {
    flex: 1,
  },
  unqualifiedLabel: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 2,
  },
  unqualifiedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  unqualifiedDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 12,
  },
  unqualifiedAction: {
    backgroundColor: '#F59E0B15',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  unqualifiedActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  // Income source styles
  incomeSourceList: {
    marginTop: 12,
    gap: 8,
  },
  incomeSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E1A47',
    borderRadius: 10,
    padding: 12,
  },
  incomeSourceIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  incomeSourceLabel: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
  },
  incomeSourceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
    marginRight: 4,
  },
  // Empty income message
  emptyIncomeMessage: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyIncomeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyIncomeSubtext: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  // Category list title
  categoryListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  breakdownModalContent: {
    backgroundColor: '#1F1333',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  breakdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2E1A47',
  },
  breakdownModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  breakdownList: {
    maxHeight: 400,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2E1A4750',
  },
  breakdownItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakdownItemDetails: {
    flex: 1,
  },
  breakdownItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  breakdownItemMeta: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  breakdownItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  breakdownItemPercent: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#2E1A47',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  breakdownItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  needsEvidenceBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  needsEvidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  breakdownModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  breakdownCloseButton: {
    flex: 1,
    backgroundColor: '#2E1A47',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  breakdownCloseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  breakdownEditButton: {
    flex: 1,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  breakdownEditButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Running tax card styles
  runningTaxCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  runningTaxLabelContainer: {
    flex: 1,
  },
  runningTaxSubLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
    backgroundColor: '#2E1A47',
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  noDataHintText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  // Info modal styles
  infoModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  infoModalText: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoModalHighlight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#10B98115',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#10B98120',
  },
  infoModalHighlightText: {
    flex: 1,
    fontSize: 13,
    color: '#10B981',
    lineHeight: 18,
  },
  infoModalNote: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  // Tax breakdown row styles
  taxBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2E1A47',
  },
  taxBreakdownItem: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Gifted items card styles
  giftedItemsCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  giftedItemsCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  // Total income row styles
  totalIncomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#10B98115',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10B98120',
  },
  totalIncomeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  totalIncomeAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  // Export button styles
  exportButton: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
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
