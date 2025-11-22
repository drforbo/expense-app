import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaymentFlowProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export default function PaymentFlow({ onComplete, onSkip }: PaymentFlowProps) {
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'annual'>('trial');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartTrial = async () => {
    setIsProcessing(true);
    
    try {
      // TODO: Integrate with payment provider (Stripe/RevenueCat)
      // await initiatePayment(selectedPlan);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Payment initiated for:', selectedPlan);
      onComplete();
    } catch (error) {
      console.error('Payment error:', error);
      // TODO: Show error alert
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Start Your 7-Day Trial</Text>
          <Text style={styles.headerSubtitle}>
            Full access to all features. Cancel anytime.
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingContainer}>
          {/* Trial Option */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'trial' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('trial')}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>7-Day Trial</Text>
                <Text style={styles.cardSubtitle}>Then £8.99/month</Text>
              </View>
              <View style={styles.radioOuter}>
                {selectedPlan === 'trial' && <View style={styles.radioInner} />}
              </View>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>£3.99</Text>
              <Text style={styles.priceLabel}>for 7 days</Text>
            </View>

            <View style={styles.featuresContainer}>
              <Feature icon="checkmark-circle" text="Full access to all features" />
              <Feature icon="checkmark-circle" text="Unlimited expense tracking" />
              <Feature icon="checkmark-circle" text="HMRC-compliant reports" />
              <Feature icon="checkmark-circle" text="Cancel anytime" />
            </View>
          </TouchableOpacity>

          {/* Annual Option */}
          <TouchableOpacity
            style={[
              styles.pricingCard,
              selectedPlan === 'annual' && styles.pricingCardSelected,
            ]}
            onPress={() => setSelectedPlan('annual')}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Save 30%</Text>
            </View>

            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>Annual Plan</Text>
                <Text style={styles.cardSubtitle}>Best value</Text>
              </View>
              <View style={styles.radioOuter}>
                {selectedPlan === 'annual' && <View style={styles.radioInner} />}
              </View>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>£74.99</Text>
              <Text style={styles.priceLabel}>per year</Text>
            </View>

            <View style={styles.featuresContainer}>
              <Feature icon="checkmark-circle" text="Everything in monthly plan" />
              <Feature icon="checkmark-circle" text="Save £33/year" />
              <Feature icon="checkmark-circle" text="Priority support" />
              <Feature icon="checkmark-circle" text="Early access to new features" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>What you get:</Text>
          <Benefit icon="camera" text="Snap & categorize receipts instantly" />
          <Benefit icon="game-controller" text="Gamified expense tracking" />
          <Benefit icon="shield-checkmark" text="HMRC-compliant tax reports" />
          <Benefit icon="calendar" text="Export for self-assessment" />
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, isProcessing && styles.ctaButtonDisabled]}
          onPress={handleStartTrial}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.ctaButtonText}>
                {selectedPlan === 'trial' ? 'Start 7-Day Trial' : 'Subscribe Annually'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Skip option */}
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}

        {/* Fine print */}
        <Text style={styles.fineprint}>
          {selectedPlan === 'trial'
            ? 'After 7 days, you\'ll be charged £8.99/month. Cancel anytime before then to avoid charges.'
            : 'Billed annually. Cancel anytime for a prorated refund.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FeatureProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

const Feature: React.FC<FeatureProps> = ({ icon, text }) => (
  <View style={styles.feature}>
    <Ionicons name={icon} size={16} color="#7C3AED" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

interface BenefitProps {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

const Benefit: React.FC<BenefitProps> = ({ icon, text }) => (
  <View style={styles.benefit}>
    <View style={styles.benefitIconContainer}>
      <Ionicons name={icon} size={20} color="#FF6B6B" />
    </View>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  pricingContainer: {
    marginBottom: 32,
  },
  pricingCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pricingCardSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#2E1A47',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7C3AED',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  featuresContainer: {
    gap: 8,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 8,
  },
  benefitsSection: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#2E1A47',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
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
  ctaButtonDisabled: {
    opacity: 0.7,
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
    marginBottom: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  fineprint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
