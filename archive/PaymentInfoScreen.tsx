import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface PaymentInfoScreenProps {
  email: string;
  userId: string;
  onComplete: () => void;
  onBack: () => void;
}

export default function PaymentInfoScreen({
  email,
  userId,
  onComplete,
  onBack
}: PaymentInfoScreenProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add space every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiry = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateCard = () => {
    const cleanedCard = cardNumber.replace(/\s/g, '');
    if (cleanedCard.length < 15) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return false;
    }

    const cleanedExpiry = expiry.replace('/', '');
    if (cleanedExpiry.length !== 4) {
      Alert.alert('Invalid Expiry', 'Please enter expiry date (MM/YY)');
      return false;
    }

    // Check if expiry is in the future
    const month = parseInt(cleanedExpiry.substring(0, 2));
    const year = parseInt('20' + cleanedExpiry.substring(2, 4));
    const now = new Date();
    const expiryDate = new Date(year, month - 1);

    if (expiryDate < now) {
      Alert.alert('Card Expired', 'Please use a valid card');
      return false;
    }

    if (cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter your card security code');
      return false;
    }

    return true;
  };

  const handleContinue = async () => {
    if (!validateCard()) {
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Integrate with Stripe/RevenueCat
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In production, you would:
      // 1. Create Stripe customer
      // 2. Attach payment method
      // 3. Create subscription with £2.99 first month, then £12.99/month
      // 4. Save subscription ID to Supabase

      console.log('Payment collected for user:', userId);
      console.log('Charged: £2.99 for first month');

      onComplete();
    } catch (error: any) {
      Alert.alert('Payment Error', error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplePay = async () => {
    Alert.alert(
      'Apple Pay',
      'Apple Pay integration coming soon. For now, please enter card details manually.',
      [{ text: 'OK' }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>

        {/* Screen label */}
        <Text style={styles.screenLabel}>PAYMENT</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Purchase</Text>
          <Text style={styles.subtitle}>
            You'll be charged £2.99 today
          </Text>
        </View>

        {/* Trial Info Card */}
        <View style={styles.trialCard}>
          <View style={styles.trialRow}>
            <Text style={styles.trialLabel}>First month</Text>
            <Text style={styles.trialValue}>£2.99</Text>
          </View>
          <View style={styles.trialRow}>
            <Text style={styles.trialLabel}>Then</Text>
            <Text style={styles.trialValue}>£12.99/month</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.trialNote}>
            Cancel anytime. No long-term commitment.
          </Text>
        </View>

        {/* Apple Pay Option */}
        <TouchableOpacity
          style={styles.applePayButton}
          onPress={handleApplePay}
        >
          <Ionicons name="logo-apple" size={24} color={colors.white} />
          <Text style={styles.applePayText}>Pay with Apple Pay</Text>
        </TouchableOpacity>

        <View style={styles.orDivider}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>or pay with card</Text>
          <View style={styles.orLine} />
        </View>

        {/* Card Form */}
        <View style={styles.form}>
          {/* Card Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Card Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="card-outline" size={20} color={colors.midGrey} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={colors.muted}
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Expiry and CVV */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Expiry</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color={colors.midGrey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.muted}
                  value={expiry}
                  onChangeText={(text) => setExpiry(formatExpiry(text))}
                  keyboardType="numeric"
                  maxLength={5}
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>CVV</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.midGrey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor={colors.muted}
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
                  editable={!isLoading}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color={colors.positive} />
          <Text style={styles.securityText}>
            Your payment info is secure and encrypted
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Pay £2.99</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          You'll be charged £2.99 today, then £12.99/month starting next month. Cancel anytime.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  screenLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: '#FF4500',
    fontFamily: fonts.bodyBold,
    marginBottom: spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  trialCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  trialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trialLabel: {
    fontSize: 16,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  trialValue: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  trialNote: {
    fontSize: 14,
    color: colors.positive,
    lineHeight: 20,
    fontFamily: fonts.body,
  },
  applePayButton: {
    backgroundColor: colors.ink,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  applePayText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.white,
    marginLeft: spacing.xs,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontSize: 14,
    color: colors.midGrey,
    marginHorizontal: spacing.md,
    fontFamily: fonts.body,
  },
  form: {
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
  },
  inputIcon: {
    marginLeft: spacing.md,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: colors.ink,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.body,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  securityText: {
    fontSize: 14,
    color: colors.positive,
    marginLeft: spacing.xs,
    fontFamily: fonts.body,
  },
  continueButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.white,
    marginRight: spacing.xs,
  },
  footer: {
    fontSize: 12,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: fonts.body,
  },
});
