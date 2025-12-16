import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

interface SubscriptionTransaction {
  id: string;
  date: string;
  amount: number;
}

interface DetectedSubscription {
  merchantNormalized: string;
  merchantDisplay: string;
  amount: number;
  frequency: 'weekly' | 'monthly' | 'yearly';
  avgIntervalDays: number;
  confidence: number;
  transactionCount: number;
  transactions: SubscriptionTransaction[];
  lastChargeDate: string;
  nextExpectedDate: string;
}

// Common subscription categories
const QUICK_CATEGORIES = [
  { id: 'subscriptions', name: 'Subscriptions', icon: 'repeat', businessPercent: 0 },
  { id: 'software_subscriptions', name: 'Software & Tools', icon: 'desktop-outline', businessPercent: 100 },
  { id: 'entertainment', name: 'Entertainment', icon: 'play-circle-outline', businessPercent: 0 },
  { id: 'utilities', name: 'Utilities', icon: 'flash-outline', businessPercent: 0 },
];

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.119:3000';

export default function SubscriptionReviewScreen({ route, navigation }: any) {
  const { subscriptions: initialSubscriptions } = route.params || {};

  const [subscriptions, setSubscriptions] = useState<DetectedSubscription[]>(initialSubscriptions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [businessPercent, setBusinessPercent] = useState(0);

  const currentSubscription = subscriptions[currentIndex];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return freq;
    }
  };

  const handleConfirm = async () => {
    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a category for this subscription');
      return;
    }

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const category = QUICK_CATEGORIES.find(c => c.id === selectedCategory);

      const response = await fetch(`${API_URL}/api/confirm_subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          subscription: currentSubscription,
          category_id: selectedCategory,
          category_name: category?.name || selectedCategory,
          business_percent: businessPercent,
          apply_to_past: true
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Subscription Confirmed',
          `${data.categorizedCount} ${currentSubscription.merchantDisplay} transactions categorized as ${category?.name}`,
          [{ text: 'OK', onPress: moveToNext }]
        );
      } else {
        throw new Error(data.error || 'Failed to confirm subscription');
      }
    } catch (error: any) {
      console.error('Error confirming subscription:', error);
      Alert.alert('Error', error.message || 'Failed to confirm subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await fetch(`${API_URL}/api/reject_subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          subscription: currentSubscription
        }),
      });

      moveToNext();
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      moveToNext(); // Move on anyway
    } finally {
      setProcessing(false);
    }
  };

  const moveToNext = () => {
    setSelectedCategory(null);
    setBusinessPercent(0);
    setExpandedTransactions(false);

    if (currentIndex + 1 < subscriptions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  if (!currentSubscription) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          <Text style={styles.emptyTitle}>All Done!</Text>
          <Text style={styles.emptyText}>No more subscriptions to review</Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Back to Transactions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.progress}>
            {currentIndex + 1} / {subscriptions.length}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.subscriptionIcon}>
            <Ionicons name="repeat" size={28} color="#7C3AED" />
          </View>
          <Text style={styles.title}>Subscription Detected</Text>
          <Text style={styles.subtitle}>
            We found a recurring charge that looks like a subscription
          </Text>
        </View>

        {/* Subscription Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.merchantName}>{currentSubscription.merchantDisplay}</Text>
            <View style={styles.frequencyBadge}>
              <Text style={styles.frequencyText}>
                {getFrequencyLabel(currentSubscription.frequency)}
              </Text>
            </View>
          </View>

          <View style={styles.subscriptionDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount</Text>
              <Text style={styles.detailValue}>£{currentSubscription.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Occurrences</Text>
              <Text style={styles.detailValue}>{currentSubscription.transactionCount} charges</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Charge</Text>
              <Text style={styles.detailValue}>{formatDate(currentSubscription.lastChargeDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Confidence</Text>
              <Text style={styles.detailValue}>{Math.round(currentSubscription.confidence * 100)}%</Text>
            </View>
          </View>

          {/* Expandable Transactions List */}
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setExpandedTransactions(!expandedTransactions)}
          >
            <Text style={styles.expandButtonText}>
              {expandedTransactions ? 'Hide' : 'Show'} {currentSubscription.transactionCount} transactions
            </Text>
            <Ionicons
              name={expandedTransactions ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {expandedTransactions && (
            <View style={styles.transactionsList}>
              {currentSubscription.transactions.map((txn, index) => (
                <View key={txn.id} style={styles.transactionItem}>
                  <Text style={styles.transactionDate}>{formatDate(txn.date)}</Text>
                  <Text style={styles.transactionAmount}>£{txn.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Category Selection */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>How should we categorize this?</Text>

          <View style={styles.categoryGrid}>
            {QUICK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat.id && styles.categoryButtonSelected
                ]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setBusinessPercent(cat.businessPercent);
                }}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={24}
                  color={selectedCategory === cat.id ? '#fff' : '#7C3AED'}
                />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === cat.id && styles.categoryButtonTextSelected
                ]}>
                  {cat.name}
                </Text>
                {cat.businessPercent > 0 && (
                  <Text style={[
                    styles.categoryBusinessLabel,
                    selectedCategory === cat.id && styles.categoryBusinessLabelSelected
                  ]}>
                    {cat.businessPercent}% Business
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Business Percentage Slider */}
          {selectedCategory && (
            <View style={styles.businessSection}>
              <Text style={styles.businessLabel}>Business Use: {businessPercent}%</Text>
              <View style={styles.businessButtons}>
                {[0, 25, 50, 75, 100].map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={[
                      styles.percentButton,
                      businessPercent === percent && styles.percentButtonActive
                    ]}
                    onPress={() => setBusinessPercent(percent)}
                  >
                    <Text style={[
                      styles.percentButtonText,
                      businessPercent === percent && styles.percentButtonTextActive
                    ]}>
                      {percent}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.confirmButton, !selectedCategory && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={processing || !selectedCategory}
          >
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>
                  Confirm & Categorize All
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
            disabled={processing}
          >
            <Text style={styles.rejectButtonText}>Not a Subscription</Text>
          </TouchableOpacity>
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
  progress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subscriptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C3AED20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  subscriptionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  frequencyBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  subscriptionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  transactionsList: {
    marginTop: 12,
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2E1A47',
    padding: 12,
    borderRadius: 8,
  },
  transactionDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryButton: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryButtonTextSelected: {
    color: '#fff',
  },
  categoryBusinessLabel: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 4,
  },
  categoryBusinessLabelSelected: {
    color: '#A7F3D0',
  },
  businessSection: {
    marginTop: 20,
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
  },
  businessLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  businessButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  percentButton: {
    flex: 1,
    backgroundColor: '#2E1A47',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  percentButtonActive: {
    backgroundColor: '#7C3AED',
  },
  percentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  percentButtonTextActive: {
    color: '#fff',
  },
  actionButtons: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#374151',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  doneButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
