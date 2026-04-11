import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';
import { apiPost } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_EMOJI: Record<string, string> = {
  'Travel': '✈️',
  'Transport': '🚗',
  'Food & Drink': '🍔',
  'Office Supplies': '📎',
  'Software': '💻',
  'Equipment': '🖥️',
  'Phone': '📱',
  'Internet': '🌐',
  'Utilities': '💡',
  'Rent': '🏠',
  'Insurance': '🛡️',
  'Marketing': '📣',
  'Professional Services': '👔',
  'Training': '📚',
  'Entertainment': '🎭',
  'Clothing': '👕',
  'Health': '💊',
  'Subscriptions': '🔄',
  'Gifts': '🎁',
  'Income': '💰',
  'Freelance': '💼',
};

const getCategoryEmoji = (category: string): string => CATEGORY_EMOJI[category] || '📋';

const INTERSTITIAL_THRESHOLD = 15;

type CategorizedItem = {
  id: string;
  type: 'business' | 'personal' | 'unsure';
};

export default function SwipeCategorizeScreen({ navigation, route }: any) {
  const transactions: any[] = route.params?.transactions || [];

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categorized, setCategorized] = useState<CategorizedItem[]>([]);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smartCategorizeResult, setSmartCategorizeResult] = useState<any>(null);

  // Animation refs
  const slideOutAnim = useRef(new Animated.Value(0)).current;
  const slideInAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const currentTransaction = transactions[currentIndex];
  const totalCount = transactions.length;

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatAmount = (amount: number | string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const abs = Math.abs(num);
    const prefix = num < 0 ? '+' : '';
    return `${prefix}£${abs.toFixed(2)}`;
  };

  const animateCardTransition = useCallback((onComplete: () => void) => {
    // Slide current card out to the left and fade
    Animated.parallel([
      Animated.spring(slideOutAnim, {
        toValue: -SCREEN_WIDTH,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();

      // Reset position to come from right
      slideOutAnim.setValue(SCREEN_WIDTH);
      opacityAnim.setValue(0);

      // Slide in from right
      Animated.parallel([
        Animated.spring(slideOutAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 4,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [slideOutAnim, opacityAnim]);

  const handleCategorize = useCallback(async (type: 'business' | 'personal' | 'unsure') => {
    if (!currentTransaction) return;

    const id = currentTransaction.id;

    // Make the API call
    try {
      if (type === 'business') {
        await apiPost('/api/confirm_categorization', {
          transaction_ids: [id],
          action: 'confirm',
        });
      } else if (type === 'personal') {
        await apiPost('/api/confirm_categorization', {
          transaction_ids: [id],
          action: 'correct',
          correction: {
            category_id: 'personal',
            category_name: 'Personal',
            business_percent: 0,
            tax_deductible: false,
          },
        });
      }
      // 'unsure' — we skip the API call and just move on, it stays uncategorized
    } catch (error: any) {
      console.error('Error categorizing:', error.message);
    }

    const newCategorized = [...categorized, { id, type }];
    setCategorized(newCategorized);

    const nextIndex = currentIndex + 1;

    // Check if we should show the interstitial
    if (
      newCategorized.length === INTERSTITIAL_THRESHOLD &&
      nextIndex < totalCount
    ) {
      animateCardTransition(() => {
        setCurrentIndex(nextIndex);
        setShowInterstitial(true);
      });
      return;
    }

    // Check if we're done
    if (nextIndex >= totalCount) {
      animateCardTransition(() => {
        setCurrentIndex(nextIndex);
        setShowSummary(true);
      });
      return;
    }

    // Next card
    animateCardTransition(() => {
      setCurrentIndex(nextIndex);
    });
  }, [currentTransaction, currentIndex, categorized, totalCount, animateCardTransition]);

  const handleSmartCategorize = async () => {
    setLoading(true);
    try {
      const result = await apiPost('/api/smart_categorize', {});
      if (result.success) {
        setSmartCategorizeResult(result);
        setShowInterstitial(false);
        setShowSummary(true);
      } else {
        Alert.alert('Error', result.error || 'Failed to categorize');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to categorize');
    } finally {
      setLoading(false);
    }
  };

  const handleKeepGoing = () => {
    setShowInterstitial(false);
  };

  const handleConfirmAll = async () => {
    setLoading(true);
    try {
      const businessIds = categorized
        .filter(c => c.type === 'business')
        .map(c => c.id);

      if (businessIds.length > 0) {
        await apiPost('/api/confirm_categorization', {
          transaction_ids: businessIds,
          action: 'confirm',
        });
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to confirm');
    } finally {
      setLoading(false);
    }
  };

  const handleReviewIndividually = () => {
    navigation.goBack();
  };

  // Compute summary stats
  const businessCount = categorized.filter(c => c.type === 'business').length;
  const personalCount = categorized.filter(c => c.type === 'personal').length;
  const unsureCount = categorized.filter(c => c.type === 'unsure').length;
  const smartCount = smartCategorizeResult?.auto_categorized || 0;
  const needsReviewCount = smartCategorizeResult?.needs_review || 0;

  // Progress
  const progressFraction = totalCount > 0 ? Math.min(currentIndex + 1, totalCount) / totalCount : 0;

  // RENDER: Loading
  if (loading && !showSummary && !showInterstitial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ember} />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // RENDER: Summary view
  if (showSummary) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenLabel}>REVIEW</Text>
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryHeading}>all sorted.</Text>

          <View style={styles.summaryGrid}>
            {businessCount > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{businessCount}</Text>
                <Text style={styles.summaryLabel}>business</Text>
              </View>
            )}
            {personalCount > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{personalCount}</Text>
                <Text style={styles.summaryLabel}>personal</Text>
              </View>
            )}
            {smartCount > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{smartCount}</Text>
                <Text style={styles.summaryLabel}>AI sorted</Text>
              </View>
            )}
            {(unsureCount > 0 || needsReviewCount > 0) && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryNumber}>{unsureCount + needsReviewCount}</Text>
                <Text style={styles.summaryLabel}>need review</Text>
              </View>
            )}
          </View>

          <View style={styles.summaryActions}>
            <TouchableOpacity
              style={[styles.ctaButtonWrap, loading && styles.buttonDisabled]}
              onPress={handleConfirmAll}
              disabled={loading}
            >
              <LinearGradient
                colors={gradients.button as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.ctaButtonText}>Confirm all</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlinedButton} onPress={handleReviewIndividually}>
              <Text style={styles.outlinedButtonText}>Review individually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // RENDER: Interstitial (smart categorise offer)
  if (showInterstitial) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenLabel}>CATEGORISE</Text>
        </View>

        <View style={styles.interstitialContainer}>
          <View style={styles.interstitialCard}>
            {loading ? (
              <View style={styles.interstitialLoadingWrap}>
                <ActivityIndicator size="large" color={colors.ember} />
                <Text style={styles.interstitialLoadingText}>
                  AI is categorising your transactions...
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.interstitialHeading}>Nice work!</Text>
                <Text style={styles.interstitialBody}>
                  You've categorised {INTERSTITIAL_THRESHOLD} transactions. Want AI to handle the rest?
                </Text>

                <TouchableOpacity
                  style={styles.ctaButtonWrap}
                  onPress={handleSmartCategorize}
                >
                  <LinearGradient
                    colors={gradients.button as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButton}
                  >
                    <Text style={styles.ctaButtonText}>Smart categorise</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.outlinedButton} onPress={handleKeepGoing}>
                  <Text style={styles.outlinedButtonText}>Keep going manually</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // RENDER: Empty state
  if (!currentTransaction || transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenLabel}>CATEGORISE</Text>
        </View>
        <View style={styles.completionContainer}>
          <View style={styles.completionCard}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={styles.completionHeading}>All done!</Text>
            <TouchableOpacity
              style={styles.ctaButtonWrap}
              onPress={() => navigation.goBack()}
            >
              <LinearGradient
                colors={gradients.button as unknown as string[]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Back to transactions</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Get emoji for current transaction
  const categoryName = currentTransaction.auto_category_name || currentTransaction.category_name || '';
  const emoji = getCategoryEmoji(categoryName);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenLabel}>CATEGORISE</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={gradients.warm as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressFraction * 100}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.min(currentIndex + 1, totalCount)} of {totalCount}
        </Text>
      </View>

      {/* Transaction card */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.transactionCard,
            {
              transform: [{ translateX: slideOutAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Emoji icon */}
          <View style={styles.emojiCircle}>
            <Text style={styles.emojiText}>{emoji}</Text>
          </View>

          {/* Merchant name */}
          <Text style={styles.merchantName} numberOfLines={2}>
            {currentTransaction.merchant_name || 'Unknown'}
          </Text>

          {/* Date */}
          <Text style={styles.dateText}>
            {formatDate(currentTransaction.transaction_date)}
          </Text>

          {/* Amount */}
          <Text style={styles.amountText}>
            {formatAmount(currentTransaction.amount)}
          </Text>

          {/* AI suggestion hint */}
          {categoryName ? (
            <Text style={styles.aiHint}>
              AI thinks: {categoryName}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={styles.buttonsContainer}>
        {/* Business button */}
        <TouchableOpacity
          style={styles.ctaButtonWrap}
          onPress={() => handleCategorize('business')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradients.button as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaButtonText}>Business</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Personal button */}
        <TouchableOpacity
          style={styles.outlinedButton}
          onPress={() => handleCategorize('personal')}
          activeOpacity={0.8}
        >
          <Text style={styles.outlinedButtonText}>Personal</Text>
        </TouchableOpacity>

        {/* Not sure button */}
        <TouchableOpacity
          style={styles.notSureButton}
          onPress={() => handleCategorize('unsure')}
          activeOpacity={0.7}
        >
          <Text style={styles.notSureText}>Not sure</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.inkMuted,
    fontFamily: fonts.body,
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.parchment,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.ember,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.inkFaint,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    textAlign: 'right',
  },

  // Transaction card
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  transactionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blush,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emojiText: {
    fontSize: 20,
  },
  merchantName: {
    fontSize: 22,
    fontFamily: fonts.displayMed,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 32,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  aiHint: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Buttons
  buttonsContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  ctaButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  ctaButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 17,
    fontFamily: fonts.displayMed,
  },
  outlinedButton: {
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.inkFaint,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButtonText: {
    color: colors.ink,
    fontSize: 17,
    fontFamily: fonts.displayMed,
  },
  notSureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  notSureText: {
    color: colors.inkMuted,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Interstitial
  interstitialContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  interstitialCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
  },
  interstitialHeading: {
    fontSize: 24,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  interstitialBody: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  interstitialLoadingWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  interstitialLoadingText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.inkMuted,
    textAlign: 'center',
  },

  // Completion
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  completionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
  },
  completionEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  completionHeading: {
    fontSize: 24,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },

  // Summary
  summaryContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  summaryHeading: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: spacing.xxl,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '47%',
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.inkMuted,
  },
  summaryActions: {
    gap: spacing.md,
    marginTop: 'auto',
    paddingBottom: spacing.xxxl,
  },
});
