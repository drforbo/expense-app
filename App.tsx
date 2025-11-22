import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';

// Import your screens
import { OnboardingFlow } from './screens/onboarding/OnboardingFlow';
import { DashboardScreen } from './screens/DashboardScreen';
import { AuthScreen } from './screens/AuthScreen';

// Keep splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    // Check authentication and onboarding status
    // Replace with your actual auth/onboarding check logic
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide splash screen once fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const checkAuthStatus = async () => {
    // TODO: Replace with your actual auth check
    // const user = await checkAuth();
    // const onboarding = await checkOnboarding();
    // setIsAuthenticated(!!user);
    // setHasCompletedOnboarding(onboarding);
  };

  const handleOnboardingComplete = async (data: any) => {
    console.log('Onboarding completed with data:', data);
    
    // TODO: Save onboarding data to your backend/storage
    // await saveOnboardingData(data);
    
    setHasCompletedOnboarding(true);
  };

  const handleAuthComplete = () => {
    setIsAuthenticated(true);
  };

  // Don't render anything until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F1419" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0F1419' },
            animation: 'fade',
          }}
        >
          {!isAuthenticated ? (
            // Auth flow
            <Stack.Screen name="Auth">
              {(props) => <AuthScreen {...props} onAuthComplete={handleAuthComplete} />}
            </Stack.Screen>
          ) : !hasCompletedOnboarding ? (
            // Onboarding flow
            <Stack.Screen name="Onboarding">
              {(props) => (
                <OnboardingFlow {...props} onComplete={handleOnboardingComplete} />
              )}
            </Stack.Screen>
          ) : (
            // Main app
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              {/* Add other main app screens here */}
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
});