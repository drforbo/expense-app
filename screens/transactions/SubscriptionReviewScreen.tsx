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
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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

      const data = await apiPost('/api/confirm_subscription', {
        user_id: user.id,
        subscription: currentSubscription,
        category_id: selectedCategory,
        category_name: category?.name || selectedCategory,
        business_percent: businessPercent,
        apply_to_past: true
      });

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

      await apiPost('/api/reject_subscription', {
        user_id: user.id,
        subscription: currentSubscription
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
          <Ionicons name="checkmark-circle" size={64} color={colors.tagGreenText} />
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
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.progress}>
            {currentIndex + 1} / {subscriptions.length}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <View style={styles.subscriptionIcon}>
            <Ionicons name="repeat" size={28} color={colors.ember} />
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
              color={colors.midGrey}
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
                  color={selectedCategory === cat.id ? colors.white : colors.ember}
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
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
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
    backgroundColor: colors.parchment,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progress: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  subscriptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.tagEmberBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  merchantName: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
    flex: 1,
  },
  frequencyBadge: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.lg,
  },
  frequencyText: {
    fontSize: 12,
    fontFamily: fonts.displaySemi,
    color: colors.white,
  },
  subscriptionDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.mist,
    gap: spacing.xs,
  },
  expandButtonText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  transactionsList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.parchment,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  transactionDate: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  transactionAmount: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    width: '47%',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  categoryButtonSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  categoryButtonTextSelected: {
    color: colors.white,
  },
  categoryBusinessLabel: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.tagGreenText,
    marginTop: 4,
  },
  categoryBusinessLabelSelected: {
    color: colors.volt,
  },
  businessSection: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  businessLabel: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  businessButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  percentButton: {
    flex: 1,
    backgroundColor: colors.parchment,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  percentButtonActive: {
    backgroundColor: colors.ink,
  },
  percentButtonText: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
  percentButtonTextActive: {
    color: colors.white,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  confirmButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.mist,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.mist,
  },
  rejectButtonText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: spacing.lg,
  },
  doneButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
});
