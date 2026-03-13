import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { apiPost, apiUpload } from '../../lib/api';
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

const BANK_SUGGESTIONS = [
  'Barclays',
  'HSBC',
  'Lloyds',
  'NatWest',
  'Santander',
  'Monzo',
  'Starling',
  'Revolut',
  'Nationwide',
  'Halifax',
  'TSB',
  'Metro Bank',
  'Tide',
];

export default function MonthDetailScreen({ navigation, route }: any) {
  const { month, monthLabel } = route.params;

  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Bank name modal state
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [previousBanks, setPreviousBanks] = useState<string[]>([]);

  // Reload data every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadStatements();
    }, [month])
  );

  const loadStatements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const data = await apiPost('/api/get_statements_by_month', { user_id: user.id });

      if (Array.isArray(data)) {
        const monthStatements = data.filter((s: Statement) => s.statement_month === month);
        setStatements(monthStatements);

        // Collect unique bank names from all statements for suggestions
        const banks = data
          .map((s: Statement) => s.bank_name)
          .filter((b: string | undefined): b is string => !!b && b !== 'Unknown Bank');
        setPreviousBanks([...new Set(banks)]);
      }
    } catch (error) {
      console.error('Error loading statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStatement = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setPendingFile({ uri: file.uri, name: file.name, size: file.size });
      setBankName('');
      setFilteredSuggestions([]);
      setShowBankModal(true);
    } catch (error: any) {
      console.error('Error picking file:', error);
      Alert.alert('Error', error.message || 'Failed to select file');
    }
  };

  const handleBankNameChange = (text: string) => {
    setBankName(text);
    if (text.length > 0) {
      const allBanks = [...new Set([...previousBanks, ...BANK_SUGGESTIONS])];
      const filtered = allBanks.filter(b =>
        b.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  };

  const handleUploadConfirm = async () => {
    if (!pendingFile) return;

    setShowBankModal(false);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in');

      const formData = new FormData();
      formData.append('pdf', {
        uri: pendingFile.uri,
        type: 'application/pdf',
        name: pendingFile.name,
      } as any);
      formData.append('user_id', user.id);
      formData.append('bank_name', bankName.trim() || 'Unknown Bank');
      formData.append('statement_month', month);

      const data = await apiUpload('/api/upload_statement', formData);

      if (data.success) {
        Alert.alert('Uploaded', 'Statement uploaded successfully. It will be processed shortly.');
        loadStatements();
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload statement');
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleDelete = (statement: Statement) => {
    Alert.alert(
      'Delete Statement',
      `Are you sure you want to delete "${statement.filename}"? This will also remove any extracted transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteStatement(statement.id),
        },
      ]
    );
  };

  const deleteStatement = async (statementId: string) => {
    try {
      setDeleting(statementId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const result = await apiPost('/api/delete_statement', {
        user_id: user.id,
        statement_id: statementId,
      });

      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        setStatements(prev => prev.filter(s => s.id !== statementId));
      }
    } catch (error: any) {
      console.error('Error deleting statement:', error);
      Alert.alert('Error', error.message || 'Failed to delete statement');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', bg: colors.tagIncomeBg, color: colors.tagIncomeText };
      case 'processing':
        return { label: 'Processing', bg: colors.tagExpenseBg, color: colors.tagExpenseText };
      default:
        return { label: 'Pending', bg: colors.surface, color: colors.midGrey };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Extract editorial month name from monthLabel (e.g. "February 2026" -> "february.")
  const editorialMonth = monthLabel.split(' ')[0].toLowerCase() + '.';

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
            <Text style={styles.screenLabel}>MONTH DETAIL</Text>
            <Text style={styles.heading}>{editorialMonth}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Add Statement CTA */}
        <TouchableOpacity
          onPress={handleAddStatement}
          disabled={uploading}
          activeOpacity={0.8}
          style={{ marginBottom: spacing.lg, opacity: uploading ? 0.7 : 1 }}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButton}
          >
            {uploading ? (
              <View style={styles.addButtonContent}>
                <ActivityIndicator color={colors.white} size="small" />
                <Text style={styles.addButtonText}>Uploading...</Text>
              </View>
            ) : (
              <View style={styles.addButtonContent}>
                <Ionicons name="add-circle" size={22} color={colors.white} />
                <Text style={styles.addButtonText}>Add Statement</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Summary Stats */}
        {statements.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statements.length}</Text>
              <Text style={styles.statLabel}>Statements</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {statements.filter(s => s.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Processed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {statements.reduce((sum, s) => sum + (s.transaction_count || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
          </View>
        )}

        {/* Statements List */}
        <Text style={styles.sectionTitle}>Uploaded Statements</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.gradientMid} />
          </View>
        ) : statements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>No statements for {monthLabel}</Text>
            <Text style={styles.emptySubtext}>
              Tap "Add Statement" to upload a PDF bank statement
            </Text>
          </View>
        ) : (
          statements.map((stmt) => {
            const badge = getStatusBadge(stmt.status);
            const isDeleting = deleting === stmt.id;

            return (
              <View key={stmt.id} style={styles.statementCard}>
                <View style={styles.statementIcon}>
                  <Text style={{ fontSize: 20 }}>📄</Text>
                </View>

                <View style={styles.statementInfo}>
                  <Text style={styles.bankName}>
                    {stmt.bank_name || 'Unknown Bank'}
                  </Text>
                  <Text style={styles.filename} numberOfLines={1}>
                    {stmt.filename}
                  </Text>
                  <View style={styles.statementMetaRow}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                    {stmt.status === 'completed' && stmt.transaction_count != null && (
                      <Text style={styles.txCount}>
                        {stmt.transaction_count} transactions
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(stmt)}
                  disabled={isDeleting}
                  activeOpacity={0.6}
                >
                  {isDeleting ? (
                    <ActivityIndicator color={colors.midGrey} size="small" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color={colors.midGrey} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>

      {/* Bank Name Modal */}
      <Modal
        visible={showBankModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowBankModal(false);
          setPendingFile(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Which bank is this from?</Text>
            <Text style={styles.modalSubtitle}>
              {pendingFile?.name}
            </Text>

            <TextInput
              style={styles.bankInput}
              value={bankName}
              onChangeText={handleBankNameChange}
              placeholder="e.g. Barclays, Monzo, HSBC..."
              placeholderTextColor={colors.muted}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleUploadConfirm}
            />

            {/* Suggestions */}
            {filteredSuggestions.length > 0 && (
              <ScrollView
                style={styles.suggestionsContainer}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {filteredSuggestions.map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setBankName(suggestion);
                      setFilteredSuggestions([]);
                    }}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Show common banks when input is empty */}
            {bankName.length === 0 && (
              <View style={styles.commonBanksSection}>
                <Text style={styles.commonBanksLabel}>Common banks</Text>
                <View style={styles.commonBanksGrid}>
                  {[...previousBanks, ...BANK_SUGGESTIONS.filter(b => !previousBanks.includes(b))]
                    .slice(0, 8)
                    .map((bank) => (
                      <TouchableOpacity
                        key={bank}
                        style={[
                          styles.suggestionChip,
                          previousBanks.includes(bank) && styles.previousBankChip,
                        ]}
                        onPress={() => {
                          setBankName(bank);
                          setFilteredSuggestions([]);
                        }}
                      >
                        <Text
                          style={[
                            styles.suggestionText,
                            previousBanks.includes(bank) && styles.previousBankText,
                          ]}
                        >
                          {bank}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setShowBankModal(false);
                  setPendingFile(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmWrap}
                onPress={handleUploadConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalConfirm}
                >
                  <Text style={styles.modalConfirmText}>Upload</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addButton: {
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.midGrey,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
    fontSize: 16,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  statementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tagExpenseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  bankName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 2,
  },
  filename: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: spacing.xs,
  },
  statementMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    borderRadius: borderRadius.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  txCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: -0.2,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: spacing.lg,
  },
  bankInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  suggestionsContainer: {
    marginBottom: spacing.md,
  },
  suggestionChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xs,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
  },
  previousBankChip: {
    backgroundColor: colors.tagBlueBg,
    borderColor: colors.tagBlueBg,
  },
  previousBankText: {
    color: colors.tagBlueText,
  },
  commonBanksSection: {
    marginBottom: spacing.md,
  },
  commonBanksLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.1,
  },
  commonBanksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
  },
  modalConfirmWrap: {
    flex: 1,
  },
  modalConfirm: {
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
  },
});
