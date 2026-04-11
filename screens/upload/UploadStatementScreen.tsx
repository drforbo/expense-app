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
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../lib/supabase';
import { useUpload } from '../../context/UploadContext';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';
import { apiPost } from '../../lib/api';

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

      const data = await apiPost('/api/get_statements', { user_id: user.id });
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
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* Flat Header */}
      <View style={styles.headerContent}>
        <Text style={styles.screenLabel}>UPLOAD</Text>
        <Text style={styles.heading}>{'upload a\nstatement.'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Upload Drop Zone */}
        {isUploading ? (
          <View style={styles.uploadZone}>
            <View style={styles.uploadingContent}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.uploadingText}>{getUploadStatusText()}</Text>
              <Text style={styles.uploadingSubtext}>{uploadState.filename}</Text>
              <Text style={styles.uploadingHint}>You can navigate away</Text>
            </View>
          </View>
        ) : (
          <View style={styles.uploadZone}>
            <Text style={styles.uploadEmoji}>📄</Text>
            <Text style={styles.uploadZoneTitle}>Drop your PDF here</Text>
            <Text style={styles.uploadZoneSubtext}>Supports most UK bank formats</Text>

            <TouchableOpacity
              onPress={handleUpload}
              activeOpacity={0.8}
              style={{ marginTop: spacing.lg, width: '100%' }}
            >
              <LinearGradient
                colors={gradients.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.uploadButton}
              >
                <Ionicons name="cloud-upload" size={20} color={colors.surfaceLowest} style={{ marginRight: spacing.sm }} />
                <Text style={styles.uploadButtonText}>Choose PDF File</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Support text */}
        <Text style={styles.supportText}>
          Download your bank statement as PDF from your banking app or website, then upload it here.
        </Text>

        {/* Previous Uploads */}
        <Text style={styles.sectionTitle}>Previous Uploads</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : statements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color={colors.onSurfaceMuted} />
            <Text style={styles.emptyText}>No statements uploaded yet</Text>
            <Text style={styles.emptySubtext}>Upload your first bank statement to get started</Text>
          </View>
        ) : (
          statements.map((stmt) => (
            <View key={stmt.id} style={styles.statementCard}>
              <View style={styles.statementIcon}>
                <Text style={{ fontSize: 20 }}>📄</Text>
              </View>
              <View style={styles.statementInfo}>
                <Text style={styles.statementName} numberOfLines={1}>{stmt.filename}</Text>
                <Text style={styles.statementMeta}>
                  {stmt.transaction_count} transactions | {formatDate(stmt.upload_date)}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                {
                  backgroundColor: stmt.status === 'completed' ? colors.tagIncomeBg : colors.tagExpenseBg,
                }
              ]}>
                <Text style={[
                  styles.statusText,
                  {
                    color: stmt.status === 'completed' ? colors.tagIncomeText : colors.tagExpenseText,
                  }
                ]}>
                  {stmt.status === 'completed' ? 'Done' : 'Processing'}
                </Text>
              </View>
            </View>
          ))
        )}

        {/* Bottom spacer */}
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  screenLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  heading: {
    fontFamily: fonts.displaySemi,
    fontSize: 28,
    color: colors.onSurface,
    lineHeight: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  uploadZone: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  uploadEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  uploadZoneTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.onSurface,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  uploadZoneSubtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceMuted,
  },
  uploadButton: {
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.surfaceLowest,
  },
  uploadingContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  uploadingText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.onSurface,
    letterSpacing: -0.2,
    marginTop: spacing.md,
  },
  uploadingSubtext: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceMuted,
    marginTop: 4,
  },
  uploadingHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  supportText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.onSurfaceMuted,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.onSurfaceMuted,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
  },
  emptyText: {
    fontFamily: fonts.bodyBold,
    color: colors.onSurfaceMuted,
    fontSize: 16,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    color: colors.onSurfaceMuted,
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
  },
  statementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  statementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  statementName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.onSurface,
    marginBottom: 4,
  },
  statementMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.onSurfaceMuted,
  },
  statusBadge: {
    borderRadius: borderRadius.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
});
