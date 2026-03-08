import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import SignUpScreen from './SignUpScreen';
import PaymentInfoScreen from './PaymentInfoScreen';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

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
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="rocket" size={36} color={colors.ember} />
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
              <Ionicons name="checkmark" size={20} color={colors.tagGreenText} />
            </View>
            <Text style={styles.featureText}>AI-powered expense categorization</Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color={colors.tagGreenText} />
            </View>
            <Text style={styles.featureText}>HMRC-compliant tax reports</Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color={colors.tagGreenText} />
            </View>
            <Text style={styles.featureText}>Gamified daily habit building</Text>
          </View>

          <View style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name="checkmark" size={20} color={colors.tagGreenText} />
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
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
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
    backgroundColor: colors.parchment,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...shadows.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...shadows.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fonts.body,
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
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: 15,
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
  },
  pricingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: colors.ink,
    ...shadows.sm,
  },
  pricingTitle: {
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: 6,
    fontFamily: fonts.body,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  price: {
    fontSize: 40,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  period: {
    fontSize: 16,
    color: colors.midGrey,
    marginLeft: 4,
    fontFamily: fonts.body,
  },
  pricingNote: {
    fontSize: 13,
    color: colors.tagGreenText,
    fontFamily: fonts.body,
  },
  ctaButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  ctaButtonText: {
    fontSize: 17,
    fontFamily: fonts.displaySemi,
    color: colors.white,
    marginRight: spacing.xs,
  },
  footer: {
    fontSize: 11,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 15,
    fontFamily: fonts.body,
  },
});
