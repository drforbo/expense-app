import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SignUpScreen from './SignUpScreen';
import PaymentInfoScreen from './PaymentInfoScreen';

interface PaymentFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

type PaymentStep = 'intro' | 'signup' | 'payment';

export default function PaymentFlow({ onComplete, onSkip }: PaymentFlowProps) {
  const [currentStep, setCurrentStep] = useState<PaymentStep>('intro');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');

  const handleSignUpComplete = (newUserId: string, email: string) => {
    setUserId(newUserId);
    setUserEmail(email);
    setCurrentStep('payment');
  };

  const handlePaymentComplete = () => {
    onComplete();
  };

  if (currentStep === 'signup') {
    return (
      <SignUpScreen 
        onComplete={handleSignUpComplete}
        onBack={() => setCurrentStep('intro')}
      />
    );
  }

  if (currentStep === 'payment') {
    return (
      <PaymentInfoScreen 
        email={userEmail}
        userId={userId}
        onComplete={handlePaymentComplete}
        onBack={() => setCurrentStep('signup')}
      />
    );
  }

  // Intro screen
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket" size={48} color="#7C3AED" />
          </View>
          <Text style={styles.title}>Ready to try Bopp?</Text>
          <Text style={styles.subtitle}>
            Start your 7-day free trial and experience stress-free bookkeeping
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>AI-powered expense categorization</Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>HMRC-compliant tax reports</Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>Gamified daily habit building</Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color="#10B981" />
            </View>
            <Text style={styles.featureText}>Cancel anytime, no commitments</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>After your free trial:</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.price}>£12.99</Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.pricingNote}>
            Cancel anytime. No long-term contracts.
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => setCurrentStep('signup')}
        >
          <Text style={styles.ctaButtonText}>Start Free Trial</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Skip option */}
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  pricingCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  pricingTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  period: {
    fontSize: 18,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  pricingNote: {
    fontSize: 14,
    color: '#10B981',
  },
  ctaButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  footer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
