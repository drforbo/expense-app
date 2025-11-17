import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFonts, Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ConnectBankScreen from './screens/ConnectBankScreen';
import DashboardScreen from './screens/DashboardScreen';
import UserTypeScreen from './screens/UserTypeScreen';

interface UserProfile {
  contentType: string;
  typicalProducts: string;
  creationMethod: string[];
  toolsUsed: string[];
  businessStructure: string;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasBank, setHasBank] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load fonts
  let [fontsLoaded] = useFonts({
    'Montserrat': Montserrat_700Bold,
    'Montserrat-Regular': Montserrat_400Regular,
    'Montserrat-SemiBold': Montserrat_600SemiBold,
  });

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
      if (session) {
        checkUserStatus(session.user.id);
      } else {
        setHasProfile(false);
        setHasBank(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserStatus = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setHasProfile(true);
      setHasBank(!!data.plaid_access_token);
      setUserProfile({
        contentType: data.content_type,
        typicalProducts: data.typical_products,
        creationMethod: data.creation_method,
        toolsUsed: data.tools_used,
        businessStructure: data.business_structure,
      });
    }
    setLoading(false);
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('users')
      .insert([
        {
          id: session.user.id,
          email: session.user.email,
          content_type: profile.contentType,
          typical_products: profile.typicalProducts,
          creation_method: profile.creationMethod,
          tools_used: profile.toolsUsed,
          business_structure: profile.businessStructure,
        }
      ]);

    if (!error) {
      setHasProfile(true);
      setUserProfile(profile);
    }
  };

  // Show loading while fonts or data are loading
  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#F64B42" />
      </View>
    );
  }

  // Not signed in
  if (!session) {
    return <AuthScreen onAuthenticated={() => {}} />;
  }

  // Signed in but no profile
  if (!hasProfile) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  // Has profile but no bank connected
  if (!hasBank) {
    return <ConnectBankScreen userId={session.user.id} onConnected={() => checkUserStatus(session.user.id)} />;
  }

  // Fully set up
  return <DashboardScreen userId={session.user.id} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F6F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
});