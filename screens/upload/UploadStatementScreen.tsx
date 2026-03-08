import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { useUpload } from '../../context/UploadContext';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface Statement {
  id: string;
  filename: string;
  upload_date: string;
  transaction_count: number;
  status: string;
}

export default function UploadStatementScreen({ navigation }: any) {
  const { uploadState, startUpload } = useUpload();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  const isUploading = uploadState.status === 'uploading' || uploadState.status === 'processing';

  useEffect(() => {
    loadStatements();
  }, []);

  // Reload statements when upload completes
  useEffect(() => {
    if (uploadState.status === 'complete') {
      loadStatements();
    }
  }, [uploadState.status]);

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

      // Start background upload via context
      startUpload({
        uri: file.uri,
        name: file.name,
        size: file.size,
      });

      // Show message that they can leave
      Alert.alert(
        'Upload Started',
        'Your statement is being processed. You can navigate away - we\'ll notify you when it\'s done!',
        [
          { text: 'Stay Here', style: 'cancel' },
          { text: 'Go to Dashboard', onPress: () => navigation.navigate('MainTabs') },
        ]
      );
    } catch (error: any) {
      console.error('Error picking file:', error);
      Alert.alert('Error', error.message || 'Failed to select file');
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

  const getUploadStatusText = () => {
    if (uploadState.status === 'uploading') return 'Uploading...';
    if (uploadState.status === 'processing') return 'Extracting transactions with AI...';
    return 'Processing...';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Statements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <View style={styles.uploadingContent}>
              <ActivityIndicator color={colors.white} size="large" />
              <Text style={styles.uploadingText}>{getUploadStatusText()}</Text>
              <Text style={styles.uploadingSubtext}>{uploadState.filename}</Text>
              <Text style={styles.uploadingHint}>You can navigate away</Text>
            </View>
          ) : (
            <>
              <View style={styles.uploadIconContainer}>
                <Ionicons name="cloud-upload" size={40} color={colors.white} />
              </View>
              <Text style={styles.uploadText}>Upload PDF Statement</Text>
              <Text style={styles.uploadSubtext}>Supports most UK bank formats</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.tagBlueText} />
          <Text style={styles.infoText}>
            Download your bank statement as PDF from your banking app or website, then upload it here.
          </Text>
        </View>

        {/* Previous Uploads */}
        <Text style={styles.sectionTitle}>Previous Uploads</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.ember} />
          </View>
        ) : statements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={colors.midGrey} />
            <Text style={styles.emptyText}>No statements uploaded yet</Text>
            <Text style={styles.emptySubtext}>Upload your first bank statement to get started</Text>
          </View>
        ) : (
          statements.map((stmt) => (
            <View key={stmt.id} style={styles.statementCard}>
              <View style={styles.statementIcon}>
                <Ionicons name="document-text" size={24} color={colors.ember} />
              </View>
              <View style={styles.statementInfo}>
                <Text style={styles.statementName} numberOfLines={1}>{stmt.filename}</Text>
                <Text style={styles.statementMeta}>
                  {stmt.transaction_count} transactions | {formatDate(stmt.upload_date)}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: stmt.status === 'completed' ? colors.tagGreenText : colors.ember }
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
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.mist,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.ink,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  uploadButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  uploadButtonDisabled: {
    backgroundColor: colors.mist,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  uploadText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    marginBottom: 4,
  },
  uploadSubtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  uploadingContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  uploadingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.white,
    marginTop: spacing.md,
  },
  uploadingSubtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  uploadingHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.tagBlueBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.tagBlueText,
    lineHeight: 20,
  },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  emptyText: {
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
    fontSize: 16,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  statementIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.tagEmberBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statementName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  statementMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.midGrey,
  },
  statusBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.white,
    textTransform: 'uppercase',
  },
});
