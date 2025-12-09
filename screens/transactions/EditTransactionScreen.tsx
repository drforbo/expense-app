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
          <ActivityIndicator size="large" color="#7C3AED" />
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit {isIncome ? 'Income' : 'Expense'}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Transaction Details (Read-only) */}
        <View style={styles.detailsCard}>
          <View style={styles.merchantRow}>
            <View style={[styles.iconContainer, { backgroundColor: isIncome ? '#10B98120' : '#7C3AED20' }]}>
              <Ionicons
                name={isIncome ? 'trending-up' : 'receipt-outline'}
                size={24}
                color={isIncome ? '#10B981' : '#7C3AED'}
              />
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{transaction.merchant_name}</Text>
              <Text style={styles.transactionDate}>{formatDate(transaction.transaction_date)}</Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={[styles.amountValue, { color: isIncome ? '#10B981' : '#7C3AED' }]}>
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
              placeholderTextColor="#6B7280"
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
            placeholderTextColor="#6B7280"
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
              color={transaction.tax_deductible ? '#10B981' : '#6B7280'}
            />
            <Text style={[styles.statusText, { color: transaction.tax_deductible ? '#10B981' : '#6B7280' }]}>
              {transaction.tax_deductible ? 'Tax Deductible' : 'Not Deductible'}
            </Text>
          </View>

          {!isIncome && (
            <View style={[styles.statusBadge, transaction.qualified ? styles.statusActive : styles.statusWarning]}>
              <Ionicons
                name={transaction.qualified ? 'checkmark-circle' : 'document-text-outline'}
                size={16}
                color={transaction.qualified ? '#10B981' : '#F59E0B'}
              />
              <Text style={[styles.statusText, { color: transaction.qualified ? '#10B981' : '#F59E0B' }]}>
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
            <Ionicons name="document-attach" size={20} color="#F59E0B" />
            <Text style={styles.addEvidenceText}>Add Receipt & Evidence</Text>
            <Ionicons name="chevron-forward" size={20} color="#F59E0B" />
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
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1333',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  detailsCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2E1A47',
  },
  amountLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2E1A47',
  },
  categoryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  categoryBadge: {
    backgroundColor: '#7C3AED20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  inputCard: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  percentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentInput: {
    flex: 1,
    backgroundColor: '#2E1A47',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  percentSign: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: 8,
  },
  inputHelper: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  explanationInput: {
    backgroundColor: '#2E1A47',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    minHeight: 100,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#10B98120',
  },
  statusInactive: {
    backgroundColor: '#6B728020',
  },
  statusWarning: {
    backgroundColor: '#F59E0B20',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addEvidenceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B15',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B30',
    marginBottom: 24,
  },
  addEvidenceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#1F1333',
  },
  saveButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
