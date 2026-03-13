import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface AddEvidenceScreenProps {
  route: any;
  navigation: any;
}

export default function AddEvidenceScreen({ route, navigation }: AddEvidenceScreenProps) {
  const { transaction } = route.params;

  const [receiptImage, setReceiptImage] = useState<string | null>(
    transaction.receipt_image_url || null
  );
  const [isPdf, setIsPdf] = useState(
    transaction.receipt_image_url?.toLowerCase().endsWith('.pdf') || false
  );
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [businessUseExplanation, setBusinessUseExplanation] = useState(
    transaction.business_use_explanation || ''
  );
  const [contentLink, setContentLink] = useState(transaction.content_link || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const saveEvidence = async () => {
    if (!receiptImage) {
      Alert.alert('Receipt required', 'Please add a receipt image');
      return;
    }

    if (!businessUseExplanation.trim()) {
      Alert.alert('Explanation required', 'Please explain the business use');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('categorized_transactions')
        .update({
          receipt_image_url: receiptImage,
          business_use_explanation: businessUseExplanation.trim(),
          content_link: contentLink.trim() || null,
          qualified: true,
          qualified_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);

      if (error) throw error;

      Alert.alert('Success', 'Evidence saved!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error saving evidence:', error);
      Alert.alert('Error', 'Failed to save evidence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Screen Label */}
        <Text style={styles.screenLabel}>EVIDENCE</Text>

        {/* Hero Heading */}
        <Text style={styles.heroHeading}>{'add\nevidence.'}</Text>

        {/* Transaction Info */}
        <View style={styles.transactionCard}>
          <Text style={styles.merchantName}>{transaction.merchant_name}</Text>
          <Text style={styles.amount}>
            {transaction.amount < 0
              ? `-\u00A3${Math.abs(transaction.amount).toFixed(2)}`
              : `\u00A3${Math.abs(transaction.amount).toFixed(2)}`}
          </Text>
          <Text style={styles.category}>{transaction.category_name}</Text>
        </View>

        {/* Receipt Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt *</Text>
          <Text style={styles.sectionSubtitle}>HMRC requires proof of purchase</Text>

          {receiptImage ? (
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
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.uploadArea}>
                <Ionicons name="cloud-upload-outline" size={32} color={colors.muted} />
                <Text style={styles.uploadAreaText}>Upload receipt</Text>
              </View>

              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('camera')}
                  disabled={uploading}
                >
                  <Ionicons name="camera" size={20} color={colors.gradientMid} />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('library')}
                  disabled={uploading}
                >
                  <Ionicons name="images" size={20} color={colors.gradientMid} />
                  <Text style={styles.uploadButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickPdf()}
                disabled={uploading}
              >
                <Ionicons name="document-text" size={20} color={colors.gradientMid} />
                <Text style={styles.uploadButtonText}>Upload PDF Receipt</Text>
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

        {/* Business Use Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Use Explanation *</Text>
          <Text style={styles.sectionSubtitle}>
            Explain how this expense relates to your business
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Camera lens for filming YouTube videos"
            placeholderTextColor={colors.muted}
            value={businessUseExplanation}
            onChangeText={setBusinessUseExplanation}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Content Link Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Link (Optional)</Text>
          <Text style={styles.sectionSubtitle}>
            Link to content featuring this purchase
          </Text>
          <TextInput
            style={styles.input}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor={colors.muted}
            value={contentLink}
            onChangeText={setContentLink}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={saveEvidence}
          disabled={saving || uploading}
          activeOpacity={0.8}
          style={{ marginBottom: 40 }}
        >
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, (saving || uploading) && styles.saveButtonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>save evidence {'\u2192'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
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
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: '#FF4500',
    fontFamily: fonts.displaySemi,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  heroHeading: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  transactionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  merchantName: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  amount: {
    fontSize: 24,
    fontFamily: fonts.display,
    color: colors.negative,
    marginBottom: spacing.xs,
  },
  category: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: spacing.sm,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  uploadAreaText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.gradientMid,
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
  pdfPreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
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
    color: colors.positive,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.ink,
    minHeight: 120,
  },
  saveButton: {
    borderRadius: borderRadius.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
});
