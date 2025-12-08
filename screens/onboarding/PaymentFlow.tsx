import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignUpScreen from './SignUpScreen';
import PaymentInfoScreen from './PaymentInfoScreen';

interface PaymentFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

type PaymentStep = 'intro' | 'signup' | 'payment';

export default function PaymentFlow({ onComplete, onBack }: PaymentFlowProps) {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket" size={36} color="#7C3AED" />
          </View>
          <Text style={styles.title}>Ready to start?</Text>
          <Text style={styles.subtitle}>
            Try Bopp for just £2.99 your first month
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
          <Text style={styles.pricingTitle}>Special intro offer:</Text>
          <View style={styles.pricingRow}>
            <Text style={styles.price}>£2.99</Text>
            <Text style={styles.period}> first month</Text>
          </View>
          <Text style={styles.pricingNote}>
            Then £12.99/month. Cancel anytime.
          </Text>
        </View>

        {/* CTA Button */}
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => setCurrentStep('signup')}
        >
          <Text style={styles.ctaButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  features: {
    marginBottom: 14,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  pricingCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  pricingTitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  price: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  period: {
    fontSize: 16,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  pricingNote: {
    fontSize: 13,
    color: '#10B981',
  },
  ctaButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ctaButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  footer: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 15,
  },
});
