import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../lib/supabase';
import { apiPost, API_URL } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface UserProfile {
  work_type: string;
  custom_work_type?: string;
  monthly_income: number;
  tracking_goal: string;
  has_other_employment: boolean;
  employment_income?: number;
  student_loan_plan: string;
  works_from_home?: boolean;
  home_office_percentage?: number;
  uses_vehicle_for_work?: boolean;
  vehicle_business_percentage?: number;
  profile_completed: boolean;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  content_creation: 'Content creator',
  freelancing: 'Freelancer',
  side_hustle: '(Re)selling products',
  other: 'Other',
};

const LOAN_LABELS: Record<string, string> = {
  none: 'No student loan',
  plan1: 'Plan 1',
  plan2: 'Plan 2',
  plan4: 'Plan 4 (Scotland)',
  postgrad: 'Postgraduate',
};

const GOAL_LABELS: Record<string, string> = {
  sole_trader: 'Sole trader',
  limited_company: 'Limited company',
  not_yet: 'Not yet registered',
};

export default function SettingsScreen({ navigation }: any) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadProfile();
    const unsubscribe = navigation.addListener('focus', loadProfile);
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || '');
      setUserName(user.user_metadata?.full_name || user.user_metadata?.first_name || '');

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data) setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Download ZIP bundle (CSV + receipts)
      const fileUri = `${FileSystem.cacheDirectory}bopp_export.zip`;
      const result = await FileSystem.downloadAsync(
        `${API_URL}/api/export_bundle`,
        fileUri,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          httpMethod: 'POST',
          body: JSON.stringify({ user_id: user.id }),
        }
      );

      if (result.status === 404) {
        Alert.alert('Nothing to export', 'Upload some bank statements first, then you can export your transactions.');
        return;
      }
      if (result.status !== 200) {
        throw new Error('Export failed');
      }

      // Open share sheet so user can save/send the ZIP
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/zip',
          dialogTitle: 'Export transactions & receipts',
          UTI: 'public.zip-archive',
        });
      } else {
        Alert.alert('Export ready', 'File saved but sharing is not available on this device.');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export failed', error.message || 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gradientMid} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Screen label + wordmark */}
        <Text style={styles.screenLabel}>SETTINGS</Text>
        <Text style={styles.logo}>bopp.</Text>

        {/* Account */}
        <View style={styles.accountCard}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accountAvatar}
          >
            <Text style={styles.accountAvatarText}>
              {(userName || userEmail).charAt(0).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountName}>{userName || userEmail.split('@')[0]}</Text>
            <Text style={styles.accountEmail}>{userEmail}</Text>
          </View>
        </View>

        {/* Export */}
        <Text style={styles.sectionLabel}>EXPORT</Text>
        <TouchableOpacity onPress={handleExport} activeOpacity={0.8} disabled={exporting}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.exportCard}
          >
            <View style={styles.exportIcon}>
              {exporting
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Ionicons name="download-outline" size={22} color={colors.white} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportTitle}>Export transactions</Text>
              <Text style={styles.exportSub}>CSV + receipt images as ZIP</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Profile */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>YOUR PROFILE</Text>
        <View style={styles.profileCard}>
          <ProfileRow
            label="Work type"
            value={profile ? (WORK_TYPE_LABELS[profile.work_type] || profile.custom_work_type || profile.work_type) : '--'}
          />
          <ProfileRow
            label="HMRC registration"
            value={profile ? (GOAL_LABELS[profile.tracking_goal] || '--') : '--'}
          />
          <ProfileRow
            label="Monthly income"
            value={profile ? `\u00A3${profile.monthly_income?.toLocaleString()}` : '--'}
          />
          <ProfileRow
            label="Employment income"
            value={profile?.has_other_employment ? `\u00A3${(profile.employment_income || 0).toLocaleString()}/yr` : 'None'}
          />
          <ProfileRow
            label="Student loan"
            value={profile ? (LOAN_LABELS[profile.student_loan_plan] || 'None') : '--'}
          />
          <ProfileRow
            label="Works from home"
            value={profile?.works_from_home ? `${profile.home_office_percentage || 0}% business use` : 'No'}
          />
          <ProfileRow
            label="Uses vehicle for work"
            value={profile?.uses_vehicle_for_work ? `${profile.vehicle_business_percentage || 0}% business use` : 'No'}
            last
          />
        </View>

        <TouchableOpacity style={styles.editProfileBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.editProfileText}>Edit tax profile</Text>
          <Ionicons name="pencil" size={14} color={colors.gradientMid} />
        </TouchableOpacity>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.gradientMid} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[profileRowStyles.row, !last && profileRowStyles.border]}>
      <Text style={profileRowStyles.label}>{label}</Text>
      <Text style={profileRowStyles.value}>{value}</Text>
    </View>
  );
}

const profileRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.midGrey,
    flex: 1,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 100,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
    marginBottom: spacing.xs,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 44,
    marginBottom: spacing.xl,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  accountName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 2,
  },
  accountEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.midGrey,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  exportIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.white,
    marginBottom: 2,
  },
  exportSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  editProfileText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gradientMid,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,69,0,0.2)',
    backgroundColor: colors.background,
  },
  logoutText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.gradientMid,
  },
});
