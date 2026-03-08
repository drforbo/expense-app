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
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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

      const data = await apiPost('/api/export_transactions', { user_id: user.id, format: 'csv' });
      if (data.error) throw new Error('Export failed');
      Alert.alert('Export ready', 'Your transactions have been exported. Check your downloads.');
    } catch (error) {
      Alert.alert('Export failed', 'Please try again.');
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
          <ActivityIndicator color={colors.ember} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>bo<Text style={styles.logoPop}>pp</Text></Text>
          <Text style={styles.headerSub}>Settings</Text>
        </View>

        {/* Account */}
        <View style={styles.accountCard}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>
              {userEmail.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountEmail}>{userEmail}</Text>
            <Text style={styles.accountPlan}>
              {profile ? (GOAL_LABELS[profile.tracking_goal] || profile.tracking_goal) : ''}
            </Text>
          </View>
        </View>

        {/* Export */}
        <Text style={styles.sectionLabel}>EXPORT</Text>
        <TouchableOpacity style={styles.exportCard} onPress={handleExport} activeOpacity={0.8} disabled={exporting}>
          <View style={styles.exportIcon}>
            {exporting
              ? <ActivityIndicator size="small" color={colors.ink} />
              : <Ionicons name="download-outline" size={22} color={colors.ink} />
            }
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.exportTitle}>Export transactions</Text>
            <Text style={styles.exportSub}>Download as CSV with evidence</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.midGrey} />
        </TouchableOpacity>

        {/* Profile */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>YOUR PROFILE</Text>
        <View style={styles.profileCard}>
          <ProfileRow
            label="Work type"
            value={profile ? (WORK_TYPE_LABELS[profile.work_type] || profile.custom_work_type || profile.work_type) : '—'}
          />
          <ProfileRow
            label="HMRC registration"
            value={profile ? (GOAL_LABELS[profile.tracking_goal] || '—') : '—'}
          />
          <ProfileRow
            label="Monthly income"
            value={profile ? `£${profile.monthly_income?.toLocaleString()}` : '—'}
          />
          <ProfileRow
            label="Employment income"
            value={profile?.has_other_employment ? `£${(profile.employment_income || 0).toLocaleString()}/yr` : 'None'}
          />
          <ProfileRow
            label="Student loan"
            value={profile ? (LOAN_LABELS[profile.student_loan_plan] || 'None') : '—'}
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
          <Ionicons name="pencil" size={14} color={colors.ember} />
        </TouchableOpacity>

        {/* Danger zone */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.ember} />
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
    borderBottomColor: colors.mist,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    flex: 1,
  },
  value: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.xl,
  },
  logo: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -1,
    marginBottom: 2,
  },
  logoPop: {
    backgroundColor: colors.volt,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    paddingHorizontal: 4,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: borderRadius.md,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountAvatarText: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.volt,
  },
  accountEmail: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 2,
  },
  accountPlan: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.midGrey,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.midGrey,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.volt,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  exportIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  exportSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(13,13,13,0.55)',
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
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
    fontSize: 14,
    color: colors.ember,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: `${colors.ember}30`,
    backgroundColor: `${colors.ember}08`,
  },
  logoutText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.ember,
  },
});
