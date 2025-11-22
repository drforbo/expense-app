import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { OnboardingStep, ContinueButton } from './OnboardingStep';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Step5ConnectBankProps {
  onNext: (bankConnected: boolean) => void;
}

export const Step5ConnectBank: React.FC<Step5ConnectBankProps> = ({ onNext }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'skipped'>('idle');

  const handleConnectBank = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsConnecting(true);
    setConnectionStatus('connecting');

    try {
      // TODO: Initialize Plaid Link
      // const linkToken = await fetchLinkToken();
      // const result = await openPlaidLink(linkToken);
      
      // Simulate Plaid connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('connected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Auto-advance after showing success
      setTimeout(() => {
        onNext(true);
      }, 1500);
    } catch (error) {
      console.error('Bank connection error:', error);
      setIsConnecting(false);
      setConnectionStatus('idle');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConnectionStatus('skipped');
    onNext(false);
  };

  const benefits = [
    { emoji: '⚡', text: 'Automatic transaction imports' },
    { emoji: '🔒', text: 'Bank-level security (256-bit encryption)' },
    { emoji: '⏱️', text: 'Save 3+ hours per month' },
    { emoji: '🎯', text: 'Never miss a deductible expense' },
  ];

  if (connectionStatus === 'connected') {
    return (
      <OnboardingStep
        step={5}
        totalSteps={9}
        title="Bank connected! 🎉"
        subtitle="We're syncing your transactions"
      >
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={['#B8FF3C', '#8FD926']}
              style={styles.successIconGradient}
            >
              <Text style={styles.successIcon}>✓</Text>
            </LinearGradient>
          </View>
          <Text style={styles.successText}>
            Your bank account is securely connected
          </Text>
        </View>
      </OnboardingStep>
    );
  }

  return (
    <OnboardingStep
      step={5}
      totalSteps={9}
      title="Connect your bank"
      subtitle="Secure connection via Plaid"
    >
      {/* Benefits */}
      <View style={styles.benefitsContainer}>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <Text style={styles.benefitEmoji}>{benefit.emoji}</Text>
            <Text style={styles.benefitText}>{benefit.text}</Text>
          </View>
        ))}
      </View>

      {/* Security badge */}
      <View style={styles.securityBadge}>
        <Text style={styles.securityText}>
          🔐 We use Plaid - trusted by thousands of financial apps. We never see your login details.
        </Text>
      </View>

      {/* Connect button */}
      <View style={styles.buttonWrapper}>
        {isConnecting ? (
          <View style={styles.loadingButton}>
            <ActivityIndicator color="#B8FF3C" size="small" />
            <Text style={styles.loadingText}>Connecting securely...</Text>
          </View>
        ) : (
          <ContinueButton
            onPress={handleConnectBank}
            text="Connect Bank Account"
          />
        )}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={isConnecting}
        >
          <Text style={[styles.skipText, isConnecting && styles.skipTextDisabled]}>
            Maybe later
          </Text>
        </TouchableOpacity>
      </View>
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  benefitsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  benefitEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  benefitText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    flex: 1,
  },
  securityBadge: {
    backgroundColor: 'rgba(184, 255, 60, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(184, 255, 60, 0.2)',
    marginBottom: 32,
  },
  securityText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginTop: 'auto',
  },
  loadingButton: {
    backgroundColor: 'rgba(184, 255, 60, 0.1)',
    borderRadius: 16,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(184, 255, 60, 0.3)',
  },
  loadingText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: '#B8FF3C',
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
  skipTextDisabled: {
    opacity: 0.3,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    overflow: 'hidden',
  },
  successIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 60,
    color: '#0F1419',
    fontWeight: 'bold',
  },
  successText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});