import React, { useEffect } from 'react';
import { UploadProvider } from './context/UploadContext';
import AppNavigator from './AppNavigator';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    Font.loadAsync({
      'ClashDisplay-Bold':     require('./assets/fonts/ClashDisplay-Bold.ttf'),
      'ClashDisplay-SemiBold': require('./assets/fonts/ClashDisplay-SemiBold.ttf'),
      'ClashDisplay-Medium':   require('./assets/fonts/ClashDisplay-Medium.ttf'),
      'Satoshi-Regular':       require('./assets/fonts/Satoshi-Regular.ttf'),
      'Satoshi-Bold':          require('./assets/fonts/Satoshi-Bold.ttf'),
    }).then(() => {
      setFontsLoaded(true);
      SplashScreen.hideAsync();
    });
  }, []);

  if (!fontsLoaded) return null;

  return (
    <UploadProvider>
      <AppNavigator />
    </UploadProvider>
  );
}
