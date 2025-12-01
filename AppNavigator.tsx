import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import SimpleOnboarding from './screens/onboarding/SimpleOnboarding';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import TransactionListScreen from './screens/transactions/TransactionListScreen';
import TransactionCategorizationScreen from './screens/transactions/TransactionCategorizationScreen';
import QualifyTransactionsScreen from './screens/transactions/QualifyTransactionsScreen';
import AddEvidenceScreen from './screens/transactions/AddEvidenceScreen';
import GiftedTrackerScreen from './screens/gifted/GiftedTrackerScreen';

type RootStackParamList = {
  Onboarding: undefined;
  Dashboard: undefined;
  TransactionList: { accessToken: string };
  TransactionCategorization: { accessToken: string; transaction?: any; allTransactions?: any[]; onReturn?: () => void };
  QualifyTransactions: undefined;
  AddEvidence: { transaction: any };
  GiftedTracker: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    checkOnboardingStatus();

    // Listen for auth state changes (e.g., logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, resetting to onboarding');
        setIsOnboarded(false);
        // Reset navigation to Onboarding screen
        if (navigationRef.current) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('onboarding_completed');
      setIsOnboarded(completed === 'true');
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboarded(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      setIsOnboarded(true);
      // Navigate to Dashboard after onboarding is complete
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  if (isOnboarded === null) {
    // Loading state - you can add a splash screen here later
    return null;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#2E1A47' },
        }}
        initialRouteName={isOnboarded ? 'Dashboard' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding">
          {(props) => (
            <SimpleOnboarding
              onComplete={handleOnboardingComplete}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen
          name="TransactionList"
          component={TransactionListScreen}
        />
        <Stack.Screen
          name="TransactionCategorization"
          component={TransactionCategorizationScreen}
        />
        <Stack.Screen
          name="QualifyTransactions"
          component={QualifyTransactionsScreen}
        />
        <Stack.Screen
          name="AddEvidence"
          component={AddEvidenceScreen}
        />
        <Stack.Screen
          name="GiftedTracker"
          component={GiftedTrackerScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
