import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface Transaction {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name: string;
  business_percent: number;
  explanation: string;
  tax_deductible: boolean;
  qualified: boolean;
  transaction_type: string;
}

type TransactionTypeOption = 'personal' | 'paye_income' | 'income' | 'expense';

const TRANSACTION_TYPE_OPTIONS: { key: TransactionTypeOption; label: string }[] = [
  { key: 'personal', label: 'Personal' },
  { key: 'paye_income', label: 'PAYE Income' },
  { key: 'income', label: 'Business Income' },
  { key: 'expense', label: 'Business Expense' },
];

export default function EditTransactionScreen({ route, navigation }: any) {
  const { transactionId, transactionType } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [businessPercent, setBusinessPercent] = useState('100');
  const [explanation, setExplanation] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionTypeOption>('expense');

  useEffect(() => {
    fetchTransaction();
  }, [transactionId]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('categorized_transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setTransaction(data);
      setBusinessPercent(data.business_percent?.toString() || '100');
      setExplanation(data.explanation || '');
      // Initialize the transaction type from the database value
      const dbType = data.transaction_type as TransactionTypeOption;
      if (['personal', 'paye_income', 'income', 'expense'].includes(dbType)) {
        setSelectedType(dbType);
      } else {
        // Fallback: infer from route param or default to expense
        setSelectedType(transactionType === 'income' ? 'income' : 'expense');
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
      Alert.alert('Error', 'Failed to load transaction');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !transaction) return;

      const percent = parseInt(businessPercent) || 0;
      if (selectedType === 'expense' && (percent < 0 || percent > 100)) {
        Alert.alert('Error', 'Business percentage must be between 0 and 100');
        return;
      }

      // Build the update payload based on the selected transaction type
      let updateData: Record<string, any> = {
        transaction_type: selectedType,
        explanation: explanation.trim(),
      };

      switch (selectedType) {
        case 'personal':
          updateData.tax_deductible = false;
          updateData.business_percent = 0;
          break;
        case 'paye_income':
          updateData.tax_deductible = false;
          updateData.business_percent = 0;
          break;
        case 'income':
          updateData.tax_deductible = false;
          updateData.business_percent = 100;
          break;
        case 'expense':
          updateData.business_percent = percent;
          // Keep existing tax_deductible value
          break;
      }

      const { error } = await supabase
        .from('categorized_transactions')
        .update(updateData)
        .eq('id', transactionId)
        .eq('user_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Transaction updated', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving transaction:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This will move it back to uncategorized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const { error } = await supabase
                .from('categorized_transactions')
                .delete()
                .eq('id', transactionId)
                .eq('user_id', user.id);

              if (error) throw error;

              navigation.goBack();
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', 'Failed to delete transaction');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `\u00A3${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.inkMuted} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Transaction not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isIncome = selectedType === 'income' || selectedType === 'paye_income';
  const isPersonalOrPaye = selectedType === 'personal' || selectedType === 'paye_income';
  const showBusinessPercent = selectedType === 'expense';
  const showStatusBadges = selectedType === 'expense';
  const showEvidenceButton = selectedType === 'expense';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Screen Label */}
        <Text style={styles.screenLabel}>EDIT</Text>

        {/* Hero Heading */}
        <Text style={styles.heroHeading}>{'edit\ntransaction.'}</Text>

        {/* Transaction Details (Read-only) */}
        <View style={styles.detailsCard}>
          <View style={styles.merchantRow}>
            <View style={[styles.iconContainer, { backgroundColor: isIncome ? colors.tagIncomeBg : colors.tagExpenseBg }]}>
              <Ionicons
                name={isIncome ? 'trending-up' : 'receipt-outline'}
                size={24}
                color={isIncome ? colors.tagIncomeText : colors.tagExpenseText}
              />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{transaction.merchant_name}</Text>
              <Text style={styles.transactionDate}>{formatDate(transaction.transaction_date)}</Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={[styles.amountValue, { color: isIncome ? colors.positive : colors.negative }]}>
              {formatCurrency(transaction.amount)}
            </Text>
          </View>

          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>Category</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{transaction.category_name || 'Uncategorized'}</Text>
            </View>
          </View>
        </View>

        {/* Transaction Type Picker */}
        <Text style={styles.sectionTitle}>Transaction Type</Text>
        <View style={styles.typePicker}>
          {TRANSACTION_TYPE_OPTIONS.map((option) => {
            const isSelected = selectedType === option.key;
            return isSelected ? (
              <TouchableOpacity
                key={option.key}
                activeOpacity={0.8}
                onPress={() => setSelectedType(option.key)}
              >
                <LinearGradient
                  colors={[...gradients.button]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.typePill}
                >
                  <Text style={styles.typePillTextSelected}>{option.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={option.key}
                style={styles.typePillUnselected}
                activeOpacity={0.7}
                onPress={() => setSelectedType(option.key)}
              >
                <Text style={styles.typePillText}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isPersonalOrPaye && (
          <View style={styles.typeNote}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkMuted} />
            <Text style={styles.typeNoteText}>This won't affect your tax calculation</Text>
          </View>
        )}

        {/* Editable Fields */}
        <Text style={styles.sectionTitle}>Edit Details</Text>

        {showBusinessPercent && (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Business Percentage</Text>
            <View style={styles.percentInputRow}>
              <TextInput
                style={styles.percentInput}
                value={businessPercent}
                onChangeText={setBusinessPercent}
                keyboardType="numeric"
                maxLength={3}
                placeholder="100"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.percentSign}>%</Text>
            </View>
            <Text style={styles.inputHelper}>
              Business amount: {formatCurrency(transaction.amount * (parseInt(businessPercent) || 0) / 100)}
            </Text>
          </View>
        )}

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            {selectedType === 'expense' ? 'Explanation / Notes' : 'Notes'}
          </Text>
          <TextInput
            style={styles.explanationInput}
            value={explanation}
            onChangeText={setExplanation}
            placeholder={selectedType === 'expense' ? 'Why is this a business expense?' : 'Add any notes...'}
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Status Badges */}
        {showStatusBadges && (
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, transaction.tax_deductible ? styles.statusActive : styles.statusInactive]}>
              <Ionicons
                name={transaction.tax_deductible ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={transaction.tax_deductible ? colors.tagIncomeText : colors.inkMuted}
              />
              <Text style={[styles.statusText, { color: transaction.tax_deductible ? colors.tagIncomeText : colors.inkMuted }]}>
                {transaction.tax_deductible ? 'Tax Deductible' : 'Not Deductible'}
              </Text>
            </View>

            <View style={[styles.statusBadge, transaction.qualified ? styles.statusActive : styles.statusWarning]}>
              <Ionicons
                name={transaction.qualified ? 'checkmark-circle' : 'document-text-outline'}
                size={16}
                color={transaction.qualified ? colors.tagIncomeText : colors.tagExpenseText}
              />
              <Text style={[styles.statusText, { color: transaction.qualified ? colors.tagIncomeText : colors.tagExpenseText }]}>
                {transaction.qualified ? 'Has Evidence' : 'Needs Evidence'}
              </Text>
            </View>
          </View>
        )}

        {showEvidenceButton && !transaction.qualified && (
          <TouchableOpacity
            style={styles.addEvidenceButton}
            onPress={() => {
              navigation.navigate('QualifyTransactions', { transaction });
            }}
          >
            <Ionicons name="document-attach" size={20} color={colors.tagExpenseText} />
            <Text style={styles.addEvidenceText}>Add Receipt & Evidence</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.tagExpenseText} />
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Transaction</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={gradients.button as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>save changes {'\u2192'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
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
    color: colors.onSurface,
    fontFamily: fonts.display,
    marginTop: -1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  screenLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    marginBottom: spacing.sm,
  },
  heroHeading: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.onSurface,
    letterSpacing: -1.5,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  detailsCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 19,
    fontFamily: fonts.display,
    color: colors.onSurface,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
  },
  amountValue: {
    fontSize: 26,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: fonts.displaySemi,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  inputCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.displayMed,
    color: colors.onSurfaceMuted,
    marginBottom: spacing.sm,
  },
  percentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.onSurface,
  },
  percentSign: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.onSurfaceMuted,
    marginLeft: spacing.sm,
  },
  inputHelper: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    marginTop: spacing.sm,
  },
  explanationInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.onSurface,
    minHeight: 100,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusActive: {
    backgroundColor: colors.tagIncomeBg,
  },
  statusInactive: {
    backgroundColor: colors.surfaceContainerLow,
  },
  statusWarning: {
    backgroundColor: colors.tagExpenseBg,
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },
  addEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addEvidenceText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.primary,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: fonts.displayMed,
    color: colors.negative,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 34,
  },
  saveButton: {
    borderRadius: borderRadius.full,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 17,
    fontFamily: fonts.display,
    color: colors.white,
  },
  typePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  typePillUnselected: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLowest,
  },
  typePillTextSelected: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  typePillText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.onSurfaceMuted,
  },
  typeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  typeNoteText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
  },
});
