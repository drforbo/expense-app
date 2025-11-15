import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ConnectBankScreen({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  const testServerConnection = async () => {
    setLoading(true);
    try {
      console.log('Testing connection to:', process.env.EXPO_PUBLIC_API_URL);
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/create_link_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      console.log('Server response:', data);
      
      if (data.link_token) {
        Alert.alert('Success!', 'Server connection works!\n\nLink token received.');
      } else {
        Alert.alert('Error', 'No link token received');
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
        Testing server connection
      </Text>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={testServerConnection}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Server Connection'}
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