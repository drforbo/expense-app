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
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

interface GiftedItem {
  id: string;
  item_name: string;
  rrp: number;
  photo_url?: string;
  notes?: string;
  received_date: string;
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

      const response = await fetch(`${API_URL}/api/get_gifted_items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }

      const data = await response.json();
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
      console.log('🔍 Recognizing item...');

      const response = await fetch(`${API_URL}/api/recognize_item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 }),
      });

      if (!response.ok) {
        throw new Error('Failed to recognize item');
      }

      const result = await response.json();
      console.log('✅ Item recognized:', result);

      setItemName(result.item_name);
      setRrp(result.estimated_rrp.toString());

      Alert.alert(
        'Item Recognized',
        `${result.item_name} - £${result.estimated_rrp}\n\nYou can edit these details before saving.`
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

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Failed to save item: ${response.status}`);
      }

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
              const response = await fetch(`${API_URL}/api/delete_gifted_item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
              });

              if (!response.ok) {
                throw new Error('Failed to delete item');
              }

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

  const renderItem = ({ item }: { item: GiftedItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => openEditModal(item)}
      activeOpacity={0.7}
    >
      {(item.photo_url || photoUrl) && (
        <Image
          source={{ uri: item.photo_url || photoUrl }}
          style={styles.itemImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <Text style={styles.itemRrp}>£{item.rrp.toFixed(2)}</Text>
        <Text style={styles.itemDate}>Received: {formatDate(item.received_date)}</Text>
        {item.notes && <Text style={styles.itemNotes}>{item.notes}</Text>}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteItem(item.id)}
      >
        <Ionicons name="trash" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gifted Tracker</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* List */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="gift-outline" size={64} color="#64748B" />
          <Text style={styles.emptyTitle}>No gifted items yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the + button to add your first gifted item
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchItems}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={openAddModal}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

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
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedItem ? 'Edit Item' : 'Add New Item'}
            </Text>
            <TouchableOpacity onPress={saveItem} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#8B5CF6" />
              ) : (
                <Text style={styles.saveButton}>Save</Text>
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
                  <Ionicons name="camera" size={48} color="#64748B" />
                  <Text style={styles.photoPlaceholderText}>No photo</Text>
                </View>
              )}

              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={takePhoto}
                  disabled={recognizing}
                >
                  <Ionicons name="camera" size={20} color="#8B5CF6" />
                  <Text style={styles.photoButtonText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={pickImage}
                  disabled={recognizing}
                >
                  <Ionicons name="images" size={20} color="#8B5CF6" />
                  <Text style={styles.photoButtonText}>Choose Photo</Text>
                </TouchableOpacity>
              </View>

              {recognizing && (
                <View style={styles.recognizingContainer}>
                  <ActivityIndicator color="#8B5CF6" />
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
                placeholderTextColor="#64748B"
                keyboardAppearance="dark"
              />

              <Text style={styles.label}>RRP (£) *</Text>
              <TextInput
                style={styles.input}
                value={rrp}
                onChangeText={setRrp}
                placeholder="0.00"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                keyboardAppearance="dark"
              />

              <Text style={styles.label}>Received Date *</Text>
              <TextInput
                style={styles.input}
                value={receivedDate}
                onChangeText={setReceivedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#64748B"
                keyboardAppearance="dark"
              />

              <Text style={styles.label}>Brand Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={receivedFrom}
                onChangeText={setReceivedFrom}
                placeholder="e.g., Apple, Samsung, Nike..."
                placeholderTextColor="#64748B"
                keyboardAppearance="dark"
                selectionColor="#8B5CF6"
                cursorColor="#8B5CF6"
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add extra details like the video you featured it in, or why you received the item..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                keyboardAppearance="dark"
                selectionColor="#8B5CF6"
                cursorColor="#8B5CF6"
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
    backgroundColor: '#0F0524',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
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
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  itemRrp: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  itemNotes: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F0524',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    fontSize: 16,
    color: '#94A3B8',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#1F1333',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  recognizingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  recognizingText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  formSection: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1F1333',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D2142',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
});
