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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Feature flag - set to true when Gmail OAuth is verified by Google
const GMAIL_INTEGRATION_ENABLED = false;

interface EmailHint {
  subject: string;
  from: string;
  date: string;
  snippet: string;
  relevance: string;
}

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

  // Email memory jogger state
  const [emailHints, setEmailHints] = useState<EmailHint[]>([]);
  const [loadingEmailHints, setLoadingEmailHints] = useState(false);
  const [hasGmailConnected, setHasGmailConnected] = useState(false);
  const [showEmailHints, setShowEmailHints] = useState(false);

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

  // Check Gmail connection and fetch email hints on mount
  useEffect(() => {
    if (transaction) {
      checkGmailConnectionAndFetchHints();
    }
  }, [transaction]);

  const checkGmailConnectionAndFetchHints = async () => {
    // Skip if Gmail integration is disabled
    if (!GMAIL_INTEGRATION_ENABLED) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if Gmail is connected
      const statusResponse = await fetch(`${API_URL}/api/gmail/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: session.user.id }),
      });

      const statusData = await statusResponse.json();
      setHasGmailConnected(statusData.connected);

      // If connected, fetch email hints for this transaction
      if (statusData.connected) {
        fetchEmailHints(session);
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
    }
  };

  const fetchEmailHints = async (session: any) => {
    setLoadingEmailHints(true);
    try {
      const response = await fetch(`${API_URL}/api/gmail/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: session.user.id,
          merchant_name: transaction.merchant_name,
          amount: transaction.amount,
          transaction_date: transaction.transaction_date,
        }),
      });

      const data = await response.json();

      if (response.ok && data.matches) {
        setEmailHints(data.matches);
        if (data.matches.length > 0) {
          setShowEmailHints(true);
        }
      }
    } catch (error) {
      console.error('Error fetching email hints:', error);
    } finally {
      setLoadingEmailHints(false);
    }
  };

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
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

        {/* Email Memory Jogger */}
        {hasGmailConnected && (
          <View style={styles.memoryJoggerSection}>
            <TouchableOpacity
              style={styles.memoryJoggerHeader}
              onPress={() => setShowEmailHints(!showEmailHints)}
            >
              <View style={styles.memoryJoggerTitleRow}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.memoryJoggerTitle}>Memory Jogger</Text>
                {loadingEmailHints && <ActivityIndicator size="small" color="#F59E0B" style={{ marginLeft: 8 }} />}
              </View>
              <Ionicons
                name={showEmailHints ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>

            {showEmailHints && (
              <View style={styles.memoryJoggerContent}>
                {emailHints.length > 0 ? (
                  <>
                    <Text style={styles.memoryJoggerSubtitle}>
                      Found {emailHints.length} related email{emailHints.length !== 1 ? 's' : ''}:
                    </Text>
                    {emailHints.map((hint, index) => (
                      <View key={index} style={styles.emailHintCard}>
                        <View style={styles.emailHintHeader}>
                          <Ionicons name="mail" size={16} color="#7C3AED" />
                          <Text style={styles.emailHintFrom} numberOfLines={1}>{hint.from}</Text>
                        </View>
                        <Text style={styles.emailHintSubject} numberOfLines={2}>{hint.subject}</Text>
                        <Text style={styles.emailHintSnippet} numberOfLines={3}>{hint.snippet}</Text>
                        <View style={styles.emailHintFooter}>
                          <Text style={styles.emailHintDate}>{hint.date}</Text>
                          <View style={styles.emailHintRelevance}>
                            <Text style={styles.emailHintRelevanceText}>{hint.relevance}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </>
                ) : loadingEmailHints ? (
                  <Text style={styles.memoryJoggerSubtitle}>Searching your emails...</Text>
                ) : (
                  <Text style={styles.memoryJoggerSubtitle}>No related emails found</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Receipt Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt *</Text>
          <Text style={styles.sectionSubtitle}>HMRC requires proof of purchase</Text>

          {receiptImage ? (
            <View style={styles.imageContainer}>
              {isPdf ? (
                <View style={styles.pdfPreview}>
                  <Ionicons name="document-text" size={48} color="#7C3AED" />
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
                  <Ionicons name="camera" size={24} color="#7C3AED" />
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('library')}
                  disabled={uploading}
                >
                  <Ionicons name="images" size={24} color="#7C3AED" />
                  <Text style={styles.uploadButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.pdfUploadButton}
                onPress={() => pickPdf()}
                disabled={uploading}
              >
                <Ionicons name="document-text" size={24} color="#7C3AED" />
                <Text style={styles.uploadButtonText}>Upload PDF Receipt</Text>
              </TouchableOpacity>
            </View>
          )}

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color="#7C3AED" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>

        {/* Business Use Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Use Explanation *</Text>
          <Text style={styles.sectionSubtitle}>
            Explain how this expense relates to your business
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Camera lens for filming YouTube videos"
            placeholderTextColor="#64748B"
            value={businessUseExplanation}
            onChangeText={setBusinessUseExplanation}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
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
            placeholderTextColor="#64748B"
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
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Evidence</Text>
                <Ionicons name="checkmark" size={20} color="#fff" />
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
    backgroundColor: '#2E1A47',
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
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  transactionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 12,
  },
  transactionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  date: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  explanation: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  // Memory Jogger Styles
  memoryJoggerSection: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  memoryJoggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  memoryJoggerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memoryJoggerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
  },
  memoryJoggerContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  memoryJoggerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  emailHintCard: {
    backgroundColor: '#2E1A47',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  emailHintHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  emailHintFrom: {
    fontSize: 13,
    color: '#9CA3AF',
    flex: 1,
  },
  emailHintSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  emailHintSnippet: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 8,
  },
  emailHintFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emailHintDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  emailHintRelevance: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  emailHintRelevanceText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#7C3AED30',
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  pdfUploadButton: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#7C3AED30',
  },
  pdfPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: '#7C3AED30',
  },
  pdfFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pdfUploaded: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#1F1333',
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  input: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#7C3AED30',
  },
  textInput: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#7C3AED30',
    minHeight: 120,
  },
  actionButtons: {
    gap: 12,
    marginBottom: 40,
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748B',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
