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
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

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
          <Ionicons name="checkmark-circle" size={64} color={colors.positive} />
          <Text style={styles.emptyTitle}>All Done!</Text>
          <Text style={styles.emptyText}>No more subscriptions to review</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.goBack()}>
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Back to Transactions</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.progress}>
            {currentIndex + 1} / {subscriptions.length}
          </Text>
        </View>

        {/* Screen Label */}
        <Text style={styles.screenLabel}>SUBSCRIPTIONS</Text>

        {/* Hero Heading */}
        <Text style={styles.heroHeading}>{'review\nsubscriptions.'}</Text>

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
              <Text style={styles.detailValue}>{'\u00A3'}{currentSubscription.amount.toFixed(2)}</Text>
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
                  <Text style={styles.transactionAmount}>{'\u00A3'}{txn.amount.toFixed(2)}</Text>
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
                  color={selectedCategory === cat.id ? colors.white : colors.gradientMid}
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

          {/* Business Percentage Buttons */}
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
            activeOpacity={0.8}
            onPress={handleConfirm}
            disabled={processing || !selectedCategory}
          >
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.confirmButton, !selectedCategory && styles.confirmButtonDisabled]}
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
            </LinearGradient>
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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 16,
    color: colors.ink,
    fontFamily: fonts.display,
    marginTop: -1,
  },
  progress: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: '#FF4500',
    fontFamily: fonts.displaySemi,
    marginBottom: spacing.sm,
  },
  heroHeading: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  subscriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
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
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  frequencyText: {
    fontSize: 13,
    fontFamily: fonts.displaySemi,
    color: colors.tagExpenseText,
  },
  subscriptionDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  expandButtonText: {
    fontSize: 16,
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
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    width: '47%',
  },
  categoryButtonSelected: {
    backgroundColor: colors.gradientMid,
    borderColor: colors.gradientMid,
  },
  categoryButtonText: {
    fontSize: 15,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  categoryButtonTextSelected: {
    color: colors.white,
  },
  categoryBusinessLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.positive,
    marginTop: 4,
  },
  categoryBusinessLabelSelected: {
    color: 'rgba(255,255,255,0.8)',
  },
  businessSection: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  businessLabel: {
    fontSize: 16,
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
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  percentButtonActive: {
    backgroundColor: colors.gradientMid,
    borderColor: colors.gradientMid,
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
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  rejectButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  rejectButtonText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
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
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
});
