import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'registration' | 'tracking' | 'deadline' | 'preparation';
  completed: boolean;
  relevantTo: string[]; // work types or conditions
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

interface UserProfile {
  work_type: string;
  monthly_income: number;
  receives_gifted_items: boolean;
  has_international_income: boolean;
  tracking_goal: string;
  tax_region?: string;
  student_loan_plan?: string;
}

interface TrackingStats {
  uncategorizedCount: number;
  categorizedIncomeCount: number;
  categorizedExpenseCount: number;
  unqualifiedExpenseCount: number;
  giftedItemsCount: number;
  totalTransactions: number;
}

const CATEGORY_COLORS = {
  registration: colors.ink,
  tracking: colors.tagBlueText,
  deadline: colors.ember,
  preparation: colors.tagGreenText,
};

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  registration: 'document-text',
  tracking: 'analytics',
  deadline: 'calendar',
  preparation: 'folder-open',
};

export default function TaxChecklistScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [trackingStats, setTrackingStats] = useState<TrackingStats>({
    uncategorizedCount: 0,
    categorizedIncomeCount: 0,
    categorizedExpenseCount: 0,
    unqualifiedExpenseCount: 0,
    giftedItemsCount: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    fetchProfileAndChecklist();
    loadCompletedItems();
    fetchTrackingStats();
  }, []);

  const fetchTrackingStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch uncategorized count from server
      const uncategorizedData = await apiPost('/api/get_uncategorized_transactions', { user_id: user.id });

      // Fetch categorized transactions
      const { data: categorized } = await supabase
        .from('categorized_transactions')
        .select('transaction_type, qualified')
        .eq('user_id', user.id);

      const incomeCount = categorized?.filter(t => t.transaction_type === 'income').length || 0;
      const expenseCount = categorized?.filter(t => t.transaction_type === 'expense').length || 0;
      const unqualifiedCount = categorized?.filter(t => t.transaction_type === 'expense' && !t.qualified).length || 0;

      // Fetch gifted items count
      const { data: giftedItems } = await supabase
        .from('gifted_items')
        .select('id')
        .eq('user_id', user.id);

      setTrackingStats({
        uncategorizedCount: uncategorizedData.count || 0,
        categorizedIncomeCount: incomeCount,
        categorizedExpenseCount: expenseCount,
        unqualifiedExpenseCount: unqualifiedCount,
        giftedItemsCount: giftedItems?.length || 0,
        totalTransactions: (uncategorizedData.count || 0) + (categorized?.length || 0),
      });
    } catch (error) {
      console.error('Error fetching tracking stats:', error);
    }
  };

  const loadCompletedItems = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_checklist_progress')
        .select('item_id')
        .eq('user_id', user.id);

      if (data) {
        setCompletedItems(new Set(data.map(item => item.item_id)));
      }
    } catch (error) {
      console.error('Error loading checklist progress:', error);
    }
  };

  const fetchProfileAndChecklist = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfile(profileData);
      generateChecklist(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Generate default checklist
      generateChecklist(null);
    } finally {
      setLoading(false);
    }
  };

  const generateChecklist = (userProfile: UserProfile | null) => {
    const items: ChecklistItem[] = [];

    // Registration items
    if (!userProfile || userProfile.tracking_goal === 'not_registered') {
      items.push({
        id: 'register_hmrc',
        title: 'Register for Self Assessment',
        description: 'Register with HMRC as self-employed. This is required if you earn over £1,000 from self-employment.',
        category: 'registration',
        completed: false,
        relevantTo: ['all'],
        priority: 'high',
      });

      items.push({
        id: 'get_utr',
        title: 'Get your UTR number',
        description: 'You\'ll receive your Unique Taxpayer Reference (UTR) within 10 days of registering.',
        category: 'registration',
        completed: false,
        relevantTo: ['all'],
        priority: 'high',
      });
    }

    // Always relevant tracking items
    items.push({
      id: 'track_income',
      title: 'Track all income sources',
      description: 'Keep records of all money you earn, including payments from brands, affiliate income, and product sales.',
      category: 'tracking',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
    });

    items.push({
      id: 'track_expenses',
      title: 'Categorize business expenses',
      description: 'Sort your expenses into HMRC categories. Bopp helps automate this!',
      category: 'tracking',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
    });

    items.push({
      id: 'keep_receipts',
      title: 'Save receipts & invoices',
      description: 'Keep receipts for at least 5 years. Digital copies are acceptable.',
      category: 'tracking',
      completed: false,
      relevantTo: ['all'],
      priority: 'medium',
    });

    // Gifted items specific
    if (userProfile?.receives_gifted_items) {
      items.push({
        id: 'track_gifted',
        title: 'Record gifted items',
        description: 'Track PR packages and gifted products with their retail value. These count as income!',
        category: 'tracking',
        completed: false,
        relevantTo: ['content_creation'],
        priority: 'high',
      });
    }

    // International income specific
    if (userProfile?.has_international_income) {
      items.push({
        id: 'foreign_income',
        title: 'Declare foreign income',
        description: 'Report income from overseas sources like international brand deals or foreign platforms.',
        category: 'tracking',
        completed: false,
        relevantTo: ['international'],
        priority: 'high',
      });
    }

    // Tax deadline items
    const now = new Date();
    const currentYear = now.getFullYear();
    const taxDeadline = new Date(currentYear, 0, 31); // January 31

    // If past Jan 31, show next year's deadline
    if (now > taxDeadline) {
      taxDeadline.setFullYear(currentYear + 1);
    }

    items.push({
      id: 'file_return',
      title: 'File your tax return',
      description: `Submit your Self Assessment by ${taxDeadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      category: 'deadline',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
      dueDate: taxDeadline.toISOString(),
    });

    items.push({
      id: 'pay_tax',
      title: 'Pay your tax bill',
      description: 'Pay any tax owed by January 31st to avoid penalties.',
      category: 'deadline',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
      dueDate: taxDeadline.toISOString(),
    });

    // Set aside money - CONSERVATIVE calculation based on income
    // Uses higher Scottish rates if applicable, plus 5% buffer
    const monthlyIncome = userProfile?.monthly_income || 0;
    const yearlyIncome = monthlyIncome * 12;
    const taxRegion = userProfile?.tax_region || 'england';
    const isScotland = taxRegion === 'scotland';

    // Use higher Scottish rates for conservative estimate
    const basicRate = isScotland ? 0.21 : 0.20;
    const higherRate = isScotland ? 0.42 : 0.40;

    let taxBand = isScotland ? '21%' : '20%';
    let estimatedTax = 0;

    if (yearlyIncome > 12570) {
      if (yearlyIncome > 50270) {
        taxBand = isScotland ? '42%' : '40%';
        estimatedTax = (50270 - 12570) * basicRate + (yearlyIncome - 50270) * higherRate;
      } else {
        estimatedTax = (yearlyIncome - 12570) * basicRate;
      }
    }

    // Add student loan repayments if applicable
    const studentLoan = userProfile?.student_loan_plan || 'none';
    if (studentLoan !== 'none') {
      let slThreshold = 0;
      switch (studentLoan) {
        case 'plan1': slThreshold = 24990; break;
        case 'plan2': slThreshold = 27295; break;
        case 'plan4': slThreshold = 31395; break;
        case 'plan5': slThreshold = 25000; break;
        case 'postgrad': slThreshold = 21000; break;
      }
      if (yearlyIncome > slThreshold) {
        const slRate = studentLoan === 'postgrad' ? 0.06 : 0.09;
        estimatedTax += (yearlyIncome - slThreshold) * slRate;
      }
    }

    // Apply 5% conservative buffer - ensures users save enough
    estimatedTax = estimatedTax * 1.05;

    items.push({
      id: 'set_aside',
      title: 'Set aside money for tax',
      description: `Consider saving ~£${Math.round(estimatedTax / 12)}/month (conservative estimate, actual may be lower).`,
      category: 'preparation',
      completed: false,
      relevantTo: ['all'],
      priority: 'high',
    });

    // High income specific
    if (yearlyIncome > 50000) {
      items.push({
        id: 'payments_on_account',
        title: 'Prepare for payments on account',
        description: 'Once your tax bill exceeds £1,000, you\'ll need to make advance payments.',
        category: 'preparation',
        completed: false,
        relevantTo: ['high_income'],
        priority: 'medium',
      });
    }

    // Preparation items
    items.push({
      id: 'export_records',
      title: 'Export your records',
      description: 'Download your categorized expenses ready for your tax return.',
      category: 'preparation',
      completed: false,
      relevantTo: ['all'],
      priority: 'medium',
    });

    // Sort by priority and category
    items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setChecklist(items);
  };

  const toggleItem = async (itemId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const isCompleted = completedItems.has(itemId);

      if (isCompleted) {
        // Remove completion
        await supabase
          .from('user_checklist_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', itemId);

        setCompletedItems(prev => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      } else {
        // Mark as completed
        await supabase
          .from('user_checklist_progress')
          .upsert({
            user_id: user.id,
            item_id: itemId,
            completed_at: new Date().toISOString(),
          });

        setCompletedItems(prev => new Set([...prev, itemId]));
      }
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      Alert.alert('Error', 'Failed to update checklist');
    }
  };

  const completedCount = checklist.filter(item => completedItems.has(item.id)).length;
  const totalCount = checklist.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.ink} />
          <Text style={styles.loadingText}>Loading checklist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group items by category
  const groupedItems = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categoryOrder: Array<'registration' | 'tracking' | 'deadline' | 'preparation'> =
    ['registration', 'tracking', 'deadline', 'preparation'];

  const categoryLabels = {
    registration: 'Registration',
    tracking: 'Record Keeping',
    deadline: 'Key Deadlines',
    preparation: 'Tax Preparation',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tax Checklist</Text>
          <Text style={styles.subtitle}>Your personalized to-do list</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* In Progress with bopp - Achievement Card */}
        <View style={styles.achievementCard}>
          <View style={styles.achievementHeader}>
            <View style={styles.achievementIconContainer}>
              <Ionicons name="rocket" size={24} color={colors.ink} />
            </View>
            <View style={styles.achievementHeaderText}>
              <Text style={styles.achievementTitle}>In Progress with bopp</Text>
              <Text style={styles.achievementSubtitle}>Tax Year 2024/25</Text>
            </View>
          </View>

          {/* Track Income Card */}
          <TouchableOpacity
            style={styles.trackingCard}
            onPress={() => navigation.navigate('CategorizedTransactions', { filterType: 'income' })}
          >
            <View style={styles.trackingHeader}>
              <View style={[styles.trackingIconContainer, { backgroundColor: colors.tagGreenBg }]}>
                <Ionicons name="trending-up" size={20} color={colors.tagGreenText} />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Track all income sources</Text>
                <Text style={styles.trackingStatus}>
                  {trackingStats.categorizedIncomeCount > 0
                    ? `${trackingStats.categorizedIncomeCount} income transaction${trackingStats.categorizedIncomeCount !== 1 ? 's' : ''} tracked`
                    : 'Start tracking your income'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
            </View>
            {trackingStats.categorizedIncomeCount > 0 && (
              <View style={styles.trackingProgressContainer}>
                <View style={[styles.trackingProgressBar, { backgroundColor: colors.tagGreenBg }]}>
                  <View style={[styles.trackingProgressFill, { width: '100%', backgroundColor: colors.tagGreenText }]} />
                </View>
                <View style={styles.trackingBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                  <Text style={styles.trackingBadgeText}>Active</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Categorize Expenses Card */}
          <TouchableOpacity
            style={styles.trackingCard}
            onPress={() => {
              if (trackingStats.uncategorizedCount > 0) {
                navigation.navigate('TransactionList');
              } else {
                navigation.navigate('CategorizedTransactions', { filterType: 'expense' });
              }
            }}
          >
            <View style={styles.trackingHeader}>
              <View style={[styles.trackingIconContainer, { backgroundColor: colors.parchment }]}>
                <Ionicons name="receipt-outline" size={20} color={colors.ink} />
              </View>
              <View style={styles.trackingInfo}>
                <Text style={styles.trackingLabel}>Categorize business expenses</Text>
                <Text style={styles.trackingStatus}>
                  {trackingStats.uncategorizedCount > 0
                    ? `${trackingStats.uncategorizedCount} pending • ${trackingStats.categorizedExpenseCount} done`
                    : trackingStats.categorizedExpenseCount > 0
                      ? `${trackingStats.categorizedExpenseCount} expense${trackingStats.categorizedExpenseCount !== 1 ? 's' : ''} categorized`
                      : 'Upload transactions to get started'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
            </View>
            {(trackingStats.uncategorizedCount > 0 || trackingStats.categorizedExpenseCount > 0) && (
              <View style={styles.trackingProgressContainer}>
                <View style={[styles.trackingProgressBar, { backgroundColor: colors.parchment }]}>
                  <View
                    style={[
                      styles.trackingProgressFill,
                      {
                        width: trackingStats.totalTransactions > 0
                          ? `${Math.round((trackingStats.categorizedExpenseCount / (trackingStats.categorizedExpenseCount + trackingStats.uncategorizedCount)) * 100)}%`
                          : '0%',
                        backgroundColor: colors.ink
                      }
                    ]}
                  />
                </View>
                {trackingStats.uncategorizedCount > 0 ? (
                  <View style={[styles.trackingBadge, { backgroundColor: colors.tagEmberBg }]}>
                    <Ionicons name="time" size={14} color={colors.ember} />
                    <Text style={[styles.trackingBadgeText, { color: colors.ember }]}>
                      {trackingStats.uncategorizedCount} pending
                    </Text>
                  </View>
                ) : (
                  <View style={styles.trackingBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                    <Text style={styles.trackingBadgeText}>All done</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Qualify Expenses Card */}
          {trackingStats.categorizedExpenseCount > 0 && (
            <TouchableOpacity
              style={styles.trackingCard}
              onPress={() => navigation.navigate('QualifyTransactionList')}
            >
              <View style={styles.trackingHeader}>
                <View style={[styles.trackingIconContainer, { backgroundColor: colors.tagEmberBg }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.ember} />
                </View>
                <View style={styles.trackingInfo}>
                  <Text style={styles.trackingLabel}>Add receipts & evidence</Text>
                  <Text style={styles.trackingStatus}>
                    {trackingStats.unqualifiedExpenseCount > 0
                      ? `${trackingStats.unqualifiedExpenseCount} expense${trackingStats.unqualifiedExpenseCount !== 1 ? 's' : ''} need evidence`
                      : 'All expenses qualified'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
              </View>
              <View style={styles.trackingProgressContainer}>
                <View style={[styles.trackingProgressBar, { backgroundColor: colors.tagEmberBg }]}>
                  <View
                    style={[
                      styles.trackingProgressFill,
                      {
                        width: `${trackingStats.categorizedExpenseCount > 0
                          ? Math.round(((trackingStats.categorizedExpenseCount - trackingStats.unqualifiedExpenseCount) / trackingStats.categorizedExpenseCount) * 100)
                          : 0}%`,
                        backgroundColor: trackingStats.unqualifiedExpenseCount === 0 ? colors.tagGreenText : colors.ember
                      }
                    ]}
                  />
                </View>
                {trackingStats.unqualifiedExpenseCount === 0 ? (
                  <View style={styles.trackingBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                    <Text style={styles.trackingBadgeText}>HMRC ready</Text>
                  </View>
                ) : (
                  <View style={[styles.trackingBadge, { backgroundColor: colors.tagEmberBg }]}>
                    <Text style={[styles.trackingBadgeText, { color: colors.ember }]}>
                      {Math.round(((trackingStats.categorizedExpenseCount - trackingStats.unqualifiedExpenseCount) / trackingStats.categorizedExpenseCount) * 100)}% qualified
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Gifted Items Card */}
          {profile?.receives_gifted_items && (
            <TouchableOpacity
              style={styles.trackingCard}
              onPress={() => navigation.navigate('GiftedTracker')}
            >
              <View style={styles.trackingHeader}>
                <View style={[styles.trackingIconContainer, { backgroundColor: colors.tagEmberBg }]}>
                  <Ionicons name="gift-outline" size={20} color={colors.ember} />
                </View>
                <View style={styles.trackingInfo}>
                  <Text style={styles.trackingLabel}>Track gifted items</Text>
                  <Text style={styles.trackingStatus}>
                    {trackingStats.giftedItemsCount > 0
                      ? `${trackingStats.giftedItemsCount} item${trackingStats.giftedItemsCount !== 1 ? 's' : ''} logged`
                      : 'Log PR packages & gifts'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
              </View>
              {trackingStats.giftedItemsCount > 0 && (
                <View style={styles.trackingProgressContainer}>
                  <View style={[styles.trackingProgressBar, { backgroundColor: colors.tagEmberBg }]}>
                    <View style={[styles.trackingProgressFill, { width: '100%', backgroundColor: colors.ember }]} />
                  </View>
                  <View style={styles.trackingBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.tagGreenText} />
                    <Text style={styles.trackingBadgeText}>Active</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Overall Checklist Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Tax Checklist Progress</Text>
            <Text style={styles.progressCount}>{completedCount}/{totalCount}</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completedCount === totalCount
              ? "All done! You're on top of your taxes."
              : `${totalCount - completedCount} item${totalCount - completedCount !== 1 ? 's' : ''} remaining`}
          </Text>
        </View>
        {categoryOrder.map(category => {
          const items = groupedItems[category];
          if (!items || items.length === 0) return null;

          return (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIcon, { backgroundColor: `${CATEGORY_COLORS[category]}20` }]}>
                  <Ionicons name={CATEGORY_ICONS[category]} size={20} color={CATEGORY_COLORS[category]} />
                </View>
                <Text style={styles.categoryTitle}>{categoryLabels[category]}</Text>
              </View>

              {items.map(item => {
                const isCompleted = completedItems.has(item.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.checklistItem, isCompleted && styles.checklistItemCompleted]}
                    onPress={() => toggleItem(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                      {isCompleted && <Ionicons name="checkmark" size={16} color={colors.ink} />}
                    </View>
                    <View style={styles.itemContent}>
                      <View style={styles.itemHeader}>
                        <Text style={[styles.itemTitle, isCompleted && styles.itemTitleCompleted]}>
                          {item.title}
                        </Text>
                        {item.priority === 'high' && !isCompleted && (
                          <View style={styles.priorityBadge}>
                            <Text style={styles.priorityText}>Important</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.itemDescription, isCompleted && styles.itemDescriptionCompleted]}>
                        {item.description}
                      </Text>
                      {item.dueDate && !isCompleted && (
                        <View style={styles.dueDateContainer}>
                          <Ionicons name="calendar-outline" size={12} color={colors.ember} />
                          <Text style={styles.dueDateText}>
                            Due: {new Date(item.dueDate).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Personalized Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoCardIcon}>
              <Ionicons name="information-circle" size={24} color={colors.tagBlueText} />
            </View>
            <Text style={styles.infoCardTitle}>Other things on your tax return</Text>
          </View>
          <Text style={styles.infoCardDescription}>
            Depending on your situation, you may also see these on your Self Assessment:
          </Text>

          <View style={styles.infoLinks}>
            {profile?.student_loan_plan && profile.student_loan_plan !== 'none' && (
              <TouchableOpacity
                style={styles.infoLink}
                onPress={() => Linking.openURL('https://www.gov.uk/repaying-your-student-loan/what-you-pay')}
              >
                <Text style={styles.infoLinkText}>Student loan repayments</Text>
                <Ionicons name="open-outline" size={14} color={colors.ink} />
              </TouchableOpacity>
            )}

            {profile?.has_international_income && (
              <TouchableOpacity
                style={styles.infoLink}
                onPress={() => Linking.openURL('https://www.gov.uk/tax-foreign-income/taxed-twice')}
              >
                <Text style={styles.infoLinkText}>Foreign tax relief</Text>
                <Ionicons name="open-outline" size={14} color={colors.ink} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.infoLink}
              onPress={() => Linking.openURL('https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025')}
            >
              <Text style={styles.infoLinkText}>National Insurance contributions</Text>
              <Ionicons name="open-outline" size={14} color={colors.ink} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoLink}
              onPress={() => Linking.openURL('https://www.gov.uk/self-assessment-tax-returns')}
            >
              <Text style={styles.infoLinkText}>Self Assessment overview</Text>
              <Ionicons name="open-outline" size={14} color={colors.ink} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.parchment },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: spacing.sm, fontSize: 16, fontFamily: fonts.body, color: colors.midGrey },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', marginRight: 16, ...shadows.sm },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontFamily: fonts.display, color: colors.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: fonts.body, color: colors.midGrey },
  progressCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginBottom: 16, ...shadows.sm },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontFamily: fonts.displaySemi, color: colors.ink },
  progressCount: { fontSize: 16, fontFamily: fonts.display, color: colors.ink },
  progressBarContainer: { height: 8, backgroundColor: colors.mist, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', backgroundColor: colors.tagGreenText, borderRadius: 4 },
  progressText: { fontSize: 13, fontFamily: fonts.body, color: colors.midGrey },
  achievementCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginBottom: 16, ...shadows.sm },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  achievementIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.volt, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  achievementHeaderText: { flex: 1 },
  achievementTitle: { fontSize: 18, fontFamily: fonts.display, color: colors.ink, marginBottom: 2 },
  achievementSubtitle: { fontSize: 13, fontFamily: fonts.body, color: colors.midGrey },
  trackingCard: { backgroundColor: colors.parchment, borderRadius: 12, padding: 14, marginBottom: 10 },
  trackingHeader: { flexDirection: 'row', alignItems: 'center' },
  trackingIconContainer: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  trackingInfo: { flex: 1 },
  trackingLabel: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink, marginBottom: 2 },
  trackingStatus: { fontSize: 12, fontFamily: fonts.body, color: colors.midGrey },
  trackingProgressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  trackingProgressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  trackingProgressFill: { height: '100%', borderRadius: 3 },
  trackingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tagGreenBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  trackingBadgeText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.tagGreenText },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingTop: 0, paddingBottom: 100 },
  categorySection: { marginBottom: 24 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  categoryIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  categoryTitle: { fontSize: 16, fontFamily: fonts.display, color: colors.ink },
  checklistItem: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 8, ...shadows.sm },
  checklistItemCompleted: { opacity: 0.6 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.mist, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.tagGreenText, borderColor: colors.tagGreenText },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  itemTitle: { fontSize: 15, fontFamily: fonts.bodyBold, color: colors.ink, flex: 1 },
  itemTitleCompleted: { textDecorationLine: 'line-through', color: colors.midGrey },
  priorityBadge: { backgroundColor: colors.tagEmberBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.ember },
  itemDescription: { fontSize: 13, fontFamily: fonts.body, color: colors.midGrey, lineHeight: 18 },
  itemDescriptionCompleted: { color: colors.midGrey },
  dueDateContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  dueDateText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.ember },
  infoCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginTop: 8, ...shadows.sm },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoCardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.tagBlueBg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoCardTitle: { fontSize: 16, fontFamily: fonts.display, color: colors.ink, flex: 1 },
  infoCardDescription: { fontSize: 13, fontFamily: fonts.body, color: colors.midGrey, lineHeight: 18, marginBottom: 16 },
  infoLinks: { gap: 8 },
  infoLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.parchment, borderRadius: 10, padding: 14 },
  infoLinkText: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.ink },
});
