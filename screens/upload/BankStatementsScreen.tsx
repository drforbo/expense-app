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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

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
  status: 'empty' | 'pending' | 'processing' | 'complete';
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

  // Reload data every time screen comes into focus, poll while processing
  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(loadData, 10000); // poll every 10s
      return () => clearInterval(interval);
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
        const anyProcessing = monthStatements.some(s => s.status === 'processing');
        status = allCompleted ? 'complete' : anyProcessing ? 'processing' : 'pending';
      }

      return { key, label, statements: monthStatements, status };
    });
  };

  const pendingCount = statements.filter(s => s.status === 'pending').length;
  const processingCount = statements.filter(s => s.status === 'processing').length;
  const isProcessing = processing || processingCount > 0;
  const monthsData = getMonthsData();

  const getStatusDot = (status: MonthData['status']): string => {
    switch (status) {
      case 'complete':
        return '#1A7A40';
      case 'processing':
        return '#FF8C00';
      case 'pending':
        return '#FF4500';
      default:
        return '#DDD';
    }
  };

  const getUniqueBanks = (stmts: Statement[]): string[] => {
    const banks = stmts
      .map(s => s.bank_name)
      .filter((b): b is string => !!b && b !== 'Unknown Bank');
    return [...new Set(banks)];
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Gradient Header Block */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        {/* Flare overlays */}
        <View style={styles.flareTopRight} />
        <View style={styles.flareBottomLeft} />

        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backArrow}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.screenLabel}>BANK STATEMENTS</Text>
            <Text style={styles.heading}>{'your\nstatements.'}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Processing banner — shows when statements are being processed */}
        {isProcessing && (
          <View style={styles.processingBanner}>
            <ActivityIndicator color={colors.gradientMid} size="small" />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.processingBannerTitle}>Processing your statements...</Text>
              <Text style={styles.processingBannerSub}>
                {processingCount > 0
                  ? `${processingCount} statement${processingCount > 1 ? 's' : ''} being read by AI`
                  : 'Starting up...'}
                {' · '}You'll get a notification when done
              </Text>
            </View>
          </View>
        )}

        {/* Process All CTA — only show when there are unprocessed statements and not already processing */}
        {pendingCount > 0 && !isProcessing && (
          <TouchableOpacity
            onPress={handleProcessAll}
            activeOpacity={0.8}
            style={{ marginBottom: spacing.lg }}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.processButton}
            >
              <View style={styles.processingContent}>
                <Ionicons name="flash" size={20} color={colors.white} />
                <Text style={styles.processButtonText}>
                  Process All Statements ({pendingCount} pending)
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Tax Year Header */}
        <Text style={styles.sectionTitle}>UK Tax Year 2025/26</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.gradientMid} />
          </View>
        ) : (
          monthsData.map((month) => {
            const dotColor = getStatusDot(month.status);
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
                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />

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

                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
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
    backgroundColor: colors.background,
  },
  headerGradient: {
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  flareTopRight: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  flareBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerInner: {
    paddingTop: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  backArrow: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: fonts.displaySemi,
    marginBottom: spacing.xs,
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.white,
    letterSpacing: -1.5,
    lineHeight: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  processingBannerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gradientMid,
  },
  processingBannerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
    marginTop: 2,
  },
  processButton: {
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  processButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: spacing.md,
    letterSpacing: 0.1,
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
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.md,
  },
  monthInfo: {
    flex: 1,
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
    paddingVertical: 3,
  },
  bankTagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.tagBlueText,
    letterSpacing: 0.2,
  },
});
