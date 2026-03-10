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
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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
    return `£${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
          <ActivityIndicator size="large" color={colors.ink} />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit {isIncome ? 'Income' : 'Expense'}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color={colors.ember} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Transaction Details (Read-only) */}
        <View style={styles.detailsCard}>
          <View style={styles.merchantRow}>
            <View style={[styles.iconContainer, { backgroundColor: isIncome ? colors.tagGreenBg : colors.tagEmberBg }]}>
              <Ionicons
                name={isIncome ? 'trending-up' : 'receipt-outline'}
                size={24}
                color={isIncome ? colors.tagGreenText : colors.ember}
              />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{transaction.merchant_name}</Text>
              <Text style={styles.transactionDate}>{formatDate(transaction.transaction_date)}</Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={[styles.amountValue, { color: isIncome ? colors.tagGreenText : colors.ember }]}>
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
              placeholderTextColor={colors.midGrey}
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
            placeholderTextColor={colors.midGrey}
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
              color={transaction.tax_deductible ? colors.tagGreenText : colors.midGrey}
            />
            <Text style={[styles.statusText, { color: transaction.tax_deductible ? colors.tagGreenText : colors.midGrey }]}>
              {transaction.tax_deductible ? 'Tax Deductible' : 'Not Deductible'}
            </Text>
          </View>

          {!isIncome && (
            <View style={[styles.statusBadge, transaction.qualified ? styles.statusActive : styles.statusWarning]}>
              <Ionicons
                name={transaction.qualified ? 'checkmark-circle' : 'document-text-outline'}
                size={16}
                color={transaction.qualified ? colors.tagGreenText : colors.ember}
              />
              <Text style={[styles.statusText, { color: transaction.qualified ? colors.tagGreenText : colors.ember }]}>
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
            <Ionicons name="document-attach" size={20} color={colors.ember} />
            <Text style={styles.addEvidenceText}>Add Receipt & Evidence</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.ember} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color={colors.background} />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
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
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.mist,
  },
  amountLabel: {
    fontSize: 14,
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
    borderTopWidth: 1,
    borderTopColor: colors.mist,
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  categoryBadge: {
    backgroundColor: colors.tagEmberBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.tagEmberText,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  inputCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  inputLabel: {
    fontSize: 14,
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
    backgroundColor: colors.parchment,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
  },
  percentSign: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
    marginLeft: spacing.xs,
  },
  inputHelper: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginTop: spacing.xs,
  },
  explanationInput: {
    backgroundColor: colors.parchment,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    minHeight: 100,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusActive: {
    backgroundColor: colors.tagGreenBg,
  },
  statusInactive: {
    backgroundColor: colors.parchment,
  },
  statusWarning: {
    backgroundColor: colors.tagEmberBg,
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },
  addEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tagEmberBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.ember,
    marginBottom: spacing.lg,
  },
  addEvidenceText: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ember,
    flex: 1,
  },
  footer: {
    padding: spacing.md,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: colors.mist,
  },
  saveButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
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
    color: colors.background,
  },
});
