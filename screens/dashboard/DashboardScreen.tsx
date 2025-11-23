import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen() {
  const handleResetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboarding_completed');
      // Note: You'll need to add navigation reset here when you need it
      console.log('Onboarding reset - restart app to see onboarding again');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome to Bopp! 🎉</Text>
          <Text style={styles.subtitle}>Your main app starts here</Text>
        </View>

        {/* Placeholder Cards */}
        <View style={styles.cardsContainer}>
          <View style={styles.card}>
            <Ionicons name="camera" size={32} color="#7C3AED" />
            <Text style={styles.cardTitle}>Snap Receipts</Text>
            <Text style={styles.cardText}>Take photos of your expenses</Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="list" size={32} color="#FF6B6B" />
            <Text style={styles.cardTitle}>View Expenses</Text>
            <Text style={styles.cardText}>See all your tracked expenses</Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="stats-chart" size={32} color="#7C3AED" />
            <Text style={styles.cardTitle}>Tax Reports</Text>
            <Text style={styles.cardText}>HMRC-compliant reports</Text>
          </View>

          <View style={styles.card}>
            <Ionicons name="settings" size={32} color="#FF6B6B" />
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardText}>Manage your account</Text>
          </View>
        </View>

        {/* Dev Tools */}
        <View style={styles.devSection}>
          <Text style={styles.devTitle}>Development Tools</Text>
          <TouchableOpacity
            style={styles.devButton}
            onPress={handleResetOnboarding}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.devButtonText}>Reset Onboarding</Text>
          </TouchableOpacity>
          <Text style={styles.devNote}>
            (Restart app after reset to see onboarding)
          </Text>
        </View>

        <Text style={styles.buildNote}>
          🚀 Start building your app features here!
        </Text>
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
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 20,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  devSection: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  devTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  devButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  devNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  buildNote: {
    fontSize: 16,
    color: '#7C3AED',
    textAlign: 'center',
    fontWeight: '600',
  },
});
