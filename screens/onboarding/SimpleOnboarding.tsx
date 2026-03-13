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
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

interface SimpleOnboardingProps {
  onComplete: () => void;
}

type Step = 'signup' | 'workType' | 'jobRole' | 'mainClients' | 'workLocation' | 'income' | 'giftedItems' | 'bankAccounts' | 'registration' | 'employment' | 'studentLoan';
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
  const [bankAccountCount, setBankAccountCount] = useState(1);
  const [jobRole, setJobRole] = useState('');
  const [mainClients, setMainClients] = useState(['', '', '']);
  const [workLocation, setWorkLocation] = useState('');

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
    setTimeout(() => setCurrentStep('jobRole'), 300);
  };

  const handleOtherSubmit = () => {
    if (!customWorkType.trim()) return;
    setWorkType('other');
    setTimeout(() => setCurrentStep('jobRole'), 300);
  };

  const handleJobRoleNext = () => {
    setCurrentStep('mainClients');
  };

  const handleMainClientsNext = () => {
    setCurrentStep('workLocation');
  };

  const handleWorkLocationSelect = (location: string) => {
    setWorkLocation(location);
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
          bank_account_count: bankAccountCount,
          job_role: jobRole.trim() || null,
          main_clients: mainClients.filter(c => c.trim()).map(c => c.trim()),
          work_location: workLocation || 'home',
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
    else if (currentStep === 'jobRole') setCurrentStep('workType');
    else if (currentStep === 'mainClients') setCurrentStep('jobRole');
    else if (currentStep === 'workLocation') setCurrentStep('mainClients');
    else if (currentStep === 'income') setCurrentStep('workLocation');
    else if (currentStep === 'giftedItems') setCurrentStep('income');
    else if (currentStep === 'bankAccounts') setCurrentStep('giftedItems');
    else if (currentStep === 'registration') setCurrentStep('bankAccounts');
    else if (currentStep === 'employment') {
      setHasOtherEmployment(null);
      setCurrentStep('registration');
    }
    else if (currentStep === 'studentLoan') setCurrentStep('employment');
  };

  const getProgress = () => {
    const steps = ['signup', 'workType', 'jobRole', 'mainClients', 'workLocation', 'income', 'giftedItems', 'bankAccounts', 'registration', 'employment', 'studentLoan'];
    const index = steps.indexOf(currentStep);
    return ((index + 1) / steps.length) * 100;
  };

  // Determine how many progress segments to fill (out of 3) based on step
  const getProgressSegments = () => {
    const steps: Step[] = ['signup', 'workType', 'jobRole', 'mainClients', 'workLocation', 'income', 'giftedItems', 'bankAccounts', 'registration', 'employment', 'studentLoan'];
    const index = steps.indexOf(currentStep);
    // Map 11 steps into 3 segments
    if (index <= 3) return 1;
    if (index <= 7) return 2;
    return 3;
  };

  const getStepLabel = () => {
    const segments = getProgressSegments();
    return `${segments} OF 3`;
  };

  // Step-specific hero headings and subtitles
  const getStepHeading = (): string => {
    switch (currentStep) {
      case 'workType': return `what's your\nside\nhustle? 💅`;
      case 'jobRole': return `what do\nyou\nactually do? 💼`;
      case 'mainClients': return `who pays\nyou? 💰`;
      case 'workLocation': return `where do\nyou\nwork? 🏠`;
      case 'income': return `how much\ndo you\nearn? 💷`;
      case 'giftedItems': return `do you get\nfree\nstuff? 🎁`;
      case 'bankAccounts': return `how many\nbank\naccounts? 🏦`;
      case 'registration': return `are you\nregistered? 📝`;
      case 'employment': return `is this your\nonly\nincome? 👀`;
      case 'studentLoan': return `student\nloan? 🎓`;
      default: return '';
    }
  };

  const getStepSubtitle = (): string => {
    switch (currentStep) {
      case 'workType': return 'pick everything that applies';
      case 'jobRole': return 'helps us categorize your expenses';
      case 'mainClients': return 'helps us spot your income automatically';
      case 'workLocation': return 'affects which expenses are deductible';
      case 'income': return 'from your side hustle, before tax';
      case 'giftedItems': return 'PR packages count as taxable income';
      case 'bankAccounts': return 'where you receive income or pay expenses';
      case 'registration': return 'your HMRC status';
      case 'employment': return 'helps us calculate your tax accurately';
      case 'studentLoan': return 'affects your take-home pay';
      default: return '';
    }
  };

  const renderSignUp = () => (
    <View style={styles.stepContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>bopp.</Text>
        <Text style={styles.tagline}>Taxes hit different when{'\n'}they actually make sense.</Text>
      </View>

      {/* Auth mode toggle */}
      <View style={styles.authToggle}>
        <TouchableOpacity
          style={styles.authToggleButton}
          onPress={() => setAuthMode('signup')}
        >
          {authMode === 'signup' ? (
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.authTogglePill}
            >
              <Text style={styles.authToggleTextActive}>Sign up</Text>
            </LinearGradient>
          ) : (
            <View style={styles.authTogglePill}>
              <Text style={styles.authToggleText}>Sign up</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.authToggleButton}
          onPress={() => setAuthMode('login')}
        >
          {authMode === 'login' ? (
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.authTogglePill}
            >
              <Text style={styles.authToggleTextActive}>Log in</Text>
            </LinearGradient>
          ) : (
            <View style={styles.authTogglePill}>
              <Text style={styles.authToggleText}>Log in</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        {authMode === 'signup' && (
          <>
            <Text style={styles.inputLabel}>First name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                autoComplete="given-name"
              />
            </View>

            <Text style={styles.inputLabel}>Last name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={colors.muted}
                autoCapitalize="words"
                autoComplete="family-name"
              />
            </View>
          </>
        )}

        <Text style={styles.inputLabel}>Email</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        <Text style={styles.inputLabel}>Password</Text>
        <View style={[styles.inputWrapper, styles.passwordContainer]}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            value={password}
            onChangeText={setPassword}
            placeholder={authMode === 'signup' ? 'At least 6 characters' : 'Your password'}
            placeholderTextColor={colors.muted}
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
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={gradients.primary as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientButton, loading && styles.buttonDisabled]}
        >
          <TouchableOpacity
            style={styles.gradientButtonInner}
            onPress={authMode === 'signup' ? handleSignUp : handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.gradientButtonText}>
                {authMode === 'signup' ? "let's go \u2192" : "log in \u2192"}
              </Text>
            )}
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );

  const renderWorkType = () => (
    <View style={styles.stepContainer}>
      {workType !== 'other' ? (
        <>
          <OptionCard
            emoji="🎥"
            text="Content creation"
            selected={workType === 'content_creation'}
            onPress={() => handleWorkTypeSelect('content_creation')}
          />
          <OptionCard
            emoji="💼"
            text="Freelancing"
            selected={workType === 'freelancing'}
            onPress={() => handleWorkTypeSelect('freelancing')}
          />
          <OptionCard
            emoji="🛒"
            text="(Re)selling products"
            selected={workType === 'side_hustle'}
            onPress={() => handleWorkTypeSelect('side_hustle')}
          />
          <OptionCard
            emoji="✨"
            text="Other"
            selected={workType === 'other'}
            onPress={() => handleWorkTypeSelect('other')}
          />
        </>
      ) : (
        <View style={styles.otherInputContainer}>
          <Text style={styles.otherLabel}>What do you do?</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={customWorkType}
              onChangeText={setCustomWorkType}
              placeholder="e.g., dog walking, consulting"
              placeholderTextColor={colors.muted}
              autoFocus
              onSubmitEditing={handleOtherSubmit}
            />
          </View>
          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientButton, !customWorkType.trim() && styles.buttonDisabled]}
          >
            <TouchableOpacity
              style={styles.gradientButtonInner}
              onPress={handleOtherSubmit}
              disabled={!customWorkType.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.gradientButtonText}>that's me {'\u2192'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );

  const renderJobRole = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={jobRole}
          onChangeText={setJobRole}
          placeholder="e.g., freelance photographer, UGC creator"
          placeholderTextColor={colors.muted}
          autoFocus
          onSubmitEditing={handleJobRoleNext}
        />
      </View>

      <LinearGradient
        colors={gradients.primary as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientButton, !jobRole.trim() && styles.buttonDisabled]}
      >
        <TouchableOpacity
          style={styles.gradientButtonInner}
          onPress={handleJobRoleNext}
          disabled={!jobRole.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.gradientButtonText}>that's me {'\u2192'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderMainClients = () => (
    <View style={styles.stepContainer}>
      {mainClients.map((client, index) => (
        <View key={index} style={[styles.inputWrapper, { marginBottom: spacing.sm }]}>
          <TextInput
            style={styles.input}
            value={client}
            onChangeText={(text) => {
              const updated = [...mainClients];
              updated[index] = text;
              setMainClients(updated);
            }}
            placeholder={index === 0 ? 'e.g., Nike' : index === 1 ? 'e.g., Gymshark' : 'e.g., Agency name'}
            placeholderTextColor={colors.muted}
            autoFocus={index === 0}
          />
        </View>
      ))}

      <LinearGradient
        colors={gradients.primary as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <TouchableOpacity
          style={styles.gradientButtonInner}
          onPress={handleMainClientsNext}
          activeOpacity={0.8}
        >
          <Text style={styles.gradientButtonText}>that's me {'\u2192'}</Text>
        </TouchableOpacity>
      </LinearGradient>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleMainClientsNext}
      >
        <Text style={styles.skipButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );

  const renderWorkLocation = () => (
    <View style={styles.stepContainer}>
      <OptionCard emoji="🏠" text="From home" selected={workLocation === 'home'} onPress={() => handleWorkLocationSelect('home')} />
      <OptionCard emoji="🏢" text="Rented office" selected={workLocation === 'office'} onPress={() => handleWorkLocationSelect('office')} />
      <OptionCard emoji="👥" text="Co-working space" selected={workLocation === 'coworking'} onPress={() => handleWorkLocationSelect('coworking')} />
      <OptionCard emoji="📍" text="Client sites" selected={workLocation === 'client_sites'} onPress={() => handleWorkLocationSelect('client_sites')} />
      <OptionCard emoji="🚗" text="On the road" selected={workLocation === 'on_the_road'} onPress={() => handleWorkLocationSelect('on_the_road')} />
      <OptionCard emoji="🔀" text="Mixed / varies" selected={workLocation === 'mixed'} onPress={() => handleWorkLocationSelect('mixed')} />
    </View>
  );

  const renderIncome = () => (
    <View style={styles.stepContainer}>
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
            placeholderTextColor={colors.muted}
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

      <LinearGradient
        colors={gradients.primary as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientButton}
      >
        <TouchableOpacity
          style={styles.gradientButtonInner}
          onPress={handleIncomeNext}
          activeOpacity={0.8}
        >
          <Text style={styles.gradientButtonText}>that's me {'\u2192'}</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderGiftedItems = () => (
    <View style={styles.stepContainer}>
      <OptionCard
        emoji="🎁"
        text="Yes, I receive gifted items"
        selected={receivesGiftedItems === true}
        onPress={() => {
          setReceivesGiftedItems(true);
          setTimeout(() => setCurrentStep('bankAccounts'), 300);
        }}
      />
      <OptionCard
        emoji="❌"
        text="No"
        selected={receivesGiftedItems === false && currentStep === 'giftedItems'}
        onPress={() => {
          setReceivesGiftedItems(false);
          setTimeout(() => setCurrentStep('bankAccounts'), 300);
        }}
      />
    </View>
  );

  const renderBankAccounts = () => (
    <View style={styles.stepContainer}>
      {[1, 2, 3, 4, 5].map(n => (
        <OptionCard
          key={n}
          emoji={n === 1 ? '💳' : '💰'}
          text={n === 5 ? '5 or more' : `${n}`}
          selected={bankAccountCount === n}
          onPress={() => {
            setBankAccountCount(n);
            setTimeout(() => setCurrentStep('registration'), 300);
          }}
        />
      ))}
    </View>
  );

  const renderRegistration = () => (
    <View style={styles.stepContainer}>
      <OptionCard
        emoji="👤"
        text="Yes - Sole trader"
        selected={trackingGoal === 'sole_trader'}
        onPress={() => {
          setTrackingGoal('sole_trader');
          setTimeout(() => setCurrentStep('employment'), 300);
        }}
      />
      <OptionCard
        emoji="🏢"
        text="Yes - Limited company"
        selected={trackingGoal === 'limited_company'}
        onPress={() => {
          setTrackingGoal('limited_company');
          setTimeout(() => setCurrentStep('employment'), 300);
        }}
      />
      <OptionCard
        emoji="❓"
        text="Not yet"
        selected={trackingGoal === 'not_registered'}
        onPress={() => {
          setTrackingGoal('not_registered');
          setTimeout(() => setCurrentStep('employment'), 300);
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
        </View>
      )}
    </View>
  );

  const renderEmployment = () => (
    <View style={styles.stepContainer}>
      <OptionCard
        emoji="💸"
        text="Yes, just my side hustle"
        selected={hasOtherEmployment === false}
        onPress={() => {
          setHasOtherEmployment(false);
          setTimeout(() => setCurrentStep('studentLoan'), 300);
        }}
      />
      <OptionCard
        emoji="🏢"
        text="No, I also have a day job"
        selected={hasOtherEmployment === true}
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
                placeholderTextColor={colors.muted}
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

          <LinearGradient
            colors={gradients.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <TouchableOpacity
              style={styles.gradientButtonInner}
              onPress={() => setCurrentStep('studentLoan')}
              activeOpacity={0.8}
            >
              <Text style={styles.gradientButtonText}>that's me {'\u2192'}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );

  const renderStudentLoan = () => (
    <View style={styles.stepContainer}>
      <OptionCard
        emoji="❌"
        text="No student loan"
        selected={studentLoanPlan === 'none' && currentStep === 'studentLoan'}
        onPress={() => {
          setStudentLoanPlan('none');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionCard
        emoji="🎓"
        text="Plan 1 (started before 2012)"
        selected={studentLoanPlan === 'plan1'}
        onPress={() => {
          setStudentLoanPlan('plan1');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionCard
        emoji="🎓"
        text="Plan 2 (started 2012 or later)"
        selected={studentLoanPlan === 'plan2'}
        onPress={() => {
          setStudentLoanPlan('plan2');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionCard
        emoji="🏴󠁧󠁢󠁳󠁣󠁴󠁿"
        text="Plan 4 (Scotland)"
        selected={studentLoanPlan === 'plan4'}
        onPress={() => {
          setStudentLoanPlan('plan4');
          setTimeout(handleComplete, 300);
        }}
      />
      <OptionCard
        emoji="📚"
        text="Postgraduate loan"
        selected={studentLoanPlan === 'postgrad'}
        onPress={() => {
          setStudentLoanPlan('postgrad');
          setTimeout(handleComplete, 300);
        }}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
        </View>
      )}
    </View>
  );

  const activeSegments = getProgressSegments();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {currentStep !== 'signup' && (
          <View style={styles.header}>
            {/* Back button */}
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>{'\u2190'}</Text>
            </TouchableOpacity>

            {/* Progress bar - 3 segments */}
            <View style={styles.progressBarContainer}>
              {[1, 2, 3].map((seg) => (
                seg <= activeSegments ? (
                  <LinearGradient
                    key={seg}
                    colors={['#FF8C00', '#FF4500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.progressSegmentActive}
                  />
                ) : (
                  <View key={seg} style={styles.progressSegmentInactive} />
                )
              ))}
            </View>
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step header for non-signup steps */}
          {currentStep !== 'signup' && (
            <View style={styles.stepHeader}>
              <Text style={styles.stepLabel}>{getStepLabel()}</Text>
              <Text style={styles.heroHeading}>{getStepHeading()}</Text>
              {getStepSubtitle() ? (
                <Text style={styles.heroSubtitle}>{getStepSubtitle()}</Text>
              ) : null}
            </View>
          )}

          {currentStep === 'signup' && renderSignUp()}
          {currentStep === 'workType' && renderWorkType()}
          {currentStep === 'jobRole' && renderJobRole()}
          {currentStep === 'mainClients' && renderMainClients()}
          {currentStep === 'workLocation' && renderWorkLocation()}
          {currentStep === 'income' && renderIncome()}
          {currentStep === 'giftedItems' && renderGiftedItems()}
          {currentStep === 'bankAccounts' && renderBankAccounts()}
          {currentStep === 'registration' && renderRegistration()}
          {currentStep === 'employment' && renderEmployment()}
          {currentStep === 'studentLoan' && renderStudentLoan()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- OptionCard component (replaces OptionButton) ---

interface OptionCardProps {
  emoji: string;
  text: string;
  selected: boolean;
  onPress: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({ emoji, text, selected, onPress }) => {
  if (selected) {
    return (
      <LinearGradient
        colors={gradients.primary as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.optionCardGradient}
      >
        <TouchableOpacity style={styles.optionCardInner} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.optionEmoji}>{emoji}</Text>
          <Text style={[styles.optionText, styles.optionTextSelected]}>{text}</Text>
          <View style={styles.optionCheckCircleFilled}>
            <Text style={styles.optionCheckMark}>{'\u2713'}</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <TouchableOpacity style={styles.optionCard} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text style={styles.optionText}>{text}</Text>
      <View style={styles.optionCheckCircleEmpty} />
    </TouchableOpacity>
  );
};

// --- Legacy OptionButton interface kept for type compat but unused ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
  },
  progressSegmentActive: {
    flex: 1,
    height: 3,
    borderRadius: 9999,
  },
  progressSegmentInactive: {
    flex: 1,
    height: 3,
    borderRadius: 9999,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: spacing.lg,
    paddingBottom: 100,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepLabel: {
    fontFamily: fonts.displaySemi,
    fontSize: 10,
    color: '#FF4500',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 38,
    color: colors.ink,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.midGrey,
    marginTop: 4,
  },
  stepContainer: {
    flex: 1,
  },

  // --- Sign up screen ---
  logoContainer: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 48,
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
    textAlign: 'center',
  },

  // Auth toggle
  authToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  authToggleButton: {
    flex: 1,
  },
  authTogglePill: {
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  authToggleText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
  },
  authToggleTextActive: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },

  // Form
  formContainer: {
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.midGrey,
    marginBottom: -4,
  },
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.ink,
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
    right: 14,
    top: 14,
    padding: 4,
  },

  // Gradient CTA button
  gradientButton: {
    borderRadius: 9999,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  gradientButtonInner: {
    paddingVertical: 17,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientButtonText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
    letterSpacing: -0.3,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Option cards
  optionCard: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 9,
    backgroundColor: colors.background,
  },
  optionCardGradient: {
    borderRadius: 16,
    marginBottom: 9,
  },
  optionCardInner: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.ink,
  },
  optionTextSelected: {
    color: colors.white,
  },
  optionCheckCircleEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionCheckCircleFilled: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckMark: {
    color: '#FF4500',
    fontWeight: '900',
    fontSize: 11,
  },

  // Other / custom input
  otherInputContainer: {
    gap: spacing.md,
  },
  otherLabel: {
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },

  // Currency input
  currencyInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    marginTop: 24,
  },
  incrementButton: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: spacing.lg,
    minWidth: 180,
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.ink,
    letterSpacing: -2,
  },
  currencyInput: {
    fontSize: 38,
    fontFamily: fonts.display,
    color: colors.ink,
    minWidth: 60,
    textAlign: 'center',
    padding: 0,
    letterSpacing: -2,
  },
  incrementHint: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.2,
  },

  // Employment income inline
  employmentIncomeContainer: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 20,
  },
  sliderLabel: {
    fontSize: 13,
    color: colors.midGrey,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
  },

  // Skip button
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
