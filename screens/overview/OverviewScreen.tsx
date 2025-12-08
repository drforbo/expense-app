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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

interface CategoryBreakdown {
  category_name: string;
  total_amount: number;
  transaction_count: number;
}

interface FinancialSummary {
  estimatedTaxOwed: number;
  totalIncome: number;
  businessIncome: number;
  personalIncome: number;
  totalExpenses: number;
  businessExpenses: number;
  personalExpenses: number;
  categoryBreakdown: CategoryBreakdown[];
  incomeCategoryBreakdown: CategoryBreakdown[];
  taxYear: string;
}

interface UserProfile {
  tracking_goal: string;
  profile_completed: boolean;
  has_other_employment: boolean;
  employment_income: number;
  student_loan_plan: string;
  monthly_income: number;
}

export default function OverviewScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    estimatedTaxOwed: 0,
    totalIncome: 0,
    businessIncome: 0,
    personalIncome: 0,
    totalExpenses: 0,
    businessExpenses: 0,
    personalExpenses: 0,
    categoryBreakdown: [],
    incomeCategoryBreakdown: [],
    taxYear: '2024/25',
  });
  const [exporting, setExporting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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

      // Calculate totals - separate income from expenses
      let businessExpenses = 0;
      let personalExpenses = 0;
      let businessIncome = 0;
      let personalIncome = 0;
      const expenseCategoryMap = new Map<string, { total: number; count: number }>();
      const incomeCategoryMap = new Map<string, { total: number; count: number }>();

      transactions?.forEach((t) => {
        const amount = Math.abs(t.amount);
        const isIncome = t.amount < 0; // Negative amounts are income (credits)
        const businessAmount = amount * (t.business_percent / 100);
        const personalAmount = amount - businessAmount;

        if (isIncome) {
          // This is income
          businessIncome += businessAmount;
          personalIncome += personalAmount;

          // Track by category for business income
          if (businessAmount > 0 && t.category_name) {
            const existing = incomeCategoryMap.get(t.category_name) || { total: 0, count: 0 };
            incomeCategoryMap.set(t.category_name, {
              total: existing.total + businessAmount,
              count: existing.count + 1,
            });
          }
        } else {
          // This is an expense
          businessExpenses += businessAmount;
          personalExpenses += personalAmount;

          // Track by category for business expenses
          if (businessAmount > 0 && t.category_name) {
            const existing = expenseCategoryMap.get(t.category_name) || { total: 0, count: 0 };
            expenseCategoryMap.set(t.category_name, {
              total: existing.total + businessAmount,
              count: existing.count + 1,
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
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Convert income categories to array and sort
      const incomeCategoryBreakdown: CategoryBreakdown[] = Array.from(incomeCategoryMap.entries())
        .map(([name, data]) => ({
          category_name: name,
          total_amount: data.total,
          transaction_count: data.count,
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Fetch user profile with all tax-relevant fields
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('monthly_income, tracking_goal, profile_completed, has_other_employment, employment_income, student_loan_plan')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);

      // Use actual tracked business income from transactions
      // If no income transactions tracked yet, fall back to estimated from profile
      const monthlyIncome = profile?.monthly_income || 0;
      const estimatedYearlyIncome = monthlyIncome * 12;

      // Use tracked income if available, otherwise fall back to estimate
      const actualBusinessIncome = businessIncome > 0 ? businessIncome : estimatedYearlyIncome;

      // Calculate taxable profit (income minus business expenses)
      const taxableProfit = Math.max(0, actualBusinessIncome - businessExpenses);

      // Calculate estimated tax using UK 2024/25 rates
      // Personal allowance: £12,570
      // Basic rate (20%): £12,571 to £50,270
      // Higher rate (40%): £50,271 to £125,140
      let estimatedTax = 0;
      const personalAllowance = 12570;
      const basicRateLimit = 50270;

      // For limited company users, we don't calculate personal tax
      if (profile?.tracking_goal !== 'limited_company') {
        // Calculate total income including employment if they have a day job
        const employmentIncome = profile?.has_other_employment ? (profile?.employment_income || 0) : 0;
        const totalIncome = taxableProfit + employmentIncome;

        // Calculate personal allowance reduction for high earners
        let adjustedAllowance = personalAllowance;
        if (totalIncome > 100000) {
          adjustedAllowance = Math.max(0, personalAllowance - ((totalIncome - 100000) / 2));
        }

        // If they have other employment, that job handles their personal allowance
        // So their side hustle profit is taxed at their marginal rate
        if (profile?.has_other_employment && employmentIncome > 0) {
          // Calculate what bracket their employment puts them in
          if (employmentIncome >= basicRateLimit) {
            // Employment income already in higher rate - all side hustle at 40%
            estimatedTax = taxableProfit * 0.4;
          } else if (employmentIncome > personalAllowance) {
            // Employment uses up personal allowance, side hustle starts at basic rate
            const roomInBasicBand = basicRateLimit - employmentIncome;
            if (taxableProfit <= roomInBasicBand) {
              estimatedTax = taxableProfit * 0.2;
            } else {
              estimatedTax = (roomInBasicBand * 0.2) + ((taxableProfit - roomInBasicBand) * 0.4);
            }
          } else {
            // Employment doesn't use all personal allowance
            const unusedAllowance = personalAllowance - employmentIncome;
            const taxableAfterAllowance = Math.max(0, taxableProfit - unusedAllowance);
            if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
              estimatedTax = taxableAfterAllowance * 0.2;
            } else {
              const basicRatePortion = basicRateLimit - personalAllowance;
              const higherRatePortion = taxableAfterAllowance - basicRatePortion;
              estimatedTax = (basicRatePortion * 0.2) + (higherRatePortion * 0.4);
            }
          }
        } else {
          // No other employment - standard calculation
          if (taxableProfit > adjustedAllowance) {
            const taxableAfterAllowance = taxableProfit - adjustedAllowance;
            if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
              estimatedTax = taxableAfterAllowance * 0.2;
            } else {
              const basicRatePortion = basicRateLimit - personalAllowance;
              const higherRatePortion = taxableAfterAllowance - basicRatePortion;
              estimatedTax = (basicRatePortion * 0.2) + (higherRatePortion * 0.4);
            }
          }
        }

        // Add Class 4 National Insurance on self-employment profits
        if (taxableProfit > personalAllowance) {
          const niTaxable = Math.min(taxableProfit, basicRateLimit) - personalAllowance;
          estimatedTax += niTaxable * 0.09;
          if (taxableProfit > basicRateLimit) {
            estimatedTax += (taxableProfit - basicRateLimit) * 0.02;
          }
        }

        // Add student loan repayments if applicable
        if (profile?.student_loan_plan && profile.student_loan_plan !== 'none') {
          const totalIncomeForSL = taxableProfit + employmentIncome;
          let slThreshold = 0;
          let slRate = 0.09;

          switch (profile.student_loan_plan) {
            case 'plan1':
              slThreshold = 22015; // Plan 1 threshold 2024/25
              break;
            case 'plan2':
              slThreshold = 27295; // Plan 2 threshold 2024/25
              break;
            case 'plan4':
              slThreshold = 27660; // Plan 4 threshold 2024/25
              break;
            case 'postgrad':
              slThreshold = 21000;
              slRate = 0.06;
              break;
          }

          if (totalIncomeForSL > slThreshold) {
            // Student loan repayment on income above threshold
            // Note: If they have employment, employer handles most of this
            // We estimate the additional from self-employment
            if (!profile?.has_other_employment) {
              estimatedTax += (totalIncomeForSL - slThreshold) * slRate;
            } else if (employmentIncome < slThreshold) {
              // Employment doesn't trigger student loan, but total does
              const slAmount = (totalIncomeForSL - slThreshold) * slRate;
              estimatedTax += slAmount;
            }
            // If employment already above threshold, employer handles it
          }
        }
      }

      setSummary({
        estimatedTaxOwed: estimatedTax,
        totalIncome: businessIncome + personalIncome,
        businessIncome,
        personalIncome,
        totalExpenses: businessExpenses + personalExpenses,
        businessExpenses,
        personalExpenses,
        categoryBreakdown,
        incomeCategoryBreakdown,
        taxYear: taxYearLabel,
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

  const confirmExport = () => {
    setShowDatePicker(false);
    handleExportTransactions(startDate, endDate);
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
          <View style={styles.taxCard}>
            <View style={styles.taxHeader}>
              <View style={styles.taxIconContainer}>
                <Ionicons name="calculator" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.taxLabel}>Estimated Tax Owed</Text>
            </View>
            <Text style={styles.taxAmount}>{formatCurrency(summary.estimatedTaxOwed)}</Text>
            <Text style={styles.taxNote}>
              Tax Year {summary.taxYear} (includes Income Tax + Class 4 NI
              {userProfile?.student_loan_plan && userProfile.student_loan_plan !== 'none' ? ' + Student Loan' : ''})
            </Text>
            {userProfile?.has_other_employment && (
              <View style={styles.taxInfoRow}>
                <Ionicons name="briefcase-outline" size={14} color="#7C3AED" />
                <Text style={styles.taxInfoText}>
                  Calculated based on employment income of £{((userProfile.employment_income || 0) / 1000).toFixed(0)}k/yr
                </Text>
              </View>
            )}
            <View style={styles.disclaimerContainer}>
              <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
              <Text style={styles.disclaimerText}>
                This is an estimate only, not financial advice. Consult an accountant for accurate figures.
              </Text>
            </View>
          </View>
        )}

        {/* Income Section */}
        {summary.totalIncome > 0 && (
          <>
            <Text style={styles.sectionTitle}>Income</Text>
            <View style={styles.incomeCard}>
              <View style={styles.incomeHeader}>
                <View style={styles.incomeIconContainer}>
                  <Ionicons name="trending-up" size={24} color="#10B981" />
                </View>
                <View style={styles.incomeInfo}>
                  <Text style={styles.incomeLabel}>Total Income</Text>
                  <Text style={styles.incomeAmount}>{formatCurrency(summary.totalIncome)}</Text>
                </View>
              </View>
              <View style={styles.incomeBreakdown}>
                <View style={styles.incomeBreakdownItem}>
                  <Ionicons name="briefcase-outline" size={16} color="#7C3AED" />
                  <Text style={styles.incomeBreakdownLabel}>Business</Text>
                  <Text style={styles.incomeBreakdownAmount}>{formatCurrency(summary.businessIncome)}</Text>
                </View>
                <View style={styles.incomeBreakdownItem}>
                  <Ionicons name="person-outline" size={16} color="#6B7280" />
                  <Text style={styles.incomeBreakdownLabel}>Personal</Text>
                  <Text style={styles.incomeBreakdownAmount}>{formatCurrency(summary.personalIncome)}</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Expenses Split */}
        <Text style={styles.sectionTitle}>Expenses Breakdown</Text>
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

        {/* Category Breakdown */}
        {summary.categoryBreakdown.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Business Expenses by Category</Text>
            <View style={styles.categoryList}>
              {summary.categoryBreakdown.map((category, index) => {
                const maxAmount = summary.categoryBreakdown[0]?.total_amount || 1;
                const barWidth = (category.total_amount / maxAmount) * 100;

                return (
                  <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{category.category_name}</Text>
                      <Text style={styles.categoryAmount}>{formatCurrency(category.total_amount)}</Text>
                    </View>
                    <View style={styles.categoryBarContainer}>
                      <View style={[styles.categoryBar, { width: `${barWidth}%` }]} />
                    </View>
                    <Text style={styles.categoryCount}>
                      {category.transaction_count} transaction{category.transaction_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('TaxChecklist')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="checkbox" size={24} color="#10B981" />
            </View>
            <Text style={styles.actionTitle}>Tax Checklist</Text>
            <Text style={styles.actionSubtitle}>Your to-do list</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={openDatePicker}
            disabled={exporting}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B20' }]}>
              {exporting ? (
                <ActivityIndicator size={24} color="#F59E0B" />
              ) : (
                <Ionicons name="download" size={24} color="#F59E0B" />
              )}
            </View>
            <Text style={styles.actionTitle}>Export</Text>
            <Text style={styles.actionSubtitle}>Last: {formatLastExportDate(lastExportDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Action */}
        <TouchableOpacity
          style={styles.profileActionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#7C3AED20' }]}>
            <Ionicons name="person" size={24} color="#7C3AED" />
          </View>
          <View style={styles.profileActionText}>
            <Text style={styles.actionTitle}>Your Profile</Text>
            <Text style={styles.actionSubtitle}>View and edit your tax settings</Text>
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
    backgroundColor: '#7C3AED10',
    padding: 8,
    borderRadius: 8,
  },
  taxInfoText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  incomeCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#10B98130',
  },
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  profileActionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  profileActionText: {
    flex: 1,
    marginLeft: 12,
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
});
