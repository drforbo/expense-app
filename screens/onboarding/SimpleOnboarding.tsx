import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { supabase } from '../../lib/supabase';

interface SimpleOnboardingProps {
  onComplete: () => void;
}

type Step = 'signup' | 'workType' | 'income' | 'registration';

export default function SimpleOnboarding({ onComplete }: SimpleOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>('signup');
  const [loading, setLoading] = useState(false);

  // Auth fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile fields
  const [workType, setWorkType] = useState<string>('');
  const [customWorkType, setCustomWorkType] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(1000);
  const [receivesGiftedItems, setReceivesGiftedItems] = useState(false);
  const [hasInternationalIncome, setHasInternationalIncome] = useState(false);
  const [trackingGoal, setTrackingGoal] = useState<string>('');

  const formatCurrency = (value: number) => {
    if (value >= 10000) return `£${(value / 1000).toFixed(0)}k`;
    return `£${value.toLocaleString()}`;
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      if (data.user) {
        console.log('✅ User created:', data.user.id);
        setCurrentStep('workType');
      }
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      Alert.alert('Sign up failed', error.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkTypeSelect = (type: string) => {
    if (type === 'other') {
      setWorkType('other');
      return;
    }
    setWorkType(type);
    setTimeout(() => setCurrentStep('income'), 300);
  };

  const handleOtherSubmit = () => {
    if (!customWorkType.trim()) return;
    setWorkType('other');
    setTimeout(() => setCurrentStep('income'), 300);
  };

  const handleIncomeNext = () => {
    setCurrentStep('registration');
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('💾 Saving profile for user:', user.id);
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          work_type: workType,
          custom_work_type: workType === 'other' ? customWorkType : null,
          time_commitment: 'full_time', // Default
          monthly_income: monthlyIncome,
          receives_gifted_items: receivesGiftedItems,
          has_international_income: hasInternationalIncome,
          tracking_goal: trackingGoal,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('❌ Error saving profile:', error);
        throw error;
      }

      console.log('✅ Profile saved successfully');
      onComplete();
    } catch (error: any) {
      console.error('❌ Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentStep === 'workType') setCurrentStep('signup');
    else if (currentStep === 'income') setCurrentStep('workType');
    else if (currentStep === 'registration') setCurrentStep('income');
  };

  const getProgress = () => {
    const steps = ['signup', 'workType', 'income', 'registration'];
    const index = steps.indexOf(currentStep);
    return ((index + 1) / steps.length) * 100;
  };

  const renderSignUp = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>bopp</Text>
        <Text style={styles.tagline}>Simple tax for side hustlers</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#64748B"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Create account</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWorkType = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>What's your side hustle?</Text>

      {workType !== 'other' ? (
        <>
          <OptionButton
            text="Content creation"
            icon="videocam"
            onPress={() => handleWorkTypeSelect('content_creation')}
          />
          <OptionButton
            text="Freelancing"
            icon="briefcase"
            onPress={() => handleWorkTypeSelect('freelancing')}
          />
          <OptionButton
            text="(Re)selling products"
            icon="cart"
            onPress={() => handleWorkTypeSelect('side_hustle')}
          />
          <OptionButton
            text="Other"
            icon="ellipsis-horizontal"
            onPress={() => handleWorkTypeSelect('other')}
          />
        </>
      ) : (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherLabel}>What do you do?</Text>
          <TextInput
            style={styles.input}
            value={customWorkType}
            onChangeText={setCustomWorkType}
            placeholder="e.g., dog walking, consulting"
            placeholderTextColor="#64748B"
            autoFocus
            onSubmitEditing={handleOtherSubmit}
          />
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !customWorkType.trim() && styles.buttonDisabled,
            ]}
            onPress={handleOtherSubmit}
            disabled={!customWorkType.trim()}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderIncome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>Tell us about your income</Text>

      <View style={styles.sliderSection}>
        <Text style={styles.sliderLabel}>Monthly income</Text>
        <Text style={styles.incomeDisplay}>{formatCurrency(monthlyIncome)}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={15000}
          step={100}
          value={monthlyIncome}
          onValueChange={setMonthlyIncome}
          minimumTrackTintColor="#7C3AED"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#FF6B6B"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>£0</Text>
          <Text style={styles.sliderLabelText}>£15k+</Text>
        </View>
      </View>

      <View style={styles.checkboxSection}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setReceivesGiftedItems(!receivesGiftedItems)}
        >
          <View style={[styles.checkboxBox, receivesGiftedItems && styles.checkboxBoxChecked]}>
            {receivesGiftedItems && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>I receive gifted items/products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setHasInternationalIncome(!hasInternationalIncome)}
        >
          <View style={[styles.checkboxBox, hasInternationalIncome && styles.checkboxBoxChecked]}>
            {hasInternationalIncome && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={styles.checkboxLabel}>I have international income</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleIncomeNext}>
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderRegistration = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>Are you registered with HMRC?</Text>

      <OptionButton
        text="Yes - Sole trader"
        icon="person"
        onPress={() => {
          setTrackingGoal('sole_trader');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionButton
        text="Yes - Limited company"
        icon="briefcase"
        onPress={() => {
          setTrackingGoal('limited_company');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionButton
        text="Not yet"
        icon="help-circle"
        onPress={() => {
          setTrackingGoal('not_registered');
          setTimeout(handleComplete, 300);
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {currentStep !== 'signup' && (
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${getProgress()}%` }]} />
            </View>
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 'signup' && renderSignUp()}
          {currentStep === 'workType' && renderWorkType()}
          {currentStep === 'income' && renderIncome()}
          {currentStep === 'registration' && renderRegistration()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface OptionButtonProps {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({ text, icon, onPress }) => (
  <TouchableOpacity style={styles.optionButton} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.optionContent}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={24} color="#FF6B6B" />
      </View>
      <Text style={styles.optionText}>{text}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#4B5563',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C3AED',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  formContainer: {
    gap: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: -8,
  },
  input: {
    backgroundColor: '#1F1333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  primaryButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  question: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 32,
  },
  optionButton: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2E1A47',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  otherInputContainer: {
    gap: 16,
  },
  otherLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  sliderSection: {
    marginBottom: 32,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  incomeDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: '#7C3AED',
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  checkboxSection: {
    gap: 16,
    marginBottom: 32,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
