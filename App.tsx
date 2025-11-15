import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import OnboardingScreen from './screens/OnboardingScreen';

export default function App() {
  const [userProfile, setUserProfile] = useState(null);

  if (!userProfile) {
    return (
      <OnboardingScreen 
        onComplete={(profile) => {
          setUserProfile(profile);
          console.log('User profile:', profile);
        }}
      />
    );
  }

  // After onboarding is complete
  return (
    <View style={styles.container}>
      <Text style={styles.text}>✅ Onboarding Complete!</Text>
      <Text style={styles.subtext}>
        Content Type: {userProfile.contentType}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
});