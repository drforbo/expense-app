import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';
import { apiPost } from '../../lib/api';
import { supabase } from '../../lib/supabase';

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
  const passedTransactions: any[] = route.params?.transactions || [];

  // State
  const [transactions, setTransactions] = useState<any[]>(passedTransactions);
  const [initialLoading, setInitialLoading] = useState(passedTransactions.length === 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [categorized, setCategorized] = useState<CategorizedItem[]>([]);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [smartCategorizeResult, setSmartCategorizeResult] = useState<any>(null);
  const [pendingPersonalId, setPendingPersonalId] = useState<string | null>(null);
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [userWorkType, setUserWorkType] = useState<string | null>(null);
  const [userJobRole, setUserJobRole] = useState<string | null>(null);

  // Animation refs
  const slideOutAnim = useRef(new Animated.Value(0)).current;
  const slideInAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Auto-fetch uncategorized transactions if none passed
  useEffect(() => {
    if (passedTransactions.length === 0) {
      fetchUncategorized();
    }
  }, []);

  const fetchUncategorized = async () => {
    try {
      setInitialLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch profile + transactions in parallel
      const [profileRes, result] = await Promise.all([
        supabase.from('user_profiles').select('work_type, job_role').eq('user_id', user.id).single(),
        apiPost('/api/get_uncategorized_transactions', { user_id: user.id }),
      ]);
      setUserWorkType(profileRes.data?.work_type || null);
      setUserJobRole(profileRes.data?.job_role || null);
      const mapped = (result.transactions || []).map((t: any) => ({
        id: t.transaction_id || t.id,
        merchant_name: t.merchant_name || t.name || 'Unknown',
        amount: t.amount,
        transaction_date: t.date || t.transaction_date,
        category_name: Array.isArray(t.category) ? t.category[0] : t.category_name,
        auto_category_name: Array.isArray(t.category) ? t.category[0] : t.auto_category_name,
        auto_status: t.auto_status || null,
        auto_confidence: t.auto_confidence ?? null,
        auto_explanation: t.auto_explanation || null,
        auto_tip_for_user: t.auto_tip_for_user || null,
      }));
      setTransactions(mapped);
    } catch (error) {
      console.error('Error fetching uncategorized:', error);
    } finally {
      setInitialLoading(false);
    }
  };

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

  const handleCategorize = useCallback(async (type: 'business' | 'personal' | 'unsure', personalReason?: string) => {
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
          personal_reason: personalReason || null,
        });
      }
      // 'unsure' — we skip the API call and just move on, it stays uncategorized
    } catch (error: any) {
      console.error('Error categorizing:', error.message);
    }

    // Reset the personal-reason expander for the next card
    setPendingPersonalId(null);

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
        Alert.alert('Something went wrong', 'Smart categorise isn\'t available right now. You can keep going manually.');
      }
    } catch (error: any) {
      Alert.alert('Something went wrong', 'Smart categorise isn\'t available right now. You can keep going manually.');
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

  // RENDER: Initial loading (fetching uncategorized)
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.screenLabel}>CATEGORISE</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // RENDER: Loading (processing categorization)
  if (loading && !showSummary && !showInterstitial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
                <Text style={styles.summaryLabel}>auto sorted</Text>
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
                  Smart categorising your transactions...
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.interstitialHeading}>Nice work!</Text>
                <Text style={styles.interstitialBody}>
                  You've categorised {INTERSTITIAL_THRESHOLD} transactions. Want to smart categorise the rest?
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
          <Text style={styles.completionEmoji}>🎉</Text>
          <Text style={styles.completionHeading}>All done!</Text>
          <Text style={styles.completionSub}>No transactions to categorise right now.</Text>
        </View>
        <View style={styles.completionActions}>
          <TouchableOpacity
            style={styles.completionButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.completionButtonText}>Back to transactions</Text>
          </TouchableOpacity>
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
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => setShowHelpSheet(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.helpButtonText}>?</Text>
        </TouchableOpacity>
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

          {/* Category suggestion hint */}
          {categoryName ? (
            <Text style={styles.aiHint}>
              Suggested: {categoryName}
            </Text>
          ) : null}

          {/* Stage 1: Why we think this */}
          {currentTransaction.auto_explanation ? (
            <View style={styles.contextBlock}>
              <Text style={styles.contextLabel}>WHY WE THINK THIS</Text>
              <Text style={styles.contextText}>{currentTransaction.auto_explanation}</Text>
            </View>
          ) : null}

          {/* Stage 1: Personalised tip */}
          {currentTransaction.auto_tip_for_user ? (
            <View style={[styles.contextBlock, styles.contextBlockTip]}>
              <Text style={[styles.contextLabel, styles.contextLabelTip]}>FOR YOU</Text>
              <Text style={styles.contextText}>{currentTransaction.auto_tip_for_user}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {/* Action buttons */}
      {pendingPersonalId === currentTransaction.id ? (
        /* Personal "why?" chip row — replaces buttons while resolving */
        <View style={styles.personalReasonContainer}>
          <Text style={styles.personalReasonPrompt}>Why personal?</Text>
          <View style={styles.chipRow}>
            {[
              { key: 'home', label: '🏠 At home' },
              { key: 'personal_item', label: '🛍️ Personal item' },
              { key: 'gift', label: '🎁 Gift' },
              { key: 'other', label: '✨ Other' },
            ].map(c => (
              <TouchableOpacity
                key={c.key}
                style={styles.chip}
                onPress={() => handleCategorize('personal', c.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.chipSkip}
            onPress={() => handleCategorize('personal')}
            activeOpacity={0.7}
          >
            <Text style={styles.chipSkipText}>Skip reason</Text>
          </TouchableOpacity>
        </View>
      ) : (
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

          {/* Personal button — opens the why-chips */}
          <TouchableOpacity
            style={styles.outlinedButton}
            onPress={() => setPendingPersonalId(currentTransaction.id)}
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
      )}

      {/* Help sheet — "What counts as business for me" */}
      <HelpSheet
        visible={showHelpSheet}
        onClose={() => setShowHelpSheet(false)}
        workType={userWorkType}
        jobRole={userJobRole}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.onSurfaceMuted,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.primary,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 5,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
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
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emojiText: {
    fontSize: 22,
  },
  merchantName: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
  },
  amountText: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: spacing.lg,
    letterSpacing: -1,
  },
  aiHint: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // Buttons — pill shapes, no borders
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
    paddingVertical: 18,
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
    backgroundColor: colors.surfaceLowest,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButtonText: {
    color: colors.onSurface,
    fontSize: 17,
    fontFamily: fonts.displayMed,
  },
  notSureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  notSureText: {
    color: colors.onSurfaceMuted,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Interstitial
  interstitialContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  interstitialCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  interstitialHeading: {
    fontSize: 26,
    fontFamily: fonts.display,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  interstitialBody: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 23,
  },
  interstitialLoadingWrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  interstitialLoadingText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
  },

  // Completion
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  completionEmoji: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  completionHeading: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  completionSub: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  completionActions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  completionButton: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.full,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
  },
  completionButtonText: {
    color: colors.onSurface,
    fontSize: 17,
    fontFamily: fonts.displayMed,
  },

  // Summary
  summaryContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  summaryHeading: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.onSurface,
    letterSpacing: -1,
    marginBottom: spacing.xxl,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.xxxl,
  },
  summaryCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '47%',
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 34,
    fontFamily: fonts.display,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
  },
  summaryActions: {
    gap: spacing.md,
    marginTop: 'auto',
    paddingBottom: spacing.xxxl,
  },

  // Help button in header
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
  },
  helpButtonText: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },

  // Stage 1: context blocks on swipe card
  contextBlock: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignSelf: 'stretch',
  },
  contextBlockTip: {
    backgroundColor: colors.tagExpenseBg,
  },
  contextLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.onSurfaceMuted,
    marginBottom: 4,
  },
  contextLabelTip: {
    color: colors.primary,
  },
  contextText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurface,
    lineHeight: 18,
  },

  // Personal-reason chips (replaces buttons row while resolving)
  personalReasonContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  personalReasonPrompt: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  chip: {
    backgroundColor: colors.surfaceLowest,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  chipSkip: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  chipSkipText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
    textDecorationLine: 'underline',
  },

  // Help sheet
  helpSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  helpSheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    maxHeight: '85%',
  },
  helpSheetGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceContainerHigh,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  helpSheetTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.onSurface,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  helpSheetSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceMuted,
    marginBottom: spacing.lg,
  },
  helpEntry: {
    marginBottom: spacing.lg,
  },
  helpEntryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  helpEntryEmoji: {
    fontSize: 20,
  },
  helpEntryTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
  },
  helpEntryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
  },
  helpBadgeBusiness: {
    backgroundColor: 'rgba(46,125,50,0.14)',
  },
  helpBadgePersonal: {
    backgroundColor: colors.surfaceContainerLow,
  },
  helpBadgeMixed: {
    backgroundColor: colors.tagExpenseBg,
  },
  helpEntryBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  helpEntryBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
    lineHeight: 19,
    marginLeft: 30,
  },
  helpCloseButton: {
    backgroundColor: colors.primaryContainer,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  helpCloseButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurface,
  },
});

