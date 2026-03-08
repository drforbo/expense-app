import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import { colors } from './lib/theme';
import SimpleOnboarding from './screens/onboarding/SimpleOnboarding';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import TransactionListScreen from './screens/transactions/TransactionListScreen';
import TransactionCategorizationScreen from './screens/transactions/TransactionCategorizationScreen';
import QualifyTransactionListScreen from './screens/transactions/QualifyTransactionListScreen';
import QualifyTransactionsScreen from './screens/transactions/QualifyTransactionsScreen';
import AddEvidenceScreen from './screens/transactions/AddEvidenceScreen';
import EditTransactionScreen from './screens/transactions/EditTransactionScreen';
import CategorizedTransactionsScreen from './screens/transactions/CategorizedTransactionsScreen';
import SubscriptionReviewScreen from './screens/transactions/SubscriptionReviewScreen';
import UploadStatementScreen from './screens/upload/UploadStatementScreen';
import TaxEstimateScreen from './screens/tax/TaxEstimateScreen';
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
  TaxEstimate: undefined;
  Profile: undefined;
};

type TabParamList = {
  Transactions: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.midGrey,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Transactions"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsOnboarded(false);
        if (navigationRef.current) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsOnboarded(false);
        return;
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .single();
      setIsOnboarded(!!profile);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboarded(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      setIsOnboarded(true);
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  if (isOnboarded === null) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.cream },
        }}
        initialRouteName={isOnboarded ? 'MainTabs' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding">
          {() => <SimpleOnboarding onComplete={handleOnboardingComplete} />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="UploadStatement" component={UploadStatementScreen} />
        <Stack.Screen name="TransactionList" component={TransactionListScreen} />
        <Stack.Screen name="TransactionCategorization" component={TransactionCategorizationScreen} />
        <Stack.Screen name="QualifyTransactionList" component={QualifyTransactionListScreen} />
        <Stack.Screen name="QualifyTransactions" component={QualifyTransactionsScreen} />
        <Stack.Screen name="AddEvidence" component={AddEvidenceScreen} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
        <Stack.Screen name="CategorizedTransactions" component={CategorizedTransactionsScreen} />
        <Stack.Screen name="SubscriptionReview" component={SubscriptionReviewScreen} />
        <Stack.Screen name="TaxEstimate" component={TaxEstimateScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
    paddingTop: 8,
    paddingBottom: 28,
    height: 90,
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
