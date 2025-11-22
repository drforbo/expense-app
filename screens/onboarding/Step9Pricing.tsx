import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { OnboardingStep, ContinueButton } from './OnboardingStep';
import { LinearGradient } from 'expo-linear-gradient';

interface Step9PricingProps {
  onNext: (plan: string) => void;
}

export const Step9Pricing: React.FC<Step9PricingProps> = ({ onNext }) => {
  const valueProps = [
    { icon: '✨', text: 'AI-powered expense categorization' },
    { icon: '🎮', text: 'Duolingo-style gamification' },
    { icon: '📊', text: 'HMRC-compliant reports' },
    { icon: '💾', text: 'Keep all your data forever' },
  ];

  return (
    <OnboardingStep
      step={9}
      totalSteps={9}
      title="Try Bopp free for 7 days"
      subtitle="Then £3.99 to keep your data"
    >
      {/* Trial offer card */}
      <View style={styles.offerCard}>
        <LinearGradient
          colors={['#B8FF3C', '#8FD926']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.offerGradient}
        >
          <View style={styles.offerContent}>
            <Text style={styles.offerEmoji}>🎉</Text>
            <View style={styles.offerText}>
              <Text style={styles.offerTitle}>7 days completely free</Text>
              <Text style={styles.offerSubtitle}>
                No payment required. Cancel anytime.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Value props */}
      <View style={styles.valueProps}>
        {valueProps.map((prop, index) => (
          <View key={index} style={styles.valueProp}>
            <Text style={styles.valuePropIcon}>{prop.icon}</Text>
            <Text style={styles.valuePropText}>{prop.text}</Text>
          </View>
        ))}
      </View>

      {/* Pricing breakdown */}
      <View style={styles.pricingCard}>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>After 7-day trial</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>£3.99</Text>
            <Text style={styles.priceSubtext}>one-time</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel}>Then monthly</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceMonthly}>£4.99</Text>
            <Text style={styles.priceSubtext}>/month</Text>
          </View>
        </View>
      </View>

      {/* Guarantee */}
      <View style={styles.guarantee}>
        <Text style={styles.guaranteeText}>
          💯 Love it or leave it - cancel anytime during your trial
        </Text>
      </View>

      <View style={styles.buttonWrapper}>
        <ContinueButton onPress={() => onNext('trial')} text="Start Free Trial" />

        <TouchableOpacity style={styles.skipButton} onPress={() => onNext('skip')}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  offerCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#B8FF3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  offerGradient: {
    padding: 24,
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerEmoji: {
    fontSize: 48,
    marginRight: 20,
  },
  offerText: {
    flex: 1,
  },
  offerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: '#0F1419',
    marginBottom: 4,
  },
  offerSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: '#0F1419',
    opacity: 0.8,
  },
  valueProps: {
    gap: 16,
    marginBottom: 32,
  },
  valueProp: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valuePropIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  valuePropText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  pricingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    marginBottom: 24,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: '#B8FF3C',
  },
  priceMonthly: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
  },
  priceSubtext: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
  guarantee: {
    backgroundColor: 'rgba(184, 255, 60, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 60, 0.2)',
    marginBottom: 32,
  },
  guaranteeText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonWrapper: {
    marginTop: 'auto',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  skipText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});