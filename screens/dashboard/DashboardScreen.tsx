import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

export default function DashboardScreen({ navigation }: any) {
  const [connecting, setConnecting] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [unqualifiedCount, setUnqualifiedCount] = useState(0);
  const [qualifiedCount, setQualifiedCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    checkAccessToken();
    fetchLastExportDate();
    fetchTransactionCounts();
  }, []);

  useEffect(() => {
    // Refresh counts when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTransactionCounts();
    });
    return unsubscribe;
  }, [navigation]);

  const checkAccessToken = async () => {
    try {
      const token = await AsyncStorage.getItem('plaid_access_token');
      setHasAccessToken(!!token);
    } catch (error) {
      console.error('Error checking access token:', error);
    }
  };

  const fetchLastExportDate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${API_URL}/api/get_last_export_date`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('Failed to fetch last export date:', response.status);
        return;
      }

      const data = await response.json();
      setLastExportDate(data.last_export_date);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Fetch last export date timed out');
      } else {
        console.error('Error fetching last export date:', error);
      }
      // Don't block the UI - just keep it as null
    }
  };

  const fetchTransactionCounts = async () => {
    try {
      setLoadingCounts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const accessToken = await AsyncStorage.getItem('plaid_access_token');
      if (!accessToken) {
        setLoadingCounts(false);
        return;
      }

      // Fetch uncategorized count from server
      const uncategorizedResponse = await fetch(`${API_URL}/api/get_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });
      const uncategorizedData = await uncategorizedResponse.json();

      // Filter out already categorized transactions
      const { data: categorized } = await supabase
        .from('categorized_transactions')
        .select('plaid_transaction_id')
        .eq('user_id', user.id);

      const categorizedIds = new Set(categorized?.map(t => t.plaid_transaction_id) || []);
      const uncategorized = uncategorizedData.transactions?.filter(
        (t: any) => !categorizedIds.has(t.transaction_id)
      ) || [];
      setUncategorizedCount(uncategorized.length);

      // Fetch unqualified count (tax-deductible but not qualified)
      const { data: unqualified } = await supabase
        .from('categorized_transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('tax_deductible', true)
        .or('qualified.is.null,qualified.eq.false');
      setUnqualifiedCount(unqualified?.length || 0);

      // Fetch qualified count
      const { data: qualified } = await supabase
        .from('categorized_transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('qualified', true);
      setQualifiedCount(qualified?.length || 0);
    } catch (error) {
      console.error('Error fetching transaction counts:', error);
    } finally {
      setLoadingCounts(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from Supabase
              await supabase.auth.signOut();
              // Clear local storage
              await AsyncStorage.removeItem('onboarding_completed');
              await AsyncStorage.removeItem('plaid_access_token');
              // The auth state change will trigger app restart
              console.log('✅ Logged out successfully');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out');
            }
          },
        },
      ]
    );
  };

  const handleCategorizeTransactions = async () => {
    try {
      setConnecting(true);

      // Check if we already have an access token
      let accessToken = await AsyncStorage.getItem('plaid_access_token');

      // If we have a token, use it directly
      if (accessToken) {
        console.log('✅ Using existing access token');
        navigation.navigate('TransactionList', { accessToken });
        setConnecting(false);
        return;
      }

      // Otherwise, create a new sandbox connection
      console.log('🔧 Creating new sandbox connection...');

      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to connect your bank');
        setConnecting(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/create_sandbox_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (data.access_token) {
        // Save the token for future use
        await AsyncStorage.setItem('plaid_access_token', data.access_token);
        setHasAccessToken(true);
        console.log('✅ Access token saved');

        navigation.navigate('TransactionList', {
          accessToken: data.access_token,
        });
      } else {
        Alert.alert('Error', 'Failed to connect bank');
      }
    } catch (error: any) {
      console.error('Error connecting bank:', error);
      Alert.alert('Error', error.message || 'Failed to connect bank');
    } finally {
      setConnecting(false);
    }
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} will be available soon!`);
  };

  const handleExportTransactions = async (selectedStartDate?: string, selectedEndDate?: string) => {
    try {
      setExporting(true);
      console.log('🚀 Starting export...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.log('❌ No user found');
        Alert.alert('Error', 'You must be logged in to export transactions');
        return;
      }

      console.log('📊 Exporting transactions for user:', user.id);
      if (selectedStartDate) console.log('📅 Date range:', selectedStartDate, 'to', selectedEndDate);

      // Build download URL with query parameters
      const params = new URLSearchParams({
        user_id: user.id,
        ...(selectedStartDate && { start_date: selectedStartDate }),
        ...(selectedEndDate && { end_date: selectedEndDate }),
      });

      const downloadUrl = `${API_URL}/api/download_transactions?${params.toString()}`;
      console.log('🌐 Opening download URL:', downloadUrl);

      // Open the download URL in the browser - iOS Safari will handle the download
      const canOpen = await Linking.canOpenURL(downloadUrl);
      console.log('📱 Can open URL:', canOpen);

      if (canOpen) {
        await Linking.openURL(downloadUrl);
        console.log('✅ Browser opened successfully');

        Alert.alert(
          'Export Started',
          'The file will download in your browser. You can then save it to Files or share it.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Cannot open browser');
      }

      // Refresh last export date
      fetchLastExportDate().catch(err => console.warn('Failed to refresh export date:', err));
    } catch (error: any) {
      console.error('❌ Error exporting transactions:', error);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', error.message || 'Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const openDatePicker = () => {
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
    setShowDatePicker(true);
  };

  const confirmExport = () => {
    setShowDatePicker(false);
    handleExportTransactions(startDate, endDate);
  };

  const formatLastExportDate = (dateString: string | null) => {
    if (!dateString) return 'Never exported';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Dashboard</Text>
            <Text style={styles.subtitle}>Manage your tax tracking</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Primary Action - Categorize Transactions */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={handleCategorizeTransactions}
          disabled={connecting}
          activeOpacity={0.7}
        >
          <View style={styles.primaryIconContainer}>
            {connecting ? (
              <ActivityIndicator size={32} color="#fff" />
            ) : (
              <Ionicons name="card" size={32} color="#fff" />
            )}
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>
              {connecting ? 'Connecting...' : 'Categorize Transactions'}
            </Text>
            <Text style={styles.primarySubtitle}>
              {loadingCounts
                ? 'Loading...'
                : uncategorizedCount > 0
                  ? `${uncategorizedCount} transaction${uncategorizedCount !== 1 ? 's' : ''} to categorize`
                  : 'All transactions categorized!'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Main Actions Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('QualifyTransactions')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="receipt" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.actionTitle}>Qualify Transactions</Text>
            <Text style={styles.actionSubtitle}>
              {loadingCounts
                ? 'Loading...'
                : unqualifiedCount > 0
                  ? `${unqualifiedCount} to qualify`
                  : 'All qualified!'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('View Qualified Transactions')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            </View>
            <Text style={styles.actionTitle}>Qualified</Text>
            <Text style={styles.actionSubtitle}>
              {loadingCounts
                ? 'Loading...'
                : `${qualifiedCount} complete`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('GiftedTracker')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="gift" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.actionTitle}>Gifted Tracker</Text>
            <Text style={styles.actionSubtitle}>Track PR packages & gifts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Tax Checklist')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="checkbox" size={28} color="#10B981" />
            </View>
            <Text style={styles.actionTitle}>Checklist</Text>
            <Text style={styles.actionSubtitle}>Tax actions & deadlines</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Tax Summary')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="stats-chart" size={28} color="#3B82F6" />
            </View>
            <Text style={styles.actionTitle}>Summary</Text>
            <Text style={styles.actionSubtitle}>View tax consolidation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.exportCard]}
            onPress={openDatePicker}
            disabled={exporting}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              {exporting ? (
                <ActivityIndicator size={28} color="#F59E0B" />
              ) : (
                <Ionicons name="download" size={28} color="#F59E0B" />
              )}
            </View>
            <Text style={styles.actionTitle}>
              {exporting ? 'Exporting...' : 'Export'}
            </Text>
            <Text style={styles.actionSubtitle}>Download as CSV</Text>
            <Text style={styles.lastExportText}>
              Last: {formatLastExportDate(lastExportDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Account Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="settings" size={28} color="#6B7280" />
            </View>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>Profile & billing</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  primaryText: {
    flex: 1,
  },
  primaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  primarySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    minHeight: 130,
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
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
    lineHeight: 16,
  },
  exportCard: {
    minHeight: 150,
  },
  lastExportText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
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
