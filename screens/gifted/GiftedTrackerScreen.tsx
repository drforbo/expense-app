import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface GiftedItem {
  id: string;
  item_name: string;
  rrp: number;
  photo_url?: string;
  notes?: string;
  received_date: string;
  received_from?: string;
  created_at: string;
}

export default function GiftedTrackerScreen({ navigation }: any) {
  const [items, setItems] = useState<GiftedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GiftedItem | null>(null);

  // Form fields
  const [itemName, setItemName] = useState('');
  const [rrp, setRrp] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);

  useEffect(() => {
    fetchItems();

    // Set default received date to today
    const today = new Date().toISOString().split('T')[0];
    setReceivedDate(today);
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const data = await apiPost('/api/get_gifted_items', { user_id: user.id });
      setItems(data);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      Alert.alert('Error', 'Failed to load gifted items');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);

        // Recognize the item using AI
        if (asset.base64) {
          await recognizeItem(asset.base64);
        }
      }
    } catch (error: any) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Photo library permission is needed');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhotoUri(asset.uri);

        // Recognize the item using AI
        if (asset.base64) {
          await recognizeItem(asset.base64);
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const recognizeItem = async (base64: string) => {
    try {
      setRecognizing(true);
      console.log('Recognizing item...');

      const result = await apiPost('/api/recognize_item', { image_base64: base64 });
      console.log('Item recognized:', result);

      setItemName(result.item_name);
      setRrp(result.estimated_rrp.toString());

      Alert.alert(
        'Item Recognized',
        `${result.item_name} - \u00A3${result.estimated_rrp}\n\nYou can edit these details before saving.`
      );
    } catch (error: any) {
      console.error('Error recognizing item:', error);
      Alert.alert('Error', 'Could not recognize item. Please enter details manually.');
    } finally {
      setRecognizing(false);
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Read the file as base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();

      // Generate unique filename
      const fileExt = uri.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('gifted-items')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gifted-items')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  const saveItem = async () => {
    try {
      if (!itemName || !rrp) {
        Alert.alert('Error', 'Please enter item name and RRP');
        return;
      }

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Upload photo if there is one
      let uploadedPhotoUrl = photoUrl;
      if (photoUri && !photoUrl) {
        uploadedPhotoUrl = await uploadPhoto(photoUri);
        setPhotoUrl(uploadedPhotoUrl);
      }

      const endpoint = selectedItem ? '/api/update_gifted_item' : '/api/create_gifted_item';
      const body = selectedItem
        ? {
            id: selectedItem.id,
            item_name: itemName,
            rrp: parseFloat(rrp),
            photo_url: uploadedPhotoUrl,
            notes,
            received_date: receivedDate,
            received_from: receivedFrom,
          }
        : {
            user_id: user.id,
            item_name: itemName,
            rrp: parseFloat(rrp),
            photo_url: uploadedPhotoUrl,
            notes,
            received_date: receivedDate,
            received_from: receivedFrom,
          };

      await apiPost(endpoint, body);

      Alert.alert('Success', `Item ${selectedItem ? 'updated' : 'added'} successfully!`);
      closeModal();
      fetchItems();
    } catch (error: any) {
      console.error('Error saving item:', error);
      Alert.alert('Error', error.message || 'Failed to save item. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await apiPost('/api/delete_gifted_item', { id });

              Alert.alert('Success', 'Item deleted');
              fetchItems();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    }
  };

  const openAddModal = () => {
    setSelectedItem(null);
    setItemName('');
    setRrp('');
    setNotes('');
    setPhotoUri(null);
    setPhotoUrl(null);
    const today = new Date().toISOString().split('T')[0];
    setReceivedDate(today);
    setShowAddModal(true);
  };

  const openEditModal = (item: GiftedItem) => {
    setSelectedItem(item);
    setItemName(item.item_name);
    setRrp(item.rrp.toString());
    setNotes(item.notes || '');
    setPhotoUrl(item.photo_url || null);
    setPhotoUri(null);
    setReceivedDate(item.received_date);
    setReceivedFrom(item.received_from || '');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setSelectedItem(null);
    setItemName('');
    setRrp('');
    setNotes('');
    setPhotoUri(null);
    setPhotoUrl(null);
    setRecognizing(false);
    setReceivedFrom('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const totalValue = items.reduce((sum, item) => sum + item.rrp, 0);

  const renderItem = ({ item }: { item: GiftedItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      {item.photo_url && (
        <Image
          source={{ uri: item.photo_url }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.itemRrp}>{'\u00A3'}{item.rrp.toFixed(2)}</Text>
        <Text style={styles.itemDate}>Received: {formatDate(item.received_date)}</Text>
        {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteItem(item.id)}
      >
        <Ionicons name="trash" size={18} color="#FF4500" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>

      {/* Screen Label + Hero */}
      <View style={styles.heroSection}>
        <Text style={styles.screenLabel}>GIFTED TRACKER</Text>
        <Text style={styles.heroHeading}>{'gifted\ntracker.'}</Text>
      </View>

      {/* Summary */}
      {items.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total items</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 1.5, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
            <Text style={styles.summaryLabel}>Total value</Text>
            <Text style={styles.summaryValueGreen}>{'\u00A3'}{totalValue.toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.midGrey} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="gift-outline" size={36} color={colors.tagBlueText} />
          </View>
          <Text style={styles.emptyTitle}>No gifted items yet</Text>
          <Text style={styles.emptySubtitle}>
            Snap a photo or manually log items you've been gifted — PR packages, products, freebies.
          </Text>

          <View style={styles.taxInfoBanner}>
            <Ionicons name="information-circle-outline" size={16} color={colors.tagBlueText} />
            <Text style={styles.taxInfoText}>
              HMRC treats gifted items as taxable income if they're received in connection with your work. You'll need to declare their retail value on your Self Assessment.
            </Text>
          </View>

          <TouchableOpacity
            onPress={openAddModal}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyAddBtn}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.emptyAddBtnText}>Add your first item</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchItems}
          ListHeaderComponent={
            <View style={styles.listTaxNote}>
              <Ionicons name="information-circle-outline" size={14} color={colors.tagBlueText} />
              <Text style={styles.listTaxNoteText}>
                Gifted items are treated as taxable income by HMRC. Their retail value is added to your income total.
              </Text>
            </View>
          }
        />
      )}

      {/* Add FAB */}
      {items.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={openAddModal}
          style={styles.fabContainer}
        >
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.addButton}
          >
            <Ionicons name="add" size={32} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedItem ? 'Edit Item' : 'Add New Item'}
            </Text>
            <TouchableOpacity onPress={saveItem} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.gradientMid} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={100}
          >
            <ScrollView
              style={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
            {/* Photo Section */}
            <View style={styles.photoSection}>
              {(photoUri || photoUrl) ? (
                <Image
                  source={{ uri: photoUri || photoUrl || undefined }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera" size={48} color={colors.muted} />
                  <Text style={styles.photoPlaceholderText}>No photo</Text>
                </View>
              )}

              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={takePhoto}
                  disabled={recognizing}
                >
                  <Ionicons name="camera" size={20} color={colors.ink} />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={pickImage}
                  disabled={recognizing}
                >
                  <Ionicons name="images" size={20} color={colors.ink} />
                  <Text style={styles.photoButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              {recognizing && (
                <View style={styles.recognizingContainer}>
                  <ActivityIndicator color={colors.gradientMid} />
                  <Text style={styles.recognizingText}>Recognizing item...</Text>
                </View>
              )}
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="e.g. iPhone 15 Pro"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>RRP ({'\u00A3'}) *</Text>
              <TextInput
                style={styles.input}
                value={rrp}
                onChangeText={setRrp}
                placeholder="0.00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Received Date *</Text>
              <TextInput
                style={styles.input}
                value={receivedDate}
                onChangeText={setReceivedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Brand Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={receivedFrom}
                onChangeText={setReceivedFrom}
                placeholder="e.g., Apple, Samsung, Nike..."
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add extra details like the video you featured it in, or why you received the item..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  heroSection: {
    paddingHorizontal: spacing.xl,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: '#FF4500',
    fontFamily: fonts.displaySemi,
    marginBottom: spacing.sm,
  },
  heroHeading: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.xxl,
  },
  summaryCard: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  summaryValueGreen: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.positive,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.tagBlueBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  taxInfoBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.lg,
  },
  taxInfoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.tagBlueText,
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  emptyAddBtnText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  listTaxNote: {
    flexDirection: 'row',
    gap: 6,
    padding: spacing.sm,
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  listTaxNoteText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.tagBlueText,
    lineHeight: 17,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: 4,
  },
  itemRrp: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.positive,
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    marginBottom: 4,
  },
  itemNotes: {
    fontSize: 13,
    fontFamily: fonts.body,
    color: colors.midGrey,
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.gradientMid,
  },
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoPlaceholderText: {
    marginTop: spacing.xs,
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.muted,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
  },
  photoButtonText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  recognizingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  recognizingText: {
    fontSize: 16,
    fontFamily: fonts.body,
    color: colors.midGrey,
  },
  formSection: {
    gap: spacing.md,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    marginBottom: spacing.xs,
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
  textArea: {
    height: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
});
