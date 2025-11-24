import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.129:3000';

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

  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboarding_completed');
      await AsyncStorage.removeItem('plaid_access_token');
      setHasAccessToken(false);
      console.log('Onboarding reset - restart app to see onboarding again');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  const handleConnectBank = async () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome to Bopp!</Text>
          <Text style={styles.subtitle}>Your expense tracking starts here</Text>
        </View>

        {/* Featured Action */}
        <TouchableOpacity
          style={styles.featuredCard}
          onPress={handleConnectBank}
          disabled={connecting}
          activeOpacity={0.7}
        >
          <View style={styles.featuredIconContainer}>
            {connecting ? (
              <ActivityIndicator size={32} color="#7C3AED" />
            ) : (
              <Ionicons name="card" size={32} color="#7C3AED" />
            )}
          </View>
          <View style={styles.featuredText}>
            <Text style={styles.featuredTitle}>
              {connecting ? 'Connecting...' : 'Categorize Transactions'}
            </Text>
            <Text style={styles.featuredSubtitle}>
              Start categorizing your expenses
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
        </TouchableOpacity>

        {/* Placeholder Cards */}
        <View style={styles.cardsContainer}>
          <View style={styles.card}>
            <Ionicons name="camera" size={28} color="#7C3AED" />
            <Text style={styles.cardTitle}>Snap Receipts</Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="list" size={28} color="#FF6B6B" />
            <Text style={styles.cardTitle}>View Expenses</Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="stats-chart" size={28} color="#7C3AED" />
            <Text style={styles.cardTitle}>Tax Reports</Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="settings" size={28} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Settings</Text>
          </View>
        </View>

        {/* Dev Tools */}
        <View style={styles.devSection}>
          <TouchableOpacity
            style={styles.devButton}
            onPress={handleResetOnboarding}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.devButtonText}>Reset Onboarding</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  featuredCard: {
    backgroundColor: '#1F1333',
    borderRadius: 14,
    padding: 18,
    borderWidth: 2,
    borderColor: '#7C3AED',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  featuredIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7C3AED20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featuredText: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  featuredSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1F1333',
    borderRadius: 14,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  devSection: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  devButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  devButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
