import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from '@expo-google-fonts/outfit';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import { OnboardingFlow } from './screens/OnboardingFlow';
import DashboardScreen from './screens/DashboardScreen';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [plaidAccessToken, setPlaidAccessToken] = useState<string | null>(null);

  // Load custom fonts
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
    }
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkUserStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && onboardingData) {
        // User just signed in after completing onboarding - save data
        saveOnboardingData(session.user.id, onboardingData);
      }
    });

    return () => subscription.unsubscribe();
  }, [onboardingData]);

  const checkUserStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      // User already has profile - go to dashboard
      setOnboardingComplete(true);
      setPlaidAccessToken(data.plaid_access_token);
    } else {
      // User signed in but no profile - they need to complete onboarding
      setOnboardingComplete(false);
    }
    setLoading(false);
  };

  const saveOnboardingData = async (userId: string, userData: any) => {
    try {
      const { error } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: session?.user?.email,
            user_type: userData.userType,
            employment_status: userData.employmentStatus,
            income_level: userData.income,
            selected_plan: userData.selectedPlan,
            plaid_access_token: plaidAccessToken,
          }
        ]);

      if (error) {
        console.error('Error saving profile:', error);
        return;
      }

      console.log('Profile saved successfully!');
      setOnboardingComplete(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const handleOnboardingComplete = async (userData: any) => {
    console.log('Onboarding completed:', userData);
    
    // Store the onboarding data temporarily
    setOnboardingData(userData);
    
    // Check if user is already signed in (shouldn't be in new flow)
    if (session?.user) {
      await saveOnboardingData(session.user.id, userData);
    }
    // If not signed in, onboarding is complete but we need auth
    // The auth screen will show next
  };

  const handleConnectBank = async () => {
    try {
      const SERVER_URL = 'http://192.168.1.XXX:3000'; // TODO: Replace with your IP
      
      const response = await fetch(`${SERVER_URL}/api/create_sandbox_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.id || 'temp_user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create sandbox token');
      }

      const { access_token } = await response.json();
      setPlaidAccessToken(access_token);
      
      console.log('Bank connected successfully!');
      return Promise.resolve();
    } catch (error) {
      console.error('Error connecting bank:', error);
      throw error;
    }
  };

  // Show loading while fonts are loading
  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  // NEW FLOW: Start with onboarding for everyone (no auth required)
  // Only show dashboard if user is signed in AND has completed onboarding
  if (session && onboardingComplete) {
    return <DashboardScreen />;
  }

  // If onboarding is complete but no session, show auth
  if (onboardingData && !session) {
    return <AuthScreen onAuthenticated={() => {}} />;
  }

  // Default: Show onboarding
  return (
    <OnboardingFlow
      onComplete={handleOnboardingComplete}
      onConnectBank={handleConnectBank}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2E1A47',
  },
});