// ---- HelpSheet: "What counts as business for me?" -------------------------

type HelpEntry = {
  emoji: string;
  title: string;
  verdict: 'BUSINESS' | 'PERSONAL' | 'MIXED';
  body: string;
};

const HELP_ENTRIES_BY_WORKTYPE: Record<string, HelpEntry[]> = {
  content_creation: [
    { emoji: '🎥', title: 'Cameras, lights, microphones', verdict: 'BUSINESS', body: 'Equipment used to film content is deductible — even if you occasionally use it personally.' },
    { emoji: '💻', title: 'Editing software & subscriptions', verdict: 'BUSINESS', body: 'Adobe, Final Cut, Canva, Notion — anything you use to make or run the channel.' },
    { emoji: '🛍️', title: 'Props & wardrobe for shoots', verdict: 'MIXED', body: 'Bought specifically for content? Business. Wearing it day-to-day too? Probably personal.' },
    { emoji: '✈️', title: 'Travel for brand trips or location shoots', verdict: 'BUSINESS', body: 'Trains, taxis, accommodation when the trip is for content — keep receipts.' },
    { emoji: '🛒', title: 'Weekly grocery shop', verdict: 'PERSONAL', body: 'Food for yourself never counts, even if you film recipes occasionally.' },
  ],
  freelancing: [
    { emoji: '💻', title: 'Design / dev software, tools', verdict: 'BUSINESS', body: 'Figma, GitHub, Notion, anything you use to deliver client work.' },
    { emoji: '🚆', title: 'Travel to a client', verdict: 'BUSINESS', body: 'Trains, taxis, mileage — including parking — when going to see a client.' },
    { emoji: '📚', title: 'Courses & training', verdict: 'BUSINESS', body: 'Skill-building that helps your freelance work. Keep the receipt.' },
    { emoji: '🍽️', title: 'Lunch alone while working', verdict: 'PERSONAL', body: 'You\'d eat anyway. Subsistence only counts on overnight business trips.' },
    { emoji: '🏠', title: 'Working from home', verdict: 'BUSINESS', body: 'You can claim a portion of bills (£6/wk flat rate, or actual cost) — set in Profile.' },
  ],
  side_hustle: [
    { emoji: '📦', title: 'Stock you bought to resell', verdict: 'BUSINESS', body: 'Cost of goods sold. Track what you paid versus what you sold it for.' },
    { emoji: '📮', title: 'Packaging & postage', verdict: 'BUSINESS', body: 'Tape, mailers, Royal Mail labels, returns postage — all deductible.' },
    { emoji: '💸', title: 'Marketplace & payment fees', verdict: 'BUSINESS', body: 'Depop, eBay, Vinted, PayPal, Stripe fees — keep records.' },
    { emoji: '📸', title: 'Photo lighting / props for listings', verdict: 'BUSINESS', body: 'If you bought it to photograph stock, it\'s a business cost.' },
    { emoji: '☕', title: 'Coffee while sorting stock', verdict: 'PERSONAL', body: 'Day-to-day food and drink stays personal even when you\'re working.' },
  ],
};

