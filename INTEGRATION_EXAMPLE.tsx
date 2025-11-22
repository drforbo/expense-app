// App.tsx - Complete Integration Example
// This shows how to connect the new onboarding flow with your existing Supabase and Plaid setup

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from './lib/supabase';
import { OnboardingFlow } from './screens/OnboardingFlow';
import { DashboardScreen } from './screens/DashboardScreen';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [plaidAccessToken, setPlaidAccessToken] = useState(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      setIsReady(true);
    }
  }, [fontsLoaded]);

  // Check for existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkOnboardingStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_complete, plaid_access_token')
        .eq('id', userId)
        .single();

      if (data) {
        setOnboardingComplete(data.onboarding_complete);
        setPlaidAccessToken(data.plaid_access_token);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleOnboardingComplete = async (userData: any) => {
    try {
      if (!session) {
        console.error('No session found');
        return;
      }

      // 1. Save user profile to Supabase
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: session.user.id,
          user_type: userData.userType,
          employment_status: userData.employmentStatus,
          income_level: userData.income,
          selected_plan: userData.selectedPlan,
          onboarding_complete: true,
          plaid_access_token: plaidAccessToken,
          created_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 2. TODO: Process payment based on selectedPlan
      // await processPayment(userData.selectedPlan);

      // 3. Mark onboarding as complete
      setOnboardingComplete(true);

      console.log('Onboarding completed successfully!', userData);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // TODO: Show error message to user
    }
  };

  const handleConnectBank = async () => {
    try {
      if (!session) {
        console.error('No session found');
        return;
      }

      // 1. Get link token from your server
      const response = await fetch('http://YOUR_MAC_IP:3000/api/create_link_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create link token');
      }

      const { link_token } = await response.json();

      // 2. TODO: Open Plaid Link with link_token
      // For now, we'll use the sandbox token for development
      // In production, you'd use react-native-plaid-link-sdk here
      
      // Development only - use sandbox token:
      const sandboxResponse = await fetch('http://YOUR_MAC_IP:3000/api/create_sandbox_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      const { access_token } = await sandboxResponse.json();

      // 3. Save access token
      setPlaidAccessToken(access_token);

      // 4. Save to Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({ plaid_access_token: access_token })
        .eq('id', session.user.id);

      if (error) throw error;

      console.log('Bank connected successfully!');
      return Promise.resolve();
    } catch (error) {
      console.error('Error connecting bank:', error);
      throw error;
    }
  };

  // Show loading while fonts are loading
  if (!isReady) {
    return null;
  }

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return (
      <>
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onConnectBank={handleConnectBank}
        />
        <StatusBar style="light" />
      </>
    );
  }

  // Show main app
  return (
    <>
      <DashboardScreen />
      <StatusBar style="light" />
    </>
  );
}

// ============================================
// Supabase Schema Reference
// ============================================
// You'll need to create this table in Supabase:
/*
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  user_type TEXT NOT NULL,
  employment_status TEXT NOT NULL,
  income_level TEXT NOT NULL,
  selected_plan TEXT NOT NULL,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  plaid_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
*/

// ============================================
// Payment Processing (Stripe Example)
// ============================================
/*
const processPayment = async (plan: 'week' | 'quarter' | 'year') => {
  const prices = {
    week: 399, // £3.99 in pence
    quarter: 3200, // £32
    year: 9900, // £99
  };

  const response = await fetch('http://YOUR_SERVER/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: prices[plan],
      currency: 'gbp',
      userId: session.user.id,
      plan: plan,
    }),
  });

  const { clientSecret } = await response.json();
  
  // TODO: Use Stripe React Native SDK to confirm payment
  // const { error } = await confirmPayment(clientSecret);
};
*/

// ============================================
// Production Plaid Integration
// ============================================
/*
import { PlaidLink } from 'react-native-plaid-link-sdk';

const handleConnectBank = async () => {
  // 1. Get link token
  const response = await fetch('http://YOUR_SERVER/api/create_link_token', {
    method: 'POST',
    body: JSON.stringify({ userId: session.user.id }),
  });
  const { link_token } = await response.json();

  // 2. Open Plaid Link
  const linkSuccess = await PlaidLink.open({
    token: link_token,
    onSuccess: async (publicToken) => {
      // 3. Exchange public token for access token
      const exchangeResponse = await fetch('http://YOUR_SERVER/api/exchange_public_token', {
        method: 'POST',
        body: JSON.stringify({
          public_token: publicToken,
          userId: session.user.id,
        }),
      });
      
      const { access_token } = await exchangeResponse.json();
      setPlaidAccessToken(access_token);
      
      // 4. Save to Supabase
      await supabase
        .from('user_profiles')
        .update({ plaid_access_token: access_token })
        .eq('id', session.user.id);
    },
    onExit: (error) => {
      if (error) {
        console.error('Plaid Link error:', error);
      }
    },
  });
};
*/
