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

  // Calculate trial end date
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedDate = trialEndDate.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });

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
      // 3. Create subscription with trial
      // 4. Save subscription ID to Supabase
      
      console.log('Payment method collected for user:', userId);
      console.log('Trial will end on:', formattedDate);
      
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start Your Free Trial</Text>
          <Text style={styles.subtitle}>
            You won't be charged until {formattedDate}
          </Text>
        </View>

        {/* Trial Info Card */}
        <View style={styles.trialCard}>
          <View style={styles.trialRow}>
            <Text style={styles.trialLabel}>Free trial</Text>
            <Text style={styles.trialValue}>7 days</Text>
          </View>
          <View style={styles.trialRow}>
            <Text style={styles.trialLabel}>Then</Text>
            <Text style={styles.trialValue}>£12.99/month</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.trialNote}>
            Cancel anytime before {formattedDate} and you won't be charged
          </Text>
        </View>

        {/* Apple Pay Option */}
        <TouchableOpacity 
          style={styles.applePayButton}
          onPress={handleApplePay}
        >
          <Ionicons name="logo-apple" size={24} color="#fff" />
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
              <Ionicons name="card-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="#6B7280"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
                editable={!isLoading}
              />
            </View>
          </View>

          {/* Expiry and CVV */}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>Expiry</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="calendar-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="MM/YY"
                  placeholderTextColor="#6B7280"
                  value={expiry}
                  onChangeText={(text) => setExpiry(formatExpiry(text))}
                  keyboardType="numeric"
                  maxLength={5}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.label}>CVV</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="#6B7280"
                  value={cvv}
                  onChangeText={setCvv}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={16} color="#10B981" />
          <Text style={styles.securityText}>
            Your payment info is secure and encrypted
          </Text>
        </View>

        {/* Continue Button */}
        <TouchableOpacity 
          style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Start Free Trial</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you'll be charged £12.99/month after your free trial ends on {formattedDate}. Cancel anytime.
        </Text>
      </View>
    </KeyboardAvoidingView>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  trialCard: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  trialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trialLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  trialValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  trialNote: {
    fontSize: 14,
    color: '#10B981',
    lineHeight: 20,
  },
  applePayButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  applePayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151',
  },
  orText: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 16,
  },
  form: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1333',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  securityText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  footer: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
