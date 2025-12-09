import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useUpload } from '../../context/UploadContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

export default function DashboardScreen({ navigation }: any) {
  const { uploadState, clearUpload } = useUpload();
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [unqualifiedCount, setUnqualifiedCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [showUploadComplete, setShowUploadComplete] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing';

  useEffect(() => {
    fetchTransactionCounts();
  }, []);

  // Handle upload completion notification
  useEffect(() => {
    if (uploadState.status === 'complete' && uploadState.result) {
      setShowUploadComplete(true);
      fetchTransactionCounts(); // Refresh counts

      // Animate in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        hideUploadComplete();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [uploadState.status]);

  const hideUploadComplete = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowUploadComplete(false);
      clearUpload();
    });
  };

  useEffect(() => {
    // Refresh counts when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchTransactionCounts();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchTransactionCounts = async () => {
    try {
      setLoadingCounts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch uncategorized count from server
      const uncategorizedResponse = await fetch(`${API_URL}/api/get_uncategorized_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const uncategorizedData = await uncategorizedResponse.json();
      setUncategorizedCount(uncategorizedData.count || 0);

      // Fetch unqualified count (tax-deductible but not qualified)
      const { data: unqualified } = await supabase
        .from('categorized_transactions')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('tax_deductible', true)
        .or('qualified.is.null,qualified.eq.false');
      setUnqualifiedCount(unqualified?.length || 0);
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

  const handleCategorizeTransactions = () => {
    navigation.navigate('TransactionList');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Upload Progress Banner */}
      {isUploading && (
        <View style={styles.uploadBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <View style={styles.uploadBannerText}>
            <Text style={styles.uploadBannerTitle}>
              {uploadState.status === 'uploading' ? 'Uploading...' : 'Processing PDF...'}
            </Text>
            <Text style={styles.uploadBannerSubtitle} numberOfLines={1}>
              {uploadState.filename}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('UploadStatement')}>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Complete Notification */}
      {showUploadComplete && uploadState.result && (
        <Animated.View
          style={[
            styles.uploadCompleteBanner,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.uploadCompleteIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
          <View style={styles.uploadBannerText}>
            <Text style={styles.uploadCompleteTitle}>Upload Complete!</Text>
            <Text style={styles.uploadCompleteSubtitle}>
              {uploadState.result.transactions_saved} new transactions added
            </Text>
          </View>
          <TouchableOpacity onPress={hideUploadComplete} style={styles.dismissButton}>
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Animated.View>
      )}

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

        {/* Upload Statement Card */}
        <TouchableOpacity
          style={styles.uploadCard}
          onPress={() => navigation.navigate('UploadStatement')}
          activeOpacity={0.7}
        >
          <View style={styles.uploadIconContainer}>
            <Ionicons name="cloud-upload" size={32} color="#fff" />
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>Upload Statement</Text>
            <Text style={styles.uploadSubtitle}>Add PDF bank statements</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Primary Action - Categorize Transactions */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={handleCategorizeTransactions}
          activeOpacity={0.7}
        >
          <View style={styles.primaryIconContainer}>
            <Ionicons name="card" size={32} color="#fff" />
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>Categorize Transactions</Text>
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

        {/* Gifted Tracker */}
        <TouchableOpacity
          style={styles.giftedCard}
          onPress={() => navigation.navigate('GiftedTracker')}
          activeOpacity={0.7}
        >
          <View style={styles.giftedIconContainer}>
            <Ionicons name="gift" size={32} color="#fff" />
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>Track Gifts</Text>
            <Text style={styles.giftedSubtitle}>Track PR packages & gifts</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Secondary Action - Qualify Transactions */}
        <TouchableOpacity
          style={styles.secondaryCard}
          onPress={() => navigation.navigate('QualifyTransactionList')}
          activeOpacity={0.7}
        >
          <View style={styles.secondaryIconContainer}>
            <Ionicons name="shield-checkmark" size={32} color="#fff" />
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>Qualify Transactions</Text>
            <Text style={styles.secondarySubtitle}>
              {loadingCounts
                ? 'Loading...'
                : unqualifiedCount > 0
                  ? `${unqualifiedCount} transaction${unqualifiedCount !== 1 ? 's' : ''} to qualify`
                  : 'All transactions qualified!'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Tip Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.tipText}>
            Tap the Overview tab below to see your financial summary, export data, and tax checklist.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  uploadBannerText: {
    flex: 1,
  },
  uploadBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  uploadBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  uploadCompleteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1333',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#10B98130',
  },
  uploadCompleteIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCompleteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  uploadCompleteSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
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
    marginBottom: 12,
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
  secondaryCard: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  secondarySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  uploadCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  giftedCard: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  giftedIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  giftedSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F59E0B20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
});
