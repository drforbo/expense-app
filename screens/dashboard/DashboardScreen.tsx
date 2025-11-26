import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.75.100.222:3000';

export default function DashboardScreen({ navigation }: any) {
  const [connecting, setConnecting] = useState(false);
  const [hasAccessToken, setHasAccessToken] = useState(false);

  useEffect(() => {
    checkAccessToken();
  }, []);

  const checkAccessToken = async () => {
    try {
      const token = await AsyncStorage.getItem('plaid_access_token');
      setHasAccessToken(!!token);
    } catch (error) {
      console.error('Error checking access token:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out from Supabase
              await supabase.auth.signOut();
              // Clear local storage
              await AsyncStorage.removeItem('onboarding_completed');
              await AsyncStorage.removeItem('plaid_access_token');
              // The auth state change will trigger app restart
              console.log('✅ Logged out successfully');
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('Error', 'Failed to log out');
            }
          },
        },
      ]
    );
  };

  const handleCategorizeTransactions = async () => {
    try {
      setConnecting(true);

      // Check if we already have an access token
      let accessToken = await AsyncStorage.getItem('plaid_access_token');

      // If we have a token, use it directly
      if (accessToken) {
        console.log('✅ Using existing access token');
        navigation.navigate('TransactionList', { accessToken });
        setConnecting(false);
        return;
      }

      // Otherwise, create a new sandbox connection
      console.log('🔧 Creating new sandbox connection...');

      // Get authenticated user ID
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Error', 'You must be logged in to connect your bank');
        setConnecting(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/create_sandbox_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();

      if (data.access_token) {
        // Save the token for future use
        await AsyncStorage.setItem('plaid_access_token', data.access_token);
        setHasAccessToken(true);
        console.log('✅ Access token saved');

        navigation.navigate('TransactionList', {
          accessToken: data.access_token,
        });
      } else {
        Alert.alert('Error', 'Failed to connect bank');
      }
    } catch (error: any) {
      console.error('Error connecting bank:', error);
      Alert.alert('Error', error.message || 'Failed to connect bank');
    } finally {
      setConnecting(false);
    }
  };

  const handleComingSoon = (feature: string) => {
    Alert.alert('Coming Soon', `${feature} will be available soon!`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Dashboard</Text>
            <Text style={styles.subtitle}>Manage your tax tracking</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        {/* Primary Action - Categorize Transactions */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={handleCategorizeTransactions}
          disabled={connecting}
          activeOpacity={0.7}
        >
          <View style={styles.primaryIconContainer}>
            {connecting ? (
              <ActivityIndicator size={32} color="#fff" />
            ) : (
              <Ionicons name="card" size={32} color="#fff" />
            )}
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>
              {connecting ? 'Connecting...' : 'Categorize Transactions'}
            </Text>
            <Text style={styles.primarySubtitle}>
              Review and categorize your expenses
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Main Actions Grid */}
        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Qualify Transactions')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="receipt" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.actionTitle}>Qualify Transactions</Text>
            <Text style={styles.actionSubtitle}>Upload receipts & evidence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Log Gifted Items')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="gift" size={28} color="#FF6B6B" />
            </View>
            <Text style={styles.actionTitle}>Log Gifted Items</Text>
            <Text style={styles.actionSubtitle}>Track PR packages & gifts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Tax Checklist')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="checkbox" size={28} color="#10B981" />
            </View>
            <Text style={styles.actionTitle}>Checklist</Text>
            <Text style={styles.actionSubtitle}>Tax actions & deadlines</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Tax Summary')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="stats-chart" size={28} color="#3B82F6" />
            </View>
            <Text style={styles.actionTitle}>Summary</Text>
            <Text style={styles.actionSubtitle}>View tax consolidation</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Export Data')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="download" size={28} color="#F59E0B" />
            </View>
            <Text style={styles.actionTitle}>Export</Text>
            <Text style={styles.actionSubtitle}>Download as CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => handleComingSoon('Account Settings')}
            activeOpacity={0.7}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="settings" size={28} color="#6B7280" />
            </View>
            <Text style={styles.actionTitle}>Settings</Text>
            <Text style={styles.actionSubtitle}>Profile & billing</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  primaryText: {
    flex: 1,
  },
  primaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  primarySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    minHeight: 130,
    justifyContent: 'space-between',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
});
