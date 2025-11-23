import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ConnectBankScreen({ userId, onConnected }: { userId: string; onConnected: () => void }) {
  const [loading, setLoading] = useState(false);

  const connectSandboxBank = async () => {
    setLoading(true);
    try {
      console.log('Connecting sandbox bank...');
      
      // Create sandbox access token
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/create_sandbox_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      console.log('Got access token');
      
      if (data.access_token) {
        // Save to database
        const { error } = await supabase
          .from('users')
          .update({ plaid_access_token: data.access_token })
          .eq('id', userId);

        if (error) {
          console.error('Error saving token:', error);
          Alert.alert('Error', 'Failed to save bank connection');
        } else {
          Alert.alert('Success!', 'Test bank connected!\n\n(Using Plaid Sandbox)', [
            { text: 'OK', onPress: onConnected }
          ]);
        }
      }
    } catch (error: any) {
      console.error('Error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Your Bank</Text>
      <Text style={styles.subtitle}>
        For testing, we'll connect a sandbox bank account
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={connectSandboxBank}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Connecting...' : 'Connect Test Bank (Sandbox)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});