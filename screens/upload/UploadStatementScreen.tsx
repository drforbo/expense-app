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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Statement {
  id: string;
  filename: string;
  upload_date: string;
  transaction_count: number;
  status: string;
}

export default function UploadStatementScreen({ navigation }: any) {
  const [uploading, setUploading] = useState(false);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatements();
  }, []);

  const loadStatements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`${API_URL}/api/get_statements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();
      if (Array.isArray(data)) {
        setStatements(data);
      }
    } catch (error) {
      console.error('Error loading statements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      // Pick PDF file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        setUploading(false);
        return;
      }

      console.log('Uploading file:', file.name, 'Size:', file.size);

      // Read file and create form data
      const formData = new FormData();
      formData.append('pdf', {
        uri: file.uri,
        type: 'application/pdf',
        name: file.name,
      } as any);
      formData.append('user_id', user.id);

      // Upload to server
      const response = await fetch(`${API_URL}/api/upload_statement`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          'Upload Complete',
          `Found ${data.transactions_found} transactions.\n${data.transactions_saved} saved, ${data.duplicates_skipped} duplicates skipped.`,
          [{ text: 'OK', onPress: () => loadStatements() }]
        );
      } else {
        throw new Error(data.error || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Error uploading:', error);
      Alert.alert('Error', error.message || 'Failed to upload statement');
    } finally {
      setUploading(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Statements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <View style={styles.uploadingContent}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.uploadingText}>Processing PDF...</Text>
              <Text style={styles.uploadingSubtext}>Extracting transactions with AI</Text>
            </View>
          ) : (
            <>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="cloud-upload" size={40} color="#fff" />
              </View>
              <Text style={styles.uploadText}>Upload PDF Statement</Text>
              <Text style={styles.uploadSubtext}>Supports most UK bank formats</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#7C3AED" />
          <Text style={styles.infoText}>
            Download your bank statement as PDF from your banking app or website, then upload it here.
          </Text>
        </View>

        {/* Previous Uploads */}
        <Text style={styles.sectionTitle}>Previous Uploads</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#7C3AED" />
          </View>
        ) : statements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#4B5563" />
            <Text style={styles.emptyText}>No statements uploaded yet</Text>
            <Text style={styles.emptySubtext}>Upload your first bank statement to get started</Text>
          </View>
        ) : (
          statements.map((stmt) => (
            <View key={stmt.id} style={styles.statementCard}>
              <View style={styles.statementIcon}>
                <Ionicons name="document-text" size={24} color="#7C3AED" />
              </View>
              <View style={styles.statementInfo}>
                <Text style={styles.statementName} numberOfLines={1}>{stmt.filename}</Text>
                <Text style={styles.statementMeta}>
                  {stmt.transaction_count} transactions | {formatDate(stmt.upload_date)}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: stmt.status === 'completed' ? '#10B981' : '#F59E0B' }
              ]}>
                <Text style={styles.statusText}>
                  {stmt.status === 'completed' ? 'Done' : 'Processing'}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  uploadButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#5B21B6',
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  uploadSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  uploadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  uploadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  uploadingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#A78BFA',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statementIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statementName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  statementMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
});
