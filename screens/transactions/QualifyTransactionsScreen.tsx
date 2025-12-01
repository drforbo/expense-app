import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';

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

export default function QualifyTransactionsScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for current transaction
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [businessUseExplanation, setBusinessUseExplanation] = useState('');
  const [contentLink, setContentLink] = useState('');

  useEffect(() => {
    loadUnqualifiedTransactions();
  }, []);

  const loadUnqualifiedTransactions = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Fetch tax-deductible transactions that haven't been qualified yet
      const { data, error } = await supabase
        .from('categorized_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_deductible', true)
        .or('qualified.is.null,qualified.eq.false')
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        Alert.alert('Error', 'Failed to load transactions');
        return;
      }

      setTransactions(data || []);

      // Load existing data if any
      if (data && data.length > 0) {
        const first = data[0];
        setReceiptImage(first.receipt_image_url || null);
        setBusinessUseExplanation(first.business_use_explanation || '');
        setContentLink(first.content_link || '');
      }
    } catch (error: any) {
      console.error('Error in loadUnqualifiedTransactions:', error);
      Alert.alert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
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
        await uploadImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
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

      const currentTransaction = transactions[currentIndex];

      // Create file name
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${currentTransaction.id}_${Date.now()}.${fileExt}`;

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

  const handleSaveAndNext = async () => {
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

      const currentTransaction = transactions[currentIndex];

      const { error } = await supabase
        .from('categorized_transactions')
        .update({
          receipt_image_url: receiptImage,
          business_use_explanation: businessUseExplanation.trim(),
          content_link: contentLink.trim() || null,
          qualified: true,
          qualified_at: new Date().toISOString(),
        })
        .eq('id', currentTransaction.id);

      if (error) throw error;

      // Move to next transaction
      const nextIndex = currentIndex + 1;
      if (nextIndex < transactions.length) {
        setCurrentIndex(nextIndex);

        // Load data for next transaction
        const next = transactions[nextIndex];
        setReceiptImage(next.receipt_image_url || null);
        setBusinessUseExplanation(next.business_use_explanation || '');
        setContentLink(next.content_link || '');
      } else {
        // All done!
        Alert.alert(
          'All Done!',
          'All your tax-deductible transactions are now qualified!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save evidence');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < transactions.length) {
      setCurrentIndex(nextIndex);

      // Load data for next transaction
      const next = transactions[nextIndex];
      setReceiptImage(next.receipt_image_url || null);
      setBusinessUseExplanation(next.business_use_explanation || '');
      setContentLink(next.content_link || '');
    } else {
      navigation.goBack();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Qualify Transactions</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.centerContainer}>
          <View style={styles.emptyStateIcon}>
            <Ionicons name="shield-checkmark" size={64} color="#10B981" />
          </View>
          <Text style={styles.emptyStateTitle}>You're all set!</Text>
          <Text style={styles.emptyStateText}>
            All your tax-deductible transactions have evidence
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentTransaction = transactions[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Evidence</Text>
        <Text style={styles.progress}>
          {currentIndex + 1} / {transactions.length}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Transaction Card */}
        <View style={styles.transactionCard}>
          <Text style={styles.merchantName}>{currentTransaction.merchant_name}</Text>
          <Text style={styles.amount}>£{Math.abs(currentTransaction.amount).toFixed(2)}</Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.category}>{currentTransaction.category_name}</Text>
            <Text style={styles.date}>{formatDate(currentTransaction.transaction_date)}</Text>
          </View>
          <Text style={styles.explanation}>{currentTransaction.explanation}</Text>
        </View>

        {/* Receipt Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt *</Text>
          <Text style={styles.sectionSubtitle}>HMRC requires proof of purchase</Text>

          {receiptImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: receiptImage }} style={styles.receiptImage} />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={() => {
                  Alert.alert('Change Receipt', 'Choose source', [
                    { text: 'Take Photo', onPress: () => pickImage('camera') },
                    { text: 'Choose from Library', onPress: () => pickImage('library') },
                    { text: 'Cancel', style: 'cancel' },
                  ]);
                }}
              >
                <Text style={styles.changeImageText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
            onPress={handleSaveAndNext}
            disabled={saving || uploading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>
                  {currentIndex === transactions.length - 1 ? 'Save & Finish' : 'Save & Next'}
                </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  progress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 32,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
