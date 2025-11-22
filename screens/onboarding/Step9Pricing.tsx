import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import {
  GradientContainer,
  GlassButton,
  DecorativeBlobs,
} from '../../lib/components';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface Step9PricingProps {
  onSelectPlan: (plan: 'week' | 'quarter' | 'year') => void;
}

export const Step9Pricing: React.FC<Step9PricingProps> = ({ onSelectPlan }) => {
  const [selectedPlan, setSelectedPlan] = useState<'week' | 'quarter' | 'year' | null>(null);

  const plans = [
    {
      id: 'week' as const,
      name: 'Try for a week',
      price: '£3.99',
      period: 'one-time payment',
      duration: '7 days access',
      highlight: false,
      subtext: 'Perfect for panic mode before tax deadline',
    },
    {
      id: 'quarter' as const,
      name: 'Quarterly',
      price: '£32',
      period: 'every 3 months',
      duration: '~£2.50/week',
      highlight: false,
      subtext: 'Build the habit, save 20%',
    },
    {
      id: 'year' as const,
      name: 'Annual',
      price: '£99',
      period: 'per year',
      duration: '~£1.90/week',
      highlight: true,
      badge: 'Save 25%',
      subtext: 'Best value for committed hustlers',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Keep your{'\n'}streak going</Text>
            <Text style={styles.subtitle}>
              Tax fines often exceed £500 if you're late
            </Text>
          </View>
          
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  plan.highlight && styles.planCardHighlight,
                ]}
              >
                {plan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>
                
                <Text style={styles.planDuration}>{plan.duration}</Text>
                <Text style={styles.planSubtext}>{plan.subtext}</Text>
                
                {selectedPlan === plan.id && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.buttonContainer}>
            <GlassButton
              title={selectedPlan ? 'Continue' : 'Select a plan'}
              onPress={() => selectedPlan && onSelectPlan(selectedPlan)}
              variant="primary"
              disabled={!selectedPlan}
            />
            
            <Text style={styles.disclaimer}>
              {selectedPlan === 'week' 
                ? 'One-time payment. Access expires after 7 days.'
                : 'Subscription renews automatically. Cancel anytime.'}
            </Text>
          </View>
        </ScrollView>
      </GradientContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepPurple,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mediumGray,
    textAlign: 'center',
  },
  plansContainer: {
    marginBottom: spacing.xl,
  },
  planCard: {
    backgroundColor: colors.deepPurple,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.electricViolet,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  planCardHighlight: {
    borderColor: colors.coral,
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.coral,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.coral,
  },
  planPeriod: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  planDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  planSubtext: {
    fontSize: 13,
    color: colors.mediumGray,
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.electricViolet,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheck: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.mediumGray,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});