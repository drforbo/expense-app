import React, { useEffect, useCallback } from 'react';
import { StatusBar } from 'react-native';
import { UploadProvider } from './context/UploadContext';
import AppNavigator from './AppNavigator';
import * as SplashScreen from 'expo-splash-screen';
import { registerForPushNotifications } from './lib/notifications';
import { useFonts } from 'expo-font';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('./assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-Black': require('./assets/fonts/Poppins-Black.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      registerForPushNotifications().catch(console.error);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <UploadProvider>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppNavigator />
    </UploadProvider>
  );
}