const DEFAULT_HELP_ENTRIES: HelpEntry[] = [
  { emoji: '🛠️', title: 'Anything used solely for work', verdict: 'BUSINESS', body: 'If you only bought it because of your work, it\'s a business expense.' },
  { emoji: '🔀', title: 'Used for both work and personal', verdict: 'MIXED', body: 'Estimate the % that\'s business and claim that portion. Phone bills, home office, etc.' },
  { emoji: '🛒', title: 'Personal life stuff', verdict: 'PERSONAL', body: 'Groceries, rent, regular commute, personal subscriptions — never claim these.' },
  { emoji: '🏛️', title: 'HMRC tax payments', verdict: 'PERSONAL', body: 'Self Assessment, National Insurance — these are your personal tax bills, not deductions.' },
];

function HelpSheet({
  visible,
  onClose,
  workType,
  jobRole,
}: {
  visible: boolean;
  onClose: () => void;
  workType: string | null;
  jobRole: string | null;
}) {
  const entries = (workType && HELP_ENTRIES_BY_WORKTYPE[workType]) || DEFAULT_HELP_ENTRIES;
  const subtitle = jobRole
    ? `Examples for ${jobRole.toLowerCase()}. Use as a guide, not a rule.`
    : 'Examples based on what you told us. Use as a guide, not a rule.';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.helpSheetBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.helpSheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.helpSheetGrabber} />
          <Text style={styles.helpSheetTitle}>What counts as business?</Text>
          <Text style={styles.helpSheetSubtitle}>{subtitle}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {entries.map((entry, i) => {
              const badgeStyle =
                entry.verdict === 'BUSINESS' ? styles.helpBadgeBusiness :
                entry.verdict === 'PERSONAL' ? styles.helpBadgePersonal :
                styles.helpBadgeMixed;
              const badgeColor =
                entry.verdict === 'BUSINESS' ? colors.positive :
                entry.verdict === 'PERSONAL' ? colors.onSurfaceMuted :
                colors.primary;
              return (
                <View key={i} style={styles.helpEntry}>
                  <View style={styles.helpEntryHeader}>
                    <Text style={styles.helpEntryEmoji}>{entry.emoji}</Text>
                    <Text style={styles.helpEntryTitle}>{entry.title}</Text>
                    <View style={[styles.helpEntryBadge, badgeStyle]}>
                      <Text style={[styles.helpEntryBadgeText, { color: badgeColor }]}>
                        {entry.verdict}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.helpEntryBody}>{entry.body}</Text>
                </View>
              );
            })}

            <TouchableOpacity style={styles.helpCloseButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.helpCloseButtonText}>Got it</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
