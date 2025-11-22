import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import * as SplashScreen from 'expo-splash-screen';

// Import your onboarding flow
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';

// Keep splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

export default function App() {
  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide splash screen once fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed!', data);
    // TODO: Navigate to dashboard or next screen
    // TODO: Save onboarding data
  };

  // Don't render anything until fonts are loaded
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0F1419" />
      <OnboardingFlow onComplete={handleOnboardingComplete} />
    </>
  );
}
