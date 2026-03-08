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
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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
          <ActivityIndicator size="large" color={colors.ember} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Evidence</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Transaction Card */}
        <View style={styles.transactionCard}>
          <Text style={styles.merchantName}>{transaction.merchant_name}</Text>
          <Text style={styles.amount}>£{Math.abs(transaction.amount).toFixed(2)}</Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.category}>{transaction.category_name}</Text>
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
              <Ionicons name="bulb" size={20} color={colors.ember} />
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
                  <Ionicons name={copiedText === transaction.merchant_name ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === transaction.merchant_name ? colors.tagGreenText : colors.ember} />
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
                      <Ionicons name={copiedText === amountOnly ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === amountOnly ? colors.tagGreenText : colors.ember} />
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
                      <Ionicons name={copiedText === merchantAmount ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === merchantAmount ? colors.tagGreenText : colors.ember} />
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
                      <Ionicons name={copiedText === receiptSearch ? "checkmark-circle" : "copy-outline"} size={16} color={copiedText === receiptSearch ? colors.tagGreenText : colors.ember} />
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
          <Text style={styles.sectionTitle}>Receipt {noReceiptMode ? '(Skipped)' : '*'}</Text>
          <Text style={styles.sectionSubtitle}>
            {noReceiptMode
              ? 'You\'ve selected to proceed without a receipt'
              : 'HMRC requires proof of purchase'}
          </Text>

          {noReceiptMode ? (
            <View style={styles.noReceiptWarning}>
              <View style={styles.noReceiptWarningHeader}>
                <Ionicons name="alert-circle" size={24} color={colors.ember} />
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
                <Ionicons name="receipt-outline" size={18} color={colors.ember} />
                <Text style={styles.addReceiptInsteadText}>Add a receipt instead</Text>
              </TouchableOpacity>
            </View>
          ) : receiptImage ? (
            <View style={styles.imageContainer}>
              {isPdf ? (
                <View style={styles.pdfPreview}>
                  <Ionicons name="document-text" size={48} color={colors.ember} />
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
                <Text style={styles.changeImageText}>Change</Text>
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
                  <Ionicons name="camera" size={24} color={colors.ember} />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('library')}
                  disabled={uploading}
                >
                  <Ionicons name="images" size={24} color={colors.ember} />
                  <Text style={styles.uploadButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.pdfUploadButton}
                onPress={() => pickPdf()}
                disabled={uploading}
              >
                <Ionicons name="document-text" size={24} color={colors.ember} />
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
                <Ionicons name="document-lock-outline" size={20} color={colors.midGrey} />
                <Text style={styles.noReceiptButtonText}>I don't have a receipt</Text>
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color={colors.ember} />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>

        {/* Business Use Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {noReceiptMode ? 'Detailed Expense Notes *' : 'Business Use Explanation *'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {noReceiptMode
              ? 'Required: describe what was purchased, from whom, when, and the business purpose (min 50 characters)'
              : 'Explain how this expense relates to your business'}
          </Text>
          <TextInput
            style={[styles.textInput, noReceiptMode && styles.textInputNoReceipt]}
            placeholder={noReceiptMode
              ? "e.g., Purchased USB-C cable from Currys PC World on 15th March for connecting camera to MacBook for video editing. Lost receipt but have bank statement showing transaction."
              : "e.g., Camera lens for filming YouTube videos"}
            placeholderTextColor={colors.midGrey}
            value={businessUseExplanation}
            onChangeText={setBusinessUseExplanation}
            multiline
            numberOfLines={noReceiptMode ? 6 : 4}
            textAlignVertical="top"
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
          <Text style={styles.sectionTitle}>Content Link (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Link to content featuring this purchase
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={colors.midGrey}
            value={contentLink}
            onChangeText={setContentLink}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, (saving || uploading) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || uploading}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Evidence</Text>
                <Ionicons name="checkmark" size={20} color={colors.white} />
              </>
            )}
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
    backgroundColor: colors.parchment,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  transactionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
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
    color: colors.ember,
    marginBottom: spacing.sm,
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  category: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.tagGreenText,
  },
  date: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  explanation: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    lineHeight: 20,
  },
  // Memory Jogger Styles
  memoryJoggerSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.mist,
    ...shadows.sm,
  },
  memoryJoggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  memoryJoggerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  memoryJoggerTitle: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ember,
  },
  memoryJoggerContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  memoryJoggerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: spacing.sm,
  },
  emailHintCard: {
    backgroundColor: colors.parchment,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginBottom: 10,
  },
  emailHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 6,
  },
  emailHintFrom: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    flex: 1,
  },
  emailHintSubject: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 6,
  },
  emailHintSnippet: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  emailHintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailHintDate: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  emailHintRelevance: {
    backgroundColor: colors.tagGreenBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  emailHintRelevanceText: {
    fontSize: 11,
    fontFamily: fonts.displayMed,
    color: colors.tagGreenText,
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
    backgroundColor: colors.parchment,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.mist,
  },
  searchTermChipCopied: {
    backgroundColor: colors.tagGreenBg,
    borderColor: colors.tagGreenText,
  },
  searchTermText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
    flex: 1,
  },
  copiedBadge: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.tagGreenText,
  },
  searchTips: {
    backgroundColor: colors.parchment,
    borderRadius: borderRadius.lg,
    padding: 14,
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
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: colors.mist,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.ember,
  },
  pdfUploadButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.mist,
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
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textDecorationLine: 'underline',
  },
  noReceiptWarning: {
    backgroundColor: colors.tagEmberBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.ember,
  },
  noReceiptWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  noReceiptWarningTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.ember,
  },
  noReceiptWarningText: {
    fontSize: 14,
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
    backgroundColor: colors.tagEmberBg,
    borderRadius: borderRadius.md,
  },
  addReceiptInsteadText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ember,
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.mist,
  },
  pdfFileName: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  pdfUploaded: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.tagGreenText,
  },
  imageContainer: {
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.ember,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  changeImageText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  uploadingText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.mist,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.mist,
    minHeight: 120,
  },
  textInputNoReceipt: {
    minHeight: 160,
    borderColor: colors.ember,
  },
  charCount: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  charCountOk: {
    color: colors.tagGreenText,
  },
  actionButtons: {
    gap: spacing.sm,
    marginBottom: 40,
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
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.mist,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
});
