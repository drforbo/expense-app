import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { UploadProvider } from './context/UploadContext';
import AppNavigator from './AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <UploadProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <AppNavigator />
    </UploadProvider>
  );
}
