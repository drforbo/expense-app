import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function DashboardScreen({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    // Later we'll load from Supabase
    setLoading(false);
  };

  const syncTransactions = async () => {
    setSyncing(true);
    try {
      // Get user's access token
      const { data: userData } = await supabase
        .from('users')
        .select('plaid_access_token')
        .eq('id', userId)
        .single();

      if (!userData?.plaid_access_token) {
        alert('No bank connected');
        return;
      }

      // Fetch from Plaid
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/sync_transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: userData.plaid_access_token }),
      });

      const data = await response.json();
      console.log('Transactions:', data.transactions);
      setTransactions(data.transactions);
      
      alert(`Found ${data.count} transactions!`);
    } catch (error: any) {
      console.error('Error:', error);
      alert('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const testAICategorization = async () => {
    if (transactions.length === 0) {
      alert('Sync transactions first!');
      return;
    }

    setSyncing(true);
    try {
      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      // Test with first transaction
      const testTransaction = transactions[0];
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/categorize_transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction: testTransaction,
          userProfile: {
            contentType: userData.content_type,
            typicalProducts: userData.typical_products,
            creationMethod: userData.creation_method,
            toolsUsed: userData.tools_used,
            businessStructure: userData.business_structure,
          },
          userAnswers: {
            wasForContent: 'yes', // Dummy answer for testing
          },
        }),
      });

      const result = await response.json();
      console.log('AI Result:', result);
      
      alert(`AI Categorization:\n\n${result.category}\n${result.businessPercent}% business\n\n${result.reasoning}`);
    } catch (error: any) {
      console.error('Error:', error);
      alert('AI test failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      
      <TouchableOpacity
        style={[styles.button, syncing && styles.buttonDisabled]}
        onPress={syncTransactions}
        disabled={syncing}
      >
        <Text style={styles.buttonText}>
          {syncing ? 'Syncing...' : 'Sync Transactions'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#10b981' }, syncing && styles.buttonDisabled]}
        onPress={testAICategorization}
        disabled={syncing}
      >
        <Text style={styles.buttonText}>
          {syncing ? 'Testing...' : 'Test AI on First Transaction'}
        </Text>
      </TouchableOpacity>

      <ScrollView style={styles.list}>
        {transactions.map((tx, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.transaction}
            onPress={() => {
              // Navigate to survey for this transaction
              console.log('Categorize:', tx);
            }}
          >
            <View>
              <Text style={styles.merchant}>{tx.merchant_name || tx.name}</Text>
              <Text style={styles.date}>{tx.date}</Text>
            </View>
            <Text style={styles.amount}>£{Math.abs(tx.amount).toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  transaction: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
});