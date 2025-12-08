import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

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
}

const CATEGORY_COLORS = {
  registration: '#7C3AED',
  tracking: '#3B82F6',
  deadline: '#FF6B6B',
  preparation: '#10B981',
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

  useEffect(() => {
    fetchProfileAndChecklist();
    loadCompletedItems();
  }, []);

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

      items.push({
        id: 'foreign_tax',
        title: 'Check double taxation agreements',
        description: 'Understand if you need to pay tax in multiple countries and how to claim relief.',
        category: 'preparation',
        completed: false,
        relevantTo: ['international'],
        priority: 'medium',
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

    // Set aside money - calculate based on income
    const monthlyIncome = userProfile?.monthly_income || 0;
    const yearlyIncome = monthlyIncome * 12;
    let taxBand = '20%';
    let estimatedTax = yearlyIncome * 0.2;

    if (yearlyIncome > 50270) {
      taxBand = '40%';
      estimatedTax = (50270 - 12570) * 0.2 + (yearlyIncome - 50270) * 0.4;
    }
    if (yearlyIncome <= 12570) {
      estimatedTax = 0;
    }

    items.push({
      id: 'set_aside',
      title: 'Set aside money for tax',
      description: `Based on your income, consider saving ~${Math.round(estimatedTax / 12)}/month for tax (${taxBand} bracket).`,
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
      id: 'review_allowances',
      title: 'Check available allowances',
      description: 'Review trading allowance (£1,000), capital allowances, and other deductions you can claim.',
      category: 'preparation',
      completed: false,
      relevantTo: ['all'],
      priority: 'medium',
    });

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
          <ActivityIndicator size="large" color="#7C3AED" />
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Tax Checklist</Text>
          <Text style={styles.subtitle}>Your personalized to-do list</Text>
        </View>
      </View>

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Your Progress</Text>
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
                      {isCompleted && <Ionicons name="checkmark" size={16} color="#fff" />}
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
                          <Ionicons name="calendar-outline" size={12} color="#FF6B6B" />
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
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  progressCard: {
    marginHorizontal: 20,
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  progressCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#2E1A47',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 100,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  checklistItem: {
    flexDirection: 'row',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  checklistItemCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  priorityBadge: {
    backgroundColor: '#FF6B6B20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  itemDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  itemDescriptionCompleted: {
    color: '#6B7280',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});
