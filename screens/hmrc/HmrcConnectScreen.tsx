import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface Obligation {
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  receivedDate: string | null;
}

interface HmrcConnection {
  connectedAt: string;
  environment: string;
  businessId: string | null;
  tradingName: string | null;
  quarterlyPeriodType: string | null;
  lastSubmissionAt: string | null;
  hasBusinessDetails: boolean;
}

export default function HmrcConnectScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState<HmrcConnection | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [obligationsLoading, setObligationsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const loadStatus = async () => {
    try {
      setLoading(true);
      const result = await apiPost('/api/hmrc/status', {});
      setConnected(result.connected);
      setConnection(result.connection);

      if (result.connected) {
        loadObligations();
      }
    } catch (error: any) {
      console.error('HMRC status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadObligations = async () => {
    try {
      setObligationsLoading(true);
      const result = await apiPost('/api/hmrc/obligations', {});
      setObligations(result.obligations || []);
    } catch (error: any) {
      console.error('HMRC obligations error:', error);
    } finally {
      setObligationsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const { authUrl } = await apiPost('/api/hmrc/auth-url', {});
      await WebBrowser.openBrowserAsync(authUrl);
      // After returning from browser, reload status
      await loadStatus();
    } catch (error: any) {
      console.error('HMRC connect error:', error);
      Alert.alert('Connection Failed', 'Could not connect to HMRC. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect HMRC',
      'Are you sure you want to disconnect your HMRC account? You can reconnect at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiPost('/api/hmrc/disconnect', {});
              setConnected(false);
              setConnection(null);
              setObligations([]);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to disconnect');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} \u2013 ${e.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const getQuarterLabel = (index: number) => {
    return `Q${index + 1}`;
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{'\u2190'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading HMRC status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'\u2190'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenLabel}>HMRC</Text>
        <Text style={styles.heroHeading}>{'making tax\ndigital.'}</Text>

        {!connected ? (
          <>
            {/* Not connected state */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: colors.surfaceContainerLow }]}>
                  <Ionicons name="link-outline" size={24} color={colors.onSurfaceMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>Not connected</Text>
                  <Text style={styles.statusSub}>Connect your HMRC account to submit quarterly updates directly from Bopp.</Text>
                </View>
              </View>
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>What is Making Tax Digital?</Text>
              <Text style={styles.infoText}>
                From April 2026, self-employed people earning over {'\u00A3'}50,000 must keep digital records and submit quarterly updates to HMRC.
              </Text>

              <View style={styles.infoDivider} />

              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.infoItemText}>4 quarterly updates per year</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.positive} />
                <Text style={styles.infoItemText}>No penalty points in 2026/27 (soft landing)</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="calculator-outline" size={18} color={colors.secondary} />
                <Text style={styles.infoItemText}>Bopp maps your expenses to HMRC categories automatically</Text>
              </View>
            </View>

            {/* Connect CTA */}
            <TouchableOpacity onPress={handleConnect} activeOpacity={0.8} disabled={connecting}>
              <LinearGradient
                colors={gradients.hero as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                {connecting ? (
                  <ActivityIndicator color={colors.surfaceLowest} />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color={colors.surfaceLowest} />
                    <Text style={styles.ctaText}>Connect to HMRC</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.ctaNote}>
              You'll be redirected to HMRC to sign in securely. Bopp never sees your HMRC password.
            </Text>
          </>
        ) : (
          <>
            {/* Connected state */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusIcon, { backgroundColor: colors.tagIncomeBg }]}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.positive} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusTitle}>Connected</Text>
                  <Text style={styles.statusSub}>
                    {connection?.tradingName || 'Self-employment'} {'\u00B7'} {connection?.environment === 'sandbox' ? 'Sandbox' : 'Live'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleDisconnect} style={styles.disconnectButton}>
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              </View>

              {connection?.lastSubmissionAt && (
                <View style={styles.lastSubmission}>
                  <Ionicons name="time-outline" size={14} color={colors.onSurfaceMuted} />
                  <Text style={styles.lastSubmissionText}>
                    Last submitted {formatDate(connection.lastSubmissionAt)}
                  </Text>
                </View>
              )}
            </View>

            {/* Obligations */}
            <Text style={styles.sectionLabel}>QUARTERLY OBLIGATIONS</Text>

            {obligationsLoading ? (
              <View style={styles.card}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : obligations.length > 0 ? (
              <View style={styles.card}>
                {obligations.map((ob, i) => {
                  const isFulfilled = ob.status === 'Fulfilled';
                  const daysUntil = getDaysUntilDue(ob.dueDate);
                  const isOverdue = !isFulfilled && daysUntil < 0;
                  const isDueSoon = !isFulfilled && daysUntil >= 0 && daysUntil <= 30;

                  return (
                    <View key={i}>
                      {i > 0 && <View style={styles.obligationDivider} />}
                      <View style={styles.obligationRow}>
                        <View style={[
                          styles.quarterBadge,
                          isFulfilled && { backgroundColor: colors.tagIncomeBg },
                          isOverdue && { backgroundColor: '#fef0f0' },
                          isDueSoon && { backgroundColor: colors.tagExpenseBg },
                        ]}>
                          <Text style={[
                            styles.quarterText,
                            isFulfilled && { color: colors.positive },
                            isOverdue && { color: colors.negative },
                            isDueSoon && { color: colors.tagExpenseText },
                          ]}>{getQuarterLabel(i)}</Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.obligationPeriod}>{formatPeriod(ob.periodStart, ob.periodEnd)}</Text>
                          <Text style={[
                            styles.obligationDue,
                            isOverdue && { color: colors.negative },
                            isDueSoon && { color: colors.warning },
                          ]}>
                            {isFulfilled
                              ? `Submitted ${formatDate(ob.receivedDate!)}`
                              : isOverdue
                                ? `Overdue (was due ${formatDate(ob.dueDate)})`
                                : `Due ${formatDate(ob.dueDate)} (${daysUntil} days)`}
                          </Text>
                        </View>

                        {isFulfilled ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.positive} />
                        ) : (
                          <TouchableOpacity
                            style={styles.submitSmallButton}
                            onPress={() => navigation.navigate('HmrcSubmit', { taxYear: '2026-27' })}
                          >
                            <Text style={styles.submitSmallText}>Submit</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.emptyOb}>
                  <Ionicons name="calendar-outline" size={32} color={colors.onSurfaceFaint} />
                  <Text style={styles.emptyObText}>No obligations found for this tax year.</Text>
                  <Text style={styles.emptyObSub}>
                    {!connection?.hasBusinessDetails
                      ? 'Add your National Insurance number in your profile to fetch obligations.'
                      : 'Obligations will appear once HMRC has them ready.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Submit CTA */}
            <TouchableOpacity
              onPress={() => navigation.navigate('HmrcSubmit', { taxYear: '2026-27' })}
              activeOpacity={0.8}
              style={{ marginTop: spacing.lg }}
            >
              <LinearGradient
                colors={gradients.hero as unknown as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Ionicons name="send-outline" size={20} color={colors.surfaceLowest} />
                <Text style={styles.ctaText}>Preview & submit update</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceLowest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: colors.onSurface,
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    marginTop: -1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 48,
  },
  screenLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    marginBottom: spacing.xs,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.onSurface,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.onSurfaceMuted,
  },
  // Cards
  card: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 2,
  },
  statusSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
    lineHeight: 18,
  },
  disconnectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainerLow,
  },
  disconnectText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.negative,
  },
  lastSubmission: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 0,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xs,
    padding: spacing.sm,
  },
  lastSubmissionText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceMuted,
  },
  // Info card
  infoCard: {
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceMuted,
    lineHeight: 20,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoItemText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurface,
    flex: 1,
  },
  // Obligations
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  obligationDivider: {
    height: 1,
    backgroundColor: colors.surfaceContainerHigh,
    marginVertical: spacing.sm,
  },
  obligationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quarterBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quarterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.onSurfaceMuted,
  },
  obligationPeriod: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.onSurface,
    marginBottom: 2,
  },
  obligationDue: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceMuted,
  },
  submitSmallButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
  },
  submitSmallText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.surfaceLowest,
  },
  emptyOb: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyObText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.onSurfaceMuted,
    marginTop: spacing.sm,
  },
  emptyObSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceFaint,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.surfaceLowest,
  },
  ctaNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.onSurfaceFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 16,
  },
});
