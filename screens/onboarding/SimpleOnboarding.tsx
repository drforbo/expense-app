import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

interface SimpleOnboardingProps {
  onComplete: () => void;
}

type Step = 'signup' | 'workType' | 'income' | 'giftedItems' | 'registration' | 'employment' | 'studentLoan';
type AuthMode = 'login' | 'signup';

export default function SimpleOnboarding({ onComplete }: SimpleOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>('signup');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [loading, setLoading] = useState(false);

  // Auth fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile fields
  const [workType, setWorkType] = useState<string>('');
  const [customWorkType, setCustomWorkType] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(1000);
  const [receivesGiftedItems, setReceivesGiftedItems] = useState(false);
  const [trackingGoal, setTrackingGoal] = useState<string>('');
  const [hasOtherEmployment, setHasOtherEmployment] = useState<boolean | null>(null);
  const [employmentIncome, setEmploymentIncome] = useState(30000);
  const [studentLoanPlan, setStudentLoanPlan] = useState<string>('none');

  const formatCurrency = (value: number) => {
    return `£${value.toLocaleString()}`;
  };

  const incrementTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startIncrement = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, step: number, min: number) => {
    const doStep = () => {
      setter(prev => Math.max(min, prev + step));
    };
    doStep();
    let delay = 200;
    const accelerate = () => {
      incrementTimerRef.current = setTimeout(() => {
        doStep();
        delay = Math.max(50, delay - 20);
        accelerate();
      }, delay);
    };
    accelerate();
  }, []);

  const stopIncrement = useCallback(() => {
    if (incrementTimerRef.current) {
      clearTimeout(incrementTimerRef.current);
      incrementTimerRef.current = null;
    }
  }, []);

  const handleCurrencyInput = (text: string, setter: React.Dispatch<React.SetStateAction<number>>) => {
    const digits = text.replace(/[^0-9]/g, '');
    setter(digits ? parseInt(digits, 10) : 0);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) throw error;

      if (data.user) {
        console.log('✅ User logged in:', data.user.id);
        // User already has profile, complete onboarding
        onComplete();
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      Alert.alert('Login failed', error.message || 'Please check your credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
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
        options: {
          data: { first_name: firstName.trim(), last_name: lastName.trim() },
        },
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
    setCurrentStep('giftedItems');
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
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          work_type: workType,
          custom_work_type: workType === 'other' ? customWorkType : null,
          time_commitment: 'full_time', // Default
          monthly_income: monthlyIncome,
          receives_gifted_items: receivesGiftedItems,
          has_international_income: false, // Default - can be updated in profile
          tracking_goal: trackingGoal,
          has_other_employment: hasOtherEmployment,
          employment_income: hasOtherEmployment ? employmentIncome : null,
          student_loan_plan: studentLoanPlan,
          profile_completed: false, // Must be set to true via Profile screen
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
    else if (currentStep === 'giftedItems') setCurrentStep('income');
    else if (currentStep === 'registration') setCurrentStep('giftedItems');
    else if (currentStep === 'employment') {
      setHasOtherEmployment(null);
      setCurrentStep('registration');
    }
    else if (currentStep === 'studentLoan') setCurrentStep('employment');
  };

  const getProgress = () => {
    const steps = ['signup', 'workType', 'income', 'giftedItems', 'registration', 'employment', 'studentLoan'];
    const index = steps.indexOf(currentStep);
    return ((index + 1) / steps.length) * 100;
  };

  const renderSignUp = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>bopp</Text>
        <Text style={styles.tagline}>Simple tax for side hustlers</Text>
      </View>

      {/* Auth mode toggle */}
      <View style={styles.authToggle}>
        <TouchableOpacity
          style={[styles.authToggleButton, authMode === 'signup' && styles.authToggleButtonActive]}
          onPress={() => setAuthMode('signup')}
        >
          <Text style={[styles.authToggleText, authMode === 'signup' && styles.authToggleTextActive]}>
            Sign up
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.authToggleButton, authMode === 'login' && styles.authToggleButtonActive]}
          onPress={() => setAuthMode('login')}
        >
          <Text style={[styles.authToggleText, authMode === 'login' && styles.authToggleTextActive]}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        {authMode === 'signup' && (
          <>
            <Text style={styles.inputLabel}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={colors.midGrey}
              autoCapitalize="words"
              autoComplete="given-name"
            />

            <Text style={styles.inputLabel}>Last name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={colors.midGrey}
              autoCapitalize="words"
              autoComplete="family-name"
            />
          </>
        )}

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="your@email.com"
          placeholderTextColor={colors.midGrey}
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
            placeholder={authMode === 'signup' ? 'At least 6 characters' : 'Your password'}
            placeholderTextColor={colors.midGrey}
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
              color={colors.midGrey}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={authMode === 'signup' ? handleSignUp : handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {authMode === 'signup' ? 'Create account' : 'Log in'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
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
            placeholderTextColor={colors.midGrey}
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
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderIncome = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>What's your monthly income?</Text>
      <Text style={styles.questionSubtitle}>From your side hustle, before tax</Text>

      <View style={styles.currencyInputSection}>
        <TouchableOpacity
          style={styles.incrementButton}
          onPressIn={() => startIncrement(setMonthlyIncome, -100, 0)}
          onPressOut={stopIncrement}
          activeOpacity={0.6}
        >
          <Ionicons name="remove" size={28} color={colors.ink} />
        </TouchableOpacity>

        <View style={styles.currencyFieldContainer}>
          <Text style={styles.currencyPrefix}>£</Text>
          <TextInput
            style={styles.currencyInput}
            value={monthlyIncome > 0 ? monthlyIncome.toLocaleString() : ''}
            onChangeText={(text) => handleCurrencyInput(text, setMonthlyIncome)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.midGrey}
          />
        </View>

        <TouchableOpacity
          style={styles.incrementButton}
          onPressIn={() => startIncrement(setMonthlyIncome, 100, 0)}
          onPressOut={stopIncrement}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={28} color={colors.ink} />
        </TouchableOpacity>
      </View>

      <Text style={styles.incrementHint}>Tap or hold to adjust by £100</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={handleIncomeNext}>
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  const renderGiftedItems = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>Do you receive gifted items?</Text>
      <Text style={styles.questionSubtitle}>
        Gifted items such as PR packages count as income. This helps us track your tax accurately.
      </Text>

      <OptionButton
        text="Yes, I receive gifted items"
        icon="gift"
        onPress={() => {
          setReceivesGiftedItems(true);
          setTimeout(() => setCurrentStep('registration'), 300);
        }}
      />
      <OptionButton
        text="No"
        icon="close-circle-outline"
        onPress={() => {
          setReceivesGiftedItems(false);
          setTimeout(() => setCurrentStep('registration'), 300);
        }}
      />
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
          setTimeout(() => setCurrentStep('employment'), 300);
        }}
      />
      <OptionButton
        text="Yes - Limited company"
        icon="briefcase"
        onPress={() => {
          setTrackingGoal('limited_company');
          setTimeout(() => setCurrentStep('employment'), 300);
        }}
      />
      <OptionButton
        text="Not yet"
        icon="help-circle"
        onPress={() => {
          setTrackingGoal('not_registered');
          setTimeout(() => setCurrentStep('employment'), 300);
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.ember} />
        </View>
      )}
    </View>
  );

  const renderEmployment = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>Is this your only income?</Text>
      <Text style={styles.questionSubtitle}>This helps us calculate your tax more accurately</Text>

      <OptionButton
        text="Yes, just my side hustle"
        icon="cash"
        onPress={() => {
          setHasOtherEmployment(false);
          setTimeout(() => setCurrentStep('studentLoan'), 300);
        }}
      />
      <OptionButton
        text="No, I also have a day job"
        icon="business"
        onPress={() => {
          setHasOtherEmployment(true);
        }}
      />

      {hasOtherEmployment === true && (
        <View style={styles.employmentIncomeContainer}>
          <Text style={styles.sliderLabel}>Approximate yearly salary (before tax)</Text>

          <View style={styles.currencyInputSection}>
            <TouchableOpacity
              style={styles.incrementButton}
              onPressIn={() => startIncrement(setEmploymentIncome, -1000, 0)}
              onPressOut={stopIncrement}
              activeOpacity={0.6}
            >
              <Ionicons name="remove" size={28} color={colors.ink} />
            </TouchableOpacity>

            <View style={styles.currencyFieldContainer}>
              <Text style={styles.currencyPrefix}>£</Text>
              <TextInput
                style={styles.currencyInput}
                value={employmentIncome > 0 ? employmentIncome.toLocaleString() : ''}
                onChangeText={(text) => handleCurrencyInput(text, setEmploymentIncome)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.midGrey}
              />
            </View>

            <TouchableOpacity
              style={styles.incrementButton}
              onPressIn={() => startIncrement(setEmploymentIncome, 1000, 0)}
              onPressOut={stopIncrement}
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={28} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <Text style={styles.incrementHint}>Tap or hold to adjust by £1,000</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setCurrentStep('studentLoan')}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStudentLoan = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.question}>Do you have a student loan?</Text>
      <Text style={styles.questionSubtitle}>This affects your take-home pay calculations</Text>

      <OptionButton
        text="No student loan"
        icon="school-outline"
        onPress={() => {
          setStudentLoanPlan('none');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionButton
        text="Plan 1 (started before 2012)"
        icon="school"
        onPress={() => {
          setStudentLoanPlan('plan1');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionButton
        text="Plan 2 (started 2012 or later)"
        icon="school"
        onPress={() => {
          setStudentLoanPlan('plan2');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionButton
        text="Plan 4 (Scotland)"
        icon="school"
        onPress={() => {
          setStudentLoanPlan('plan4');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionButton
        text="Postgraduate loan"
        icon="library"
        onPress={() => {
          setStudentLoanPlan('postgrad');
          setTimeout(handleComplete, 300);
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.ember} />
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
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
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
          {currentStep === 'giftedItems' && renderGiftedItems()}
          {currentStep === 'registration' && renderRegistration()}
          {currentStep === 'employment' && renderEmployment()}
          {currentStep === 'studentLoan' && renderStudentLoan()}
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
        <Ionicons name={icon} size={24} color={colors.ember} />
      </View>
      <Text style={styles.optionText}>{text}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.md,
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
    backgroundColor: colors.mist,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.ink,
    borderRadius: borderRadius.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.xs,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  authToggle: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
    gap: 4,
    ...shadows.sm,
  },
  authToggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  authToggleButtonActive: {
    backgroundColor: colors.ink,
  },
  authToggleText: {
    fontSize: 15,
    fontFamily: fonts.displaySemi,
    color: colors.midGrey,
  },
  authToggleTextActive: {
    color: colors.white,
  },
  formContainer: {
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: -8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 2,
    borderColor: 'transparent',
    fontFamily: fonts.body,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  passwordToggle: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    padding: 4,
  },
  primaryButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: fonts.display,
    color: colors.white,
  },
  question: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  questionSubtitle: {
    fontSize: 15,
    color: colors.midGrey,
    marginBottom: spacing.lg,
    fontFamily: fonts.body,
  },
  employmentIncomeContainer: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  optionButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.parchment,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
  },
  otherInputContainer: {
    gap: spacing.md,
  },
  otherLabel: {
    fontSize: 16,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.midGrey,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
  },
  currencyInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  incrementButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  currencyFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minWidth: 180,
    justifyContent: 'center',
    ...shadows.sm,
  },
  currencyPrefix: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.ink,
  },
  currencyInput: {
    fontSize: 36,
    fontFamily: fonts.display,
    color: colors.ink,
    minWidth: 60,
    textAlign: 'center',
    padding: 0,
  },
  incrementHint: {
    fontSize: 13,
    color: colors.midGrey,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  checkboxSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  checkboxLabel: {
    fontSize: 16,
    color: colors.ink,
    flex: 1,
    fontFamily: fonts.body,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245, 242, 236, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tax residency styles
  optionButtonSelected: {
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.parchment,
  },
  optionSubtext: {
    fontSize: 13,
    color: colors.midGrey,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  foreignCountriesSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  foreignCountriesLabel: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: 4,
  },
  foreignCountriesHint: {
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
  },
  countryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  countryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.parchment,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: spacing.xs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countryChipSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.white,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryName: {
    fontSize: 14,
    fontFamily: fonts.displayMed,
    color: colors.midGrey,
  },
  countryNameSelected: {
    color: colors.ink,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipLinkText: {
    fontSize: 15,
    color: colors.midGrey,
    fontFamily: fonts.displayMed,
  },
  noticeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.ember,
    ...shadows.sm,
  },
  noticeTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  noticeText: {
    fontSize: 15,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.xs,
    fontFamily: fonts.body,
  },
  helpNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: 4,
    gap: spacing.xs,
  },
  helpNoteText: {
    fontSize: 13,
    color: colors.midGrey,
    flex: 1,
    lineHeight: 18,
    fontFamily: fonts.body,
  },
});
