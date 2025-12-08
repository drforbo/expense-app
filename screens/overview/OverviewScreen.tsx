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
  totalExpenses: number;
  businessExpenses: number;
  personalExpenses: number;
  categoryBreakdown: CategoryBreakdown[];
  taxYear: string;
}

export default function OverviewScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    estimatedTaxOwed: 0,
    totalIncome: 0,
    totalExpenses: 0,
    businessExpenses: 0,
    personalExpenses: 0,
    categoryBreakdown: [],
    taxYear: '2024/25',
  });
  const [exporting, setExporting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);

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

      // Calculate totals
      let businessExpenses = 0;
      let personalExpenses = 0;
      const categoryMap = new Map<string, { total: number; count: number }>();

      transactions?.forEach((t) => {
        const amount = Math.abs(t.amount);
        const businessAmount = amount * (t.business_percent / 100);
        const personalAmount = amount - businessAmount;

        businessExpenses += businessAmount;
        personalExpenses += personalAmount;

        // Track by category for business expenses
        if (businessAmount > 0 && t.category_name) {
          const existing = categoryMap.get(t.category_name) || { total: 0, count: 0 };
          categoryMap.set(t.category_name, {
            total: existing.total + businessAmount,
            count: existing.count + 1,
          });
        }
      });

      // Convert to array and sort
      const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([name, data]) => ({
          category_name: name,
          total_amount: data.total,
          transaction_count: data.count,
        }))
        .sort((a, b) => b.total_amount - a.total_amount);

      // Fetch income from user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('monthly_income')
        .eq('user_id', user.id)
        .single();

      const monthlyIncome = profile?.monthly_income || 0;
      const estimatedYearlyIncome = monthlyIncome * 12;

      // Calculate taxable profit (income minus business expenses)
      const taxableProfit = Math.max(0, estimatedYearlyIncome - businessExpenses);

      // Calculate estimated tax using UK 2024/25 rates
      // Personal allowance: £12,570
      // Basic rate (20%): £12,571 to £50,270
      // Higher rate (40%): £50,271 to £125,140
      let estimatedTax = 0;
      const personalAllowance = 12570;
      const basicRateLimit = 50270;

      if (taxableProfit > personalAllowance) {
        const taxableAfterAllowance = taxableProfit - personalAllowance;
        if (taxableAfterAllowance <= (basicRateLimit - personalAllowance)) {
          // All in basic rate band
          estimatedTax = taxableAfterAllowance * 0.2;
        } else {
          // Some in higher rate band
          const basicRatePortion = basicRateLimit - personalAllowance;
          const higherRatePortion = taxableAfterAllowance - basicRatePortion;
          estimatedTax = (basicRatePortion * 0.2) + (higherRatePortion * 0.4);
        }
      }

      // Add Class 4 National Insurance (9% on profits between £12,570 and £50,270)
      if (taxableProfit > personalAllowance) {
        const niTaxable = Math.min(taxableProfit, basicRateLimit) - personalAllowance;
        estimatedTax += niTaxable * 0.09;
        // 2% on profits above £50,270
        if (taxableProfit > basicRateLimit) {
          estimatedTax += (taxableProfit - basicRateLimit) * 0.02;
        }
      }

      setSummary({
        estimatedTaxOwed: estimatedTax,
        totalIncome: estimatedYearlyIncome,
        totalExpenses: businessExpenses + personalExpenses,
        businessExpenses,
        personalExpenses,
        categoryBreakdown,
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

        {/* Tax Estimate Card */}
        <View style={styles.taxCard}>
          <View style={styles.taxHeader}>
            <View style={styles.taxIconContainer}>
              <Ionicons name="calculator" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.taxLabel}>Estimated Tax Owed</Text>
          </View>
          <Text style={styles.taxAmount}>{formatCurrency(summary.estimatedTaxOwed)}</Text>
          <Text style={styles.taxNote}>
            Tax Year {summary.taxYear} (includes Income Tax + Class 4 NI)
          </Text>
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
            <Text style={styles.disclaimerText}>
              This is an estimate only, not financial advice. Consult an accountant for accurate figures.
            </Text>
          </View>
        </View>

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
});
