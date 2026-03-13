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

export default function EditTransactionScreen({ route, navigation }: any) {
  const { transactionId, transactionType } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [businessPercent, setBusinessPercent] = useState('100');
  const [explanation, setExplanation] = useState('');

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
      if (percent < 0 || percent > 100) {
        Alert.alert('Error', 'Business percentage must be between 0 and 100');
        return;
      }

      const { error } = await supabase
        .from('categorized_transactions')
        .update({
          business_percent: percent,
          explanation: explanation.trim(),
        })
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
          <ActivityIndicator size="large" color={colors.midGrey} />
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

  const isIncome = transactionType === 'income' || transaction.transaction_type === 'income';

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

        {/* Editable Fields */}
        <Text style={styles.sectionTitle}>Edit Details</Text>

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

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Explanation / Notes</Text>
          <TextInput
            style={styles.explanationInput}
            value={explanation}
            onChangeText={setExplanation}
            placeholder="Why is this a business expense?"
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Status Badges */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, transaction.tax_deductible ? styles.statusActive : styles.statusInactive]}>
            <Ionicons
              name={transaction.tax_deductible ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={transaction.tax_deductible ? colors.tagIncomeText : colors.midGrey}
            />
            <Text style={[styles.statusText, { color: transaction.tax_deductible ? colors.tagIncomeText : colors.midGrey }]}>
              {transaction.tax_deductible ? 'Tax Deductible' : 'Not Deductible'}
            </Text>
          </View>

          {!isIncome && (
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
          )}
        </View>

        {!isIncome && !transaction.qualified && (
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
            colors={gradients.primary as unknown as string[]}
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
    backgroundColor: colors.background,
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
    color: colors.midGrey,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
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
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  amountValue: {
    fontSize: 24,
    fontFamily: fonts.display,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: colors.border,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  categoryBadge: {
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.tagExpenseText,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
    marginBottom: spacing.xs,
  },
  percentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  percentSign: {
    fontSize: 22,
    fontFamily: fonts.display,
    color: colors.midGrey,
    marginLeft: spacing.sm,
  },
  inputHelper: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginTop: spacing.xs,
  },
  explanationInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.xs,
  },
  statusActive: {
    backgroundColor: colors.tagIncomeBg,
  },
  statusInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
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
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  addEvidenceText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.tagExpenseText,
    flex: 1,
  },
  deleteButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,69,0,0.2)',
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: '#FF4500',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 34,
  },
  saveButton: {
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
});
