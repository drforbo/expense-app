import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';
import OnboardingScreen from './screens/OnboardingScreen';

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkForProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkForProfile(session.user.id);
      } else {
        setHasProfile(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkForProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setHasProfile(true);
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

    if (error) {
      console.error('Error saving profile:', error);
    } else {
      setHasProfile(true);
      setUserProfile(profile);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
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

  // Signed in with profile
  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ Welcome back!</Text>
      <Text style={styles.subtext}>
        {session.user.email}
      </Text>
      <Text style={styles.subtext}>
        Content Type: {userProfile?.contentType}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
  },
});