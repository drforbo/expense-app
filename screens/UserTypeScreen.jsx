import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

const UserTypeScreen = ({ navigation }) => {
  const handleUserTypeSelect = (userType) => {
    // Store the user type and navigate to next screen
    console.log('Selected:', userType);
    
    // Example: Navigate to next screen with the selected type
    // navigation.navigate('NextScreen', { userType });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.logoText}>bopp</Text>
          <Text style={styles.tagline}>
            Tax sorted for{'\n'}
            <Text style={styles.taglineBold}>hustlers</Text>
          </Text>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <Text style={styles.promptText}>I'm a...</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleUserTypeSelect('content_creator')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Content creator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleUserTypeSelect('reselling')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Reselling (Vinted/eBay)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleUserTypeSelect('freelancing')}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Freelancing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
  },
  welcomeText: {
    fontSize: 24,
    color: '#1E274F',
    fontWeight: '400',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#F64B42',
    marginBottom: 24,
  //  fontFamily: 'Montserrat',
  },
  tagline: {
    fontSize: 28,
    color: '#1E274F',
    textAlign: 'center',
    fontWeight: '400',
  },
  taglineBold: {
    fontWeight: '700',
  },
  buttonSection: {
    marginBottom: 40,
  },
  promptText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#F64B42',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 20,
  },
  button: {
    backgroundColor: '#F64B42',
    borderRadius: 50,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  buttonText: {
    color: '#F6F6F5',
    fontSize: 20,
    fontWeight: '600',
  },
});

export default UserTypeScreen;