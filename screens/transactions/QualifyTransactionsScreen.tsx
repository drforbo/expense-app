import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

const CATEGORY_EMOJI: Record<string, string> = {
  'Office Supplies': '🖊️', 'Travel': '✈️', 'Meals': '🍽️', 'Software': '💻',
  'Marketing': '📣', 'Insurance': '🛡️', 'Utilities': '⚡', 'Rent': '🏠',
  'Professional Services': '👔', 'Training': '📚', 'Equipment': '🔧',
  'Phone': '📱', 'Internet': '🌐', 'Subscriptions': '🔄', 'Bank Fees': '🏦',
  'Transport': '🚗', 'Clothing': '👕', 'Entertainment': '🎭', 'Health': '💊',
  'Gifts': '🎁', 'Income': '💰', 'Other': '📋',
};
const getCategoryEmoji = (cat: string) => CATEGORY_EMOJI[cat] || '📋';

interface Transaction {
  id: string;
  merchant_name: string;
  amount: number;
  transaction_date: string;
  category_name: string;
  business_percent: number;
  explanation: string;
  receipt_image_url?: string;
  business_use_explanation?: string;
  content_link?: string;
}

export default function QualifyTransactionsScreen({ navigation, route }: any) {
  const transaction: Transaction = route.params?.transaction;
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for current transaction
  const [receiptImage, setReceiptImage] = useState<string | null>(transaction?.receipt_image_url || null);
  const [isPdf, setIsPdf] = useState(
    transaction?.receipt_image_url?.toLowerCase().endsWith('.pdf') || false
  );
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [businessUseExplanation, setBusinessUseExplanation] = useState(transaction?.business_use_explanation || '');
  const [contentLink, setContentLink] = useState(transaction?.content_link || '');
  const [noReceiptMode, setNoReceiptMode] = useState(false);

  // Memory jogger state
  const [showMemoryJogger, setShowMemoryJogger] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Input focus state
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required');
          return;
        }
      }

      const result = await (source === 'camera'
        ? ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          })
        : ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
          }));

      if (!result.canceled && result.assets[0]) {
        setIsPdf(false);
        setPdfFileName(null);
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      await uploadPdf(file.uri, file.name);
    } catch (error: any) {
      console.error('Error picking PDF:', error);
      Alert.alert('Error', 'Failed to select PDF');
    }
  };

  const uploadPdf = async (uri: string, fileName: string) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Create file name
      const storagePath = `${user.id}/${transaction.id}_${Date.now()}.pdf`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(storagePath, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(storagePath);

      setReceiptImage(publicUrl);
      setIsPdf(true);
      setPdfFileName(fileName);
      Alert.alert('Success', 'PDF uploaded!');
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      Alert.alert('Error', 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Create file name
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${transaction.id}_${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // Convert base64 to ArrayBuffer
      const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      setReceiptImage(publicUrl);
      Alert.alert('Success', 'Receipt uploaded!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // In no-receipt mode, require detailed explanation (50+ chars)
    if (noReceiptMode) {
      if (businessUseExplanation.trim().length < 50) {
        Alert.alert(
          'More detail needed',
          'Without a receipt, HMRC requires a detailed explanation. Please provide at least 50 characters describing: what was purchased, from whom, and the business purpose.'
        );
        return;
      }
    } else {
      if (!receiptImage) {
        Alert.alert('Receipt required', 'Please add a receipt image or select "No Receipt Available"');
        return;
      }
      if (!businessUseExplanation.trim()) {
        Alert.alert('Explanation required', 'Please explain the business use');
        return;
      }
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('categorized_transactions')
        .update({
          receipt_image_url: noReceiptMode ? null : receiptImage,
          business_use_explanation: businessUseExplanation.trim(),
          content_link: contentLink.trim() || null,
          evidence_type: noReceiptMode ? 'note_only' : 'receipt',
          qualified: true,
          qualified_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (error) throw error;

      // Go back to list
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save evidence');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.goBack();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // If no transaction passed, go back
  useEffect(() => {
    if (!transaction) {
      navigation.goBack();
    }
  }, [transaction, navigation]);

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenLabel}>QUALIFY</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Transaction Card */}
        <View style={styles.transactionCard}>
          <Text style={styles.merchantName}>
            {getCategoryEmoji(transaction.category_name)} {transaction.merchant_name}
          </Text>
          <Text style={styles.amount}>£{Math.abs(transaction.amount).toFixed(2)}</Text>
          <View style={styles.transactionMeta}>
            <View style={styles.categoryTag}>
              <Text style={styles.category}>{transaction.category_name}</Text>
            </View>
            <Text style={styles.date}>{formatDate(transaction.transaction_date)}</Text>
          </View>
          <Text style={styles.explanation}>{transaction.explanation}</Text>
        </View>

        {/* Memory Jogger - Search suggestions */}
        <View style={styles.memoryJoggerSection}>
          <TouchableOpacity
            style={styles.memoryJoggerHeader}
            onPress={() => setShowMemoryJogger(!showMemoryJogger)}
          >
            <View style={styles.memoryJoggerTitleRow}>
              <Ionicons name="bulb" size={20} color={colors.gradientMid} />
              <Text style={styles.memoryJoggerTitle}>Memory Jogger</Text>
            </View>
            <Ionicons
              name={showMemoryJogger ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.midGrey}
            />
          </TouchableOpacity>

          {showMemoryJogger && transaction && (
            <View style={styles.memoryJoggerContent}>
              <Text style={styles.memoryJoggerSubtitle}>
                Can't find your receipt? Try searching your email or messages:
              </Text>

              <View style={styles.searchSuggestions}>
                <Text style={styles.searchSuggestionLabel}>Tap to copy:</Text>

                {/* Simple merchant name - works everywhere */}
                <TouchableOpacity
                  style={[styles.searchTermChip, copiedText === transaction.merchant_name && styles.searchTermChipCopied]}
                  onPress={() => copyToClipboard(transaction.merchant_name)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={copiedText === transaction.merchant_name ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === transaction.merchant_name ? colors.positive : colors.gradientMid} />
                  <Text style={styles.searchTermText}>{transaction.merchant_name}</Text>
                  {copiedText === transaction.merchant_name && <Text style={styles.copiedBadge}>Copied!</Text>}
                </TouchableOpacity>

                {/* Amount variations - try with and without £ symbol */}
                {(() => {
                  const amountOnly = Math.abs(transaction.amount).toFixed(2);
                  return (
                    <TouchableOpacity
                      style={[styles.searchTermChip, copiedText === amountOnly && styles.searchTermChipCopied]}
                      onPress={() => copyToClipboard(amountOnly)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={copiedText === amountOnly ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === amountOnly ? colors.positive : colors.gradientMid} />
                      <Text style={styles.searchTermText}>{amountOnly}</Text>
                      {copiedText === amountOnly && <Text style={styles.copiedBadge}>Copied!</Text>}
                    </TouchableOpacity>
                  );
                })()}

                {/* Merchant + amount combo */}
                {(() => {
                  const merchantAmount = `${transaction.merchant_name} ${Math.abs(transaction.amount).toFixed(2)}`;
                  return (
                    <TouchableOpacity
                      style={[styles.searchTermChip, copiedText === merchantAmount && styles.searchTermChipCopied]}
                      onPress={() => copyToClipboard(merchantAmount)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={copiedText === merchantAmount ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === merchantAmount ? colors.positive : colors.gradientMid} />
                      <Text style={styles.searchTermText}>{merchantAmount}</Text>
                      {copiedText === merchantAmount && <Text style={styles.copiedBadge}>Copied!</Text>}
                    </TouchableOpacity>
                  );
                })()}

                {/* Receipt/order/confirmation keywords */}
                {(() => {
                  const receiptSearch = `${transaction.merchant_name} receipt OR order OR confirmation`;
                  return (
                    <TouchableOpacity
                      style={[styles.searchTermChip, copiedText === receiptSearch && styles.searchTermChipCopied]}
                      onPress={() => copyToClipboard(receiptSearch)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={copiedText === receiptSearch ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === receiptSearch ? colors.positive : colors.gradientMid} />
                      <Text style={styles.searchTermText} numberOfLines={1}>{transaction.merchant_name} receipt OR order</Text>
                      {copiedText === receiptSearch && <Text style={styles.copiedBadge}>Copied!</Text>}
                    </TouchableOpacity>
                  );
                })()}
              </View>

              <View style={styles.searchTips}>
                <Text style={styles.searchTipTitle}>Where to look:</Text>
                <View style={styles.searchTipRow}>
                  <Ionicons name="mail-outline" size={16} color={colors.midGrey} />
                  <Text style={styles.searchTipText}>Email inbox & receipts folder</Text>
                </View>
                <View style={styles.searchTipRow}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.midGrey} />
                  <Text style={styles.searchTipText}>WhatsApp & iMessage</Text>
                </View>
                <View style={styles.searchTipRow}>
                  <Ionicons name="images-outline" size={16} color={colors.midGrey} />
                  <Text style={styles.searchTipText}>Photos app (screenshots)</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Receipt Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>RECEIPT {noReceiptMode ? '(SKIPPED)' : '*'}</Text>
          <Text style={styles.sectionSubtitle}>
            {noReceiptMode
              ? 'You\'ve selected to proceed without a receipt'
              : 'HMRC requires proof of purchase'}
          </Text>

          {noReceiptMode ? (
            <View style={styles.noReceiptWarning}>
              <View style={styles.noReceiptWarningHeader}>
                <Ionicons name="alert-circle" size={24} color={colors.gradientMid} />
                <Text style={styles.noReceiptWarningTitle}>No Receipt Mode</Text>
              </View>
              <Text style={styles.noReceiptWarningText}>
                HMRC allows claims without receipts if you provide detailed notes. However:
              </Text>
              <View style={styles.noReceiptWarningList}>
                <Text style={styles.noReceiptWarningItem}>• Keep note-only claims to ~5% of expenses</Text>
                <Text style={styles.noReceiptWarningItem}>• Include: what, where, when, and why</Text>
              </View>
              <TouchableOpacity
                style={styles.addReceiptInstead}
                onPress={() => {
                  setNoReceiptMode(false);
                }}
              >
                <Ionicons name="receipt-outline" size={18} color={colors.gradientMid} />
                <Text style={styles.addReceiptInsteadText}>Add a receipt instead</Text>
              </TouchableOpacity>
            </View>
          ) : receiptImage ? (
            <View style={styles.imageContainer}>
              {isPdf ? (
                <View style={styles.pdfPreview}>
                  <Ionicons name="document-text" size={48} color={colors.gradientMid} />
                  <Text style={styles.pdfFileName} numberOfLines={2}>
                    {pdfFileName || 'PDF Receipt'}
                  </Text>
                  <Text style={styles.pdfUploaded}>Uploaded</Text>
                </View>
              ) : (
                <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
              )}
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => {
                  Alert.alert('Change Receipt', 'Choose source', [
                    { text: 'Take Photo', onPress: () => pickImage('camera') },
                    { text: 'Choose from Library', onPress: () => pickImage('library') },
                    { text: 'Upload PDF', onPress: () => pickPdf() },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <LinearGradient
                  colors={gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.changeImageGradient}
                >
                  <Text style={styles.changeImageText}>Change</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('camera')}
                  disabled={uploading}
                >
                  <Ionicons name="camera" size={24} color={colors.gradientMid} />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('library')}
                  disabled={uploading}
                >
                  <Ionicons name="images" size={24} color={colors.gradientMid} />
                  <Text style={styles.uploadButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.pdfUploadButton}
                onPress={() => pickPdf()}
                disabled={uploading}
              >
                <Ionicons name="document-text" size={24} color={colors.gradientMid} />
                <Text style={styles.uploadButtonText}>Upload PDF Receipt</Text>
              </TouchableOpacity>

              {/* No Receipt Option */}
              <TouchableOpacity
                style={styles.noReceiptButton}
                onPress={() => {
                  Alert.alert(
                    'No Receipt Available?',
                    'HMRC allows expense claims without receipts if you provide detailed notes. This should only be used occasionally.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Continue Without Receipt',
                        onPress: () => setNoReceiptMode(true)
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="document-lock-outline" size={20} color={colors.muted} />
                <Text style={styles.noReceiptButtonText}>I don't have a receipt</Text>
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color={colors.gradientMid} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>

        {/* Business Use Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {noReceiptMode ? 'DETAILED EXPENSE NOTES *' : 'BUSINESS USE EXPLANATION *'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {noReceiptMode
              ? 'Required: describe what was purchased, from whom, when, and the business purpose (min 50 characters)'
              : 'Explain how this expense relates to your business'}
          </Text>
          <TextInput
            style={[
              styles.textInput,
              noReceiptMode && styles.textInputNoReceipt,
              focusedInput === 'explanation' && styles.inputFocused,
            ]}
            placeholder={noReceiptMode
              ? "e.g., Purchased USB-C cable from Currys PC World on 15th March for connecting camera to MacBook for video editing. Lost receipt but have bank statement showing transaction."
              : "e.g., Camera lens for filming YouTube videos"}
            placeholderTextColor={colors.muted}
            value={businessUseExplanation}
            onChangeText={setBusinessUseExplanation}
            multiline
            numberOfLines={noReceiptMode ? 6 : 4}
            textAlignVertical="top"
            onFocus={() => setFocusedInput('explanation')}
            onBlur={() => setFocusedInput(null)}
          />
          {noReceiptMode && (
            <Text style={styles.charCount}>
              {businessUseExplanation.length}/50 characters minimum
              {businessUseExplanation.length >= 50 && (
                <Text style={styles.charCountOk}> ✓</Text>
              )}
            </Text>
          )}
        </View>

        {/* Content Link */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONTENT LINK (OPTIONAL)</Text>
          <Text style={styles.sectionSubtitle}>
            Link to content featuring this purchase
          </Text>
          <TextInput
            style={[
              styles.input,
              focusedInput === 'contentLink' && styles.inputFocused,
            ]}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={colors.muted}
            value={contentLink}
            onChangeText={setContentLink}
            autoCapitalize="none"
            keyboardType="url"
            onFocus={() => setFocusedInput('contentLink')}
            onBlur={() => setFocusedInput(null)}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButtonWrap, (saving || uploading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || uploading}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.gradientButtonText}>Save Evidence</Text>
                  <Ionicons name="checkmark" size={20} color={colors.white} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={saving || uploading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  backArrow: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: -1,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  merchantName: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  amount: {
    fontSize: 32,
    fontFamily: fonts.display,
    color: colors.negative,
    marginBottom: spacing.sm,
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryTag: {
    backgroundColor: colors.tagExpenseBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  category: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.tagExpenseText,
  },
  date: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  explanation: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
    lineHeight: 20,
  },
  // Memory Jogger Styles
  memoryJoggerSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  memoryJoggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  memoryJoggerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memoryJoggerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  memoryJoggerContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  memoryJoggerSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: spacing.sm,
  },
  // Search suggestions styles
  searchSuggestions: {
    marginBottom: spacing.md,
  },
  searchSuggestionLabel: {
    fontSize: 13,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: 10,
  },
  searchTermChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: 10,
  },
  searchTermChipCopied: {
    backgroundColor: colors.tagIncomeBg,
    borderColor: colors.positive,
  },
  searchTermText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    flex: 1,
  },
  copiedBadge: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.positive,
  },
  searchTips: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchTipTitle: {
    fontSize: 13,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: 10,
  },
  searchTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.xs,
  },
  searchTipText: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: spacing.sm,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  uploadButtonText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.gradientMid,
  },
  pdfUploadButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  noReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  noReceiptButtonText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.muted,
    textDecorationLine: 'underline',
  },
  noReceiptWarning: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  noReceiptWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  noReceiptWarningTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.gradientMid,
  },
  noReceiptWarningText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  noReceiptWarningList: {
    marginBottom: spacing.md,
  },
  noReceiptWarningItem: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: 4,
    lineHeight: 18,
  },
  addReceiptInstead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  addReceiptInsteadText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.gradientMid,
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pdfFileName: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  pdfUploaded: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.positive,
  },
  imageContainer: {
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  changeImageGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  changeImageText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  uploadingText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  inputFocused: {
    borderColor: colors.gradientMid,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
    minHeight: 120,
  },
  textInputNoReceipt: {
    minHeight: 160,
  },
  charCount: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  charCountOk: {
    color: colors.positive,
  },
  actionButtons: {
    gap: spacing.sm,
    marginBottom: 40,
  },
  saveButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  gradientButton: {
    borderRadius: borderRadius.full,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  gradientButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    padding: spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
});
