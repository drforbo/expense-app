import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingFlow from './screens/onboarding/OnboardingFlow';
import QuickGuide from './screens/onboarding/QuickGuide';
import PaymentFlow from './screens/onboarding/PaymentFlow';

interface OnboardingData {
  workType: string;
  customWorkType?: string;
  timeCommitment: string;
  incomeRange: string;
  trackingGoal: string;
}

type FlowStep = 'onboarding' | 'guide' | 'payment' | 'complete';

export default function App() {
  const [currentStep, setCurrentStep] = useState<FlowStep>('onboarding');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    console.log('Onboarding completed with data:', data);
    
    setIsLoading(true);
    
    try {
      // TODO: Save onboarding data to Supabase
      // const { user } = await supabase.auth.getUser();
      // if (user) {
      //   await supabase
      //     .from('user_profiles')
      //     .update({
      //       work_type: data.workType,
      //       custom_work_type: data.customWorkType,
      //       time_commitment: data.timeCommitment,
      //       income_range: data.incomeRange,
      //       tracking_goal: data.trackingGoal,
      //       onboarding_completed: true,
      //     })
      //     .eq('id', user.id);
      // }
      
      setOnboardingData(data);
      
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setCurrentStep('guide');
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuideComplete = () => {
    console.log('Quick guide completed');
    setCurrentStep('payment');
  };

  const handlePaymentComplete = async () => {
    console.log('Payment completed');
    
    setIsLoading(true);
    
    try {
      // TODO: Update user subscription status in Supabase
      // await supabase
      //   .from('user_profiles')
      //   .update({ has_active_subscription: true })
      //   .eq('id', user.id);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error updating subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSkip = () => {
    console.log('Payment skipped - entering trial mode');
    setCurrentStep('complete');
  };

  const handleReset = () => {
    setCurrentStep('onboarding');
    setOnboardingData(null);
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
      
      {currentStep === 'onboarding' && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}

      {currentStep === 'guide' && (
        <QuickGuide onComplete={handleGuideComplete} />
      )}

      {currentStep === 'payment' && (
        <PaymentFlow 
          onComplete={handlePaymentComplete}
          onSkip={handlePaymentSkip}
        />
      )}

      {currentStep === 'complete' && (
        <View style={styles.container}>
          {/* Temporary Success Screen */}
          <View style={styles.successContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={80} color="#7C3AED" />
            </View>
            
            <Text style={styles.welcomeTitle}>You're All Set! 🎉</Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to start tracking expenses
            </Text>

            {/* Show summary of what they selected */}
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
                    {onboardingData.incomeRange === '0-500' && 'Under £500/month'}
                    {onboardingData.incomeRange === '500-2000' && '£500-£2,000/month'}
                    {onboardingData.incomeRange === '2000-5000' && '£2,000-£5,000/month'}
                    {onboardingData.incomeRange === '5000+' && 'Over £5,000/month'}
                  </Text>
                </View>

                <View style={styles.summaryItem}>
                  <Ionicons name="flag" size={20} color="#FF6B6B" />
                  <Text style={styles.summaryText}>
                    {onboardingData.trackingGoal === 'compliance' && 'Stay HMRC compliant'}
                    {onboardingData.trackingGoal === 'deductions' && 'Maximize deductions'}
                    {onboardingData.trackingGoal === 'understanding' && 'Understand finances'}
                    {onboardingData.trackingGoal === 'tax_prep' && 'Make tax season easier'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={styles.continueButton}
              onPress={() => {
                // TODO: Navigate to your main app/dashboard
                console.log('Navigate to dashboard');
                Alert.alert('Coming Soon', 'Main app coming soon! Tap "Try Again" to test the full flow.');
              }}
            >
              <Text style={styles.continueButtonText}>Start Tracking</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Temporary reset button for testing */}
            <TouchableOpacity 
              style={styles.resetButton}
              onPress={handleReset}
            >
              <Text style={styles.resetButtonText}>Try Full Flow Again</Text>
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
    marginBottom: 16,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});