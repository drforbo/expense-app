import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { supabase } from './lib/supabase';
import { colors, fonts } from './lib/theme';
import SimpleOnboarding from './screens/onboarding/SimpleOnboarding';
import DashboardScreen from './screens/dashboard/DashboardScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import TransactionsScreen from './screens/transactions/TransactionsScreen';
import SwipeCategorizeScreen from './screens/transactions/SwipeCategorizeScreen';
import QualifyTransactionListScreen from './screens/transactions/QualifyTransactionListScreen';
import QualifyTransactionsScreen from './screens/transactions/QualifyTransactionsScreen';
import AddEvidenceScreen from './screens/transactions/AddEvidenceScreen';
import EditTransactionScreen from './screens/transactions/EditTransactionScreen';
import UploadStatementScreen from './screens/upload/UploadStatementScreen';
import BankStatementsScreen from './screens/upload/BankStatementsScreen';
import MonthDetailScreen from './screens/upload/MonthDetailScreen';
import TaxEstimateScreen from './screens/tax/TaxEstimateScreen';
import FilingGuideScreen from './screens/tax/FilingGuideScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import GiftedTrackerScreen from './screens/gifted/GiftedTrackerScreen';
import HmrcConnectScreen from './screens/hmrc/HmrcConnectScreen';
import HmrcSubmitScreen from './screens/hmrc/HmrcSubmitScreen';

type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  SwipeCategorize: { transactions: any[] };
  QualifyTransactionList: undefined;
  QualifyTransactions: { transaction: any };
  AddEvidence: { transaction: any };
  EditTransaction: { transactionId: string; transactionType: string };
  UploadStatement: undefined;
  MonthDetail: { month: string; monthLabel: string };
  FilingGuide: undefined;
  Profile: undefined;
  GiftedTracker: undefined;
  HmrcConnect: undefined;
  HmrcSubmit: { taxYear: string };
};

type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Upload: undefined;
  Tax: undefined;
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={BankStatementsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cloud-upload-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tax"
        component={TaxEstimateScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calculator-outline" size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={22} color={color} />
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
      if (__DEV__) console.error('Error checking onboarding status:', error);
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
      if (__DEV__) console.error('Error completing onboarding:', error);
    }
  };

  if (isOnboarded === null) return null;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.surface },
        }}
        initialRouteName={isOnboarded ? 'MainTabs' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding">
          {() => <SimpleOnboarding onComplete={handleOnboardingComplete} />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="SwipeCategorize" component={SwipeCategorizeScreen} />
        <Stack.Screen name="QualifyTransactionList" component={QualifyTransactionListScreen} />
        <Stack.Screen name="QualifyTransactions" component={QualifyTransactionsScreen} />
        <Stack.Screen name="AddEvidence" component={AddEvidenceScreen} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
        <Stack.Screen name="UploadStatement" component={UploadStatementScreen} />
        <Stack.Screen name="MonthDetail" component={MonthDetailScreen} />
        <Stack.Screen name="FilingGuide" component={FilingGuideScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="GiftedTracker" component={GiftedTrackerScreen} />
        <Stack.Screen name="HmrcConnect" component={HmrcConnectScreen} />
        <Stack.Screen name="HmrcSubmit" component={HmrcSubmitScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 28,
    height: 64 + 28,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
