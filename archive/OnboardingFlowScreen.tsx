import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SignUpScreen from '../screens/onboarding/SignUpScreen';
import OnboardingFlow from '../screens/onboarding/OnboardingFlow';
import PaymentFlow from '../screens/onboarding/PaymentFlow';

interface OnboardingData {
  workType: string;
  customWorkType?: string;
  timeCommitment: string;
  monthlyIncome: number;              
  receivesGiftedItems: boolean;       
  hasInternationalIncome: boolean;    
  trackingGoal: string;
}

type FlowStep = 'welcome' | 'signup' | 'onboarding' | 'payment' | 'complete';

interface OnboardingFlowScreenProps {
  onComplete: () => void;
}

export default function OnboardingFlowScreen({ onComplete }: OnboardingFlowScreenProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string>('');

  const handleWelcomeContinue = () => {
    console.log('Welcome screen completed');
    setCurrentStep('signup');
  };

  const handleSignUpComplete = (newUserId: string, email: string) => {
    console.log('Sign up completed for:', email);
    setUserId(newUserId);
    setCurrentStep('onboarding');
  };

  const handleOnboardingBack = () => {
    console.log('Back to sign up from onboarding');
    setCurrentStep('signup');
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data);

    setIsLoading(true);

    try {
      setOnboardingData(data);
      await new Promise(resolve => setTimeout(resolve, 300));
      // Skip payment for now - go directly to complete
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentComplete = async () => {
    console.log('Payment completed');
    
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalComplete = () => {
    // Navigate to main app
    onComplete();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>
          {currentStep === 'onboarding' ? 'Setting up your account...' : 'Processing...'}
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2E1A47" />
      
      {currentStep === 'welcome' && (
        <WelcomeScreen onComplete={handleWelcomeContinue} />
      )}

      {currentStep === 'signup' && (
        <SignUpScreen
          onComplete={handleSignUpComplete}
          onBack={() => setCurrentStep('welcome')}
        />
      )}

      {currentStep === 'onboarding' && (
        <OnboardingFlow
          onComplete={handleOnboardingComplete}
          onBack={handleOnboardingBack}
        />
      )}

      {currentStep === 'payment' && (
        <PaymentFlow 
          onComplete={handlePaymentComplete}
          onBack={() => setCurrentStep('onboarding')}
        />
      )}

      {currentStep === 'complete' && (
        <View style={styles.container}>
          <View style={styles.successContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={80} color="#7C3AED" />
            </View>
            
            <Text style={styles.welcomeTitle}>You're All Set! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to start tracking expenses
            </Text>

            {onboardingData && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Your Profile:</Text>
                
                <View style={styles.summaryItem}>
                  <Ionicons name="briefcase" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    {onboardingData.workType === 'content_creation' && 'Content creation'}
                    {onboardingData.workType === 'freelancing' && 'Freelancing'}
                    {onboardingData.workType === 'side_hustle' && 'Side hustle'}
                    {onboardingData.workType === 'other' && onboardingData.customWorkType}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="time" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    {onboardingData.timeCommitment === 'full_time' && 'Full-time'}
                    {onboardingData.timeCommitment === 'part_time' && 'Part-time'}
                    {onboardingData.timeCommitment === 'casual' && 'Side hustle'}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="cash" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    £{onboardingData.monthlyIncome.toLocaleString()}/month
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="gift" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    {onboardingData.receivesGiftedItems ? 'Receives gifted items' : 'No gifted items'}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="globe" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    {onboardingData.hasInternationalIncome ? 'International income' : 'UK only'}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="flag" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    {onboardingData.trackingGoal === 'sole_trader' && 'Sole trader'}
                    {onboardingData.trackingGoal === 'limited_company' && 'Limited company'}
                    {onboardingData.trackingGoal === 'not_registered' && 'Not yet registered'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={styles.continueButton}
              onPress={handleFinalComplete}
            >
              <Text style={styles.continueButtonText}>Start Tracking</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#2E1A47',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
  },
  summaryContainer: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 32,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  continueButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
});
