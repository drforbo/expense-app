import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

interface Statement {
  id: string;
  filename: string;
  bank_name?: string;
  statement_month: string;
  status: string;
  transaction_count?: number;
  upload_date: string;
}

interface MonthData {
  key: string; // e.g. '2026-02'
  label: string; // e.g. 'February 2026'
  statements: Statement[];
  status: 'empty' | 'pending' | 'complete';
}

// Generate UK tax year months (April 2025 - March 2026) in reverse chronological order
function generateTaxYearMonths(): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // March 2026 down to January 2026
  for (let m = 2; m >= 0; m--) {
    const key = `2026-${String(m + 1).padStart(2, '0')}`;
    months.push({ key, label: `${monthNames[m]} 2026` });
  }

  // December 2025 down to April 2025
  for (let m = 11; m >= 3; m--) {
    const key = `2025-${String(m + 1).padStart(2, '0')}`;
    months.push({ key, label: `${monthNames[m]} 2025` });
  }

  return months;
}

const TAX_YEAR_MONTHS = generateTaxYearMonths();

export default function BankStatementsScreen({ navigation }: any) {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [batchStatus, setBatchStatus] = useState<any>(null);

  // Reload data every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [statementsData, statusData] = await Promise.all([
        apiPost('/api/get_statements_by_month', { user_id: user.id }),
        apiPost('/api/batch_status', { user_id: user.id }),
      ]);

      if (Array.isArray(statementsData)) {
        setStatements(statementsData);
      }
      if (statusData) {
        setBatchStatus(statusData);
      }
    } catch (error) {
      console.error('Error loading statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setProcessing(true);
      const result = await apiPost('/api/process_batch', { user_id: user.id });

      if (result.error) {
        Alert.alert('Error', result.error);
        setProcessing(false);
      }
      // Keep processing state -- user can navigate away
    } catch (error: any) {
      console.error('Error processing batch:', error);
      Alert.alert('Error', error.message || 'Failed to start batch processing');
      setProcessing(false);
    }
  };

  const getMonthsData = (): MonthData[] => {
    return TAX_YEAR_MONTHS.map(({ key, label }) => {
      const monthStatements = statements.filter(s => s.statement_month === key);
      let status: MonthData['status'] = 'empty';

      if (monthStatements.length > 0) {
        const allCompleted = monthStatements.every(s => s.status === 'completed');
        status = allCompleted ? 'complete' : 'pending';
      }

      return { key, label, statements: monthStatements, status };
    });
  };

  const pendingCount = statements.filter(s => s.status !== 'completed').length;
  const monthsData = getMonthsData();

  const getStatusIcon = (status: MonthData['status']): { name: string; color: string } => {
    switch (status) {
      case 'complete':
        return { name: 'checkmark-circle', color: colors.acidLime };
      case 'pending':
        return { name: 'time', color: colors.warmAmber };
      default:
        return { name: 'ellipse-outline', color: 'rgba(250,250,250,0.2)' };
    }
  };

  const getUniqueBanks = (stmts: Statement[]): string[] => {
    const banks = stmts
      .map(s => s.bank_name)
      .filter((b): b is string => !!b && b !== 'Unknown Bank');
    return [...new Set(banks)];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Statements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Process All CTA */}
        {pendingCount > 0 && (
          <TouchableOpacity
            style={[styles.processButton, processing && styles.processButtonDisabled]}
            onPress={handleProcessAll}
            disabled={processing}
            activeOpacity={0.8}
          >
            {processing ? (
              <View style={styles.processingContent}>
                <ActivityIndicator color={colors.background} size="small" />
                <Text style={styles.processButtonText}>
                  Processing... You'll get a notification when done
                </Text>
              </View>
            ) : (
              <View style={styles.processingContent}>
                <Ionicons name="flash" size={20} color={colors.background} />
                <Text style={styles.processButtonText}>
                  Process All Statements ({pendingCount} pending)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Tax Year Header */}
        <Text style={styles.sectionTitle}>UK Tax Year 2025/26</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.ember} />
          </View>
        ) : (
          monthsData.map((month) => {
            const statusIcon = getStatusIcon(month.status);
            const banks = getUniqueBanks(month.statements);

            return (
              <TouchableOpacity
                key={month.key}
                style={styles.monthCard}
                onPress={() =>
                  navigation.navigate('MonthDetail', {
                    month: month.key,
                    monthLabel: month.label,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.monthStatusIcon}>
                  <Ionicons
                    name={statusIcon.name as any}
                    size={24}
                    color={statusIcon.color}
                  />
                </View>

                <View style={styles.monthInfo}>
                  <Text style={styles.monthLabel}>{month.label}</Text>
                  <Text style={styles.monthMeta}>
                    {month.statements.length === 0
                      ? 'No statements'
                      : month.statements.length === 1
                      ? '1 statement'
                      : `${month.statements.length} statements`}
                  </Text>

                  {banks.length > 0 && (
                    <View style={styles.bankTagsRow}>
                      {banks.map((bank) => (
                        <View key={bank} style={styles.bankTag}>
                          <Text style={styles.bankTagText}>{bank}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={20} color="rgba(250,250,250,0.3)" />
              </TouchableOpacity>
            );
          })
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  processButton: {
    backgroundColor: colors.coralBlaze,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  processButtonDisabled: {
    opacity: 0.7,
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  processButtonText: {
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    color: colors.background,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  monthStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthInfo: {
    flex: 1,
    marginLeft: 12,
  },
  monthLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 2,
  },
  monthMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
  },
  bankTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  bankTag: {
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bankTagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.tagBlueText,
  },
});
