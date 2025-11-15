import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ConnectBankScreen({ userId }: { userId: string }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createLinkToken = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/create_link_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to initialize bank connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect Your Bank</Text>
      <Text style={styles.subtitle}>
        Link your bank account to automatically track expenses
      </Text>

      {linkToken ? (
        <PlaidLink
          tokenConfig={{
            token: linkToken,
          }}
          onSuccess={async (success) => {
            console.log('Plaid success:', success);
            
            // Exchange public token for access token
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/exchange_public_token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                public_token: success.publicToken,
                userId: userId,
              }),
            });

            const data = await response.json();
            console.log('Access token:', data.access_token);

            // Save to Supabase
            const { error } = await supabase
              .from('users')
              .update({ plaid_access_token: data.access_token })
              .eq('id', userId);

            if (error) {
              console.error('Error saving token:', error);
            } else {
              Alert.alert('Success!', 'Bank connected successfully');
            }
          }}
          onExit={(exit) => {
            console.log('Plaid exit:', exit);
          }}
        >
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Open Bank Connection</Text>
          </TouchableOpacity>
        </PlaidLink>
      ) : (
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createLinkToken}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Connect Bank Account'}
          </Text>
        </TouchableOpacity>
      )}
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