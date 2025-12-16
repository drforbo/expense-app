import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './lib/supabase';
import SimpleOnboarding from './screens/onboarding/SimpleOnboarding';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import TransactionListScreen from './screens/transactions/TransactionListScreen';
import TransactionCategorizationScreen from './screens/transactions/TransactionCategorizationScreen';
import QualifyTransactionListScreen from './screens/transactions/QualifyTransactionListScreen';
import QualifyTransactionsScreen from './screens/transactions/QualifyTransactionsScreen';
import AddEvidenceScreen from './screens/transactions/AddEvidenceScreen';
import EditTransactionScreen from './screens/transactions/EditTransactionScreen';
import CategorizedTransactionsScreen from './screens/transactions/CategorizedTransactionsScreen';
import SubscriptionReviewScreen from './screens/transactions/SubscriptionReviewScreen';
import GiftedTrackerScreen from './screens/gifted/GiftedTrackerScreen';
import UploadStatementScreen from './screens/upload/UploadStatementScreen';
import OverviewScreen from './screens/overview/OverviewScreen';
import TaxChecklistScreen from './screens/overview/TaxChecklistScreen';
import ProfileScreen from './screens/profile/ProfileScreen';

type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  UploadStatement: undefined;
  TransactionList: undefined;
  TransactionCategorization: { transaction?: any; allTransactions?: any[]; preGeneratedQuestions?: any; batchMode?: boolean; batchMerchant?: string };
  SubscriptionReview: { subscriptions: any[] };
  QualifyTransactionList: undefined;
  QualifyTransactions: { transaction: any };
  AddEvidence: { transaction: any };
  EditTransaction: { transactionId: string; transactionType: string };
  CategorizedTransactions: { filterType?: string };
  GiftedTracker: undefined;
  TaxChecklist: undefined;
  Profile: undefined;
};

type TabParamList = {
  Actions: undefined;
  Overview: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Actions"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="flash" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Overview"
        component={OverviewScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="pie-chart" size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <View style={styles.tabIconContainer}>
              <Ionicons name="person" size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

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
      // Navigate to MainTabs after onboarding is complete
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
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
        initialRouteName={isOnboarded ? 'MainTabs' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding">
          {(props) => (
            <SimpleOnboarding
              onComplete={handleOnboardingComplete}
            />
          )}
        </Stack.Screen>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="TransactionList"
          component={TransactionListScreen}
        />
        <Stack.Screen
          name="TransactionCategorization"
          component={TransactionCategorizationScreen}
        />
        <Stack.Screen
          name="QualifyTransactionList"
          component={QualifyTransactionListScreen}
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
        <Stack.Screen
          name="UploadStatement"
          component={UploadStatementScreen}
        />
        <Stack.Screen
          name="TaxChecklist"
          component={TaxChecklistScreen}
        />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
        />
        <Stack.Screen
          name="EditTransaction"
          component={EditTransactionScreen}
        />
        <Stack.Screen
          name="CategorizedTransactions"
          component={CategorizedTransactionsScreen}
        />
        <Stack.Screen
          name="SubscriptionReview"
          component={SubscriptionReviewScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1F1333',
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 28,
    height: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
