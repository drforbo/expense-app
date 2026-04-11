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
import { colors, fonts, spacing, borderRadius } from '../../lib/theme';

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
          <View style={[styles.authTogglePill, authMode === 'signup' && styles.authTogglePillActive]}>
            <Text style={[styles.authToggleText, authMode === 'signup' && styles.authToggleTextActive]}>Sign up</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.authToggleButton}
          onPress={() => setAuthMode('login')}
        >
          <View style={[styles.authTogglePill, authMode === 'login' && styles.authTogglePillActive]}>
            <Text style={[styles.authToggleText, authMode === 'login' && styles.authToggleTextActive]}>Log in</Text>
          </View>
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
                placeholderTextColor={colors.nightMuted}
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
                placeholderTextColor={colors.nightMuted}
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
            placeholderTextColor={colors.nightMuted}
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
            placeholderTextColor={colors.nightMuted}
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
              color={colors.nightMuted}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, loading && styles.buttonDisabled]}
          onPress={authMode === 'signup' ? handleSignUp : handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.night} />
          ) : (
            <Text style={styles.ctaButtonText}>
              {authMode === 'signup' ? "let's go \u2192" : "log in \u2192"}
            </Text>
          )}
        </TouchableOpacity>
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
              placeholderTextColor={colors.nightMuted}
              autoFocus
              onSubmitEditing={handleOtherSubmit}
            />
          </View>
          <TouchableOpacity
            style={[styles.ctaButton, !customWorkType.trim() && styles.buttonDisabled]}
            onPress={handleOtherSubmit}
            disabled={!customWorkType.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>that's me {'\u2192'}</Text>
          </TouchableOpacity>
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
          placeholderTextColor={colors.nightMuted}
          autoFocus
          onSubmitEditing={handleJobRoleNext}
        />
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, !jobRole.trim() && styles.buttonDisabled]}
        onPress={handleJobRoleNext}
        disabled={!jobRole.trim()}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaButtonText}>that's me {'\u2192'}</Text>
      </TouchableOpacity>
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
            placeholderTextColor={colors.nightMuted}
            autoFocus={index === 0}
          />
        </View>
      ))}

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleMainClientsNext}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaButtonText}>that's me {'\u2192'}</Text>
      </TouchableOpacity>

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
          <Ionicons name="remove" size={28} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.currencyFieldContainer}>
          <Text style={styles.currencyPrefix}>£</Text>
          <TextInput
            style={styles.currencyInput}
            value={monthlyIncome > 0 ? monthlyIncome.toLocaleString() : ''}
            onChangeText={(text) => handleCurrencyInput(text, setMonthlyIncome)}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={colors.nightMuted}
          />
        </View>

        <TouchableOpacity
          style={styles.incrementButton}
          onPressIn={() => startIncrement(setMonthlyIncome, 100, 0)}
          onPressOut={stopIncrement}
          activeOpacity={0.6}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      </View>

      <Text style={styles.incrementHint}>Tap or hold to adjust by £100</Text>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleIncomeNext}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaButtonText}>that's me {'\u2192'}</Text>
      </TouchableOpacity>
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
          <ActivityIndicator size="large" color={colors.ember} />
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
              <Ionicons name="remove" size={28} color={colors.white} />
            </TouchableOpacity>

            <View style={styles.currencyFieldContainer}>
              <Text style={styles.currencyPrefix}>£</Text>
              <TextInput
                style={styles.currencyInput}
                value={employmentIncome > 0 ? employmentIncome.toLocaleString() : ''}
                onChangeText={(text) => handleCurrencyInput(text, setEmploymentIncome)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.nightMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.incrementButton}
              onPressIn={() => startIncrement(setEmploymentIncome, 1000, 0)}
              onPressOut={stopIncrement}
              activeOpacity={0.6}
            >
              <Ionicons name="add" size={28} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.incrementHint}>Tap or hold to adjust by £1,000</Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => setCurrentStep('studentLoan')}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>that's me {'\u2192'}</Text>
          </TouchableOpacity>
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
          <ActivityIndicator size="large" color={colors.ember} />
        </View>
      )}
    </View>
  );

  const activeSegments = getProgressSegments();

  return (
    <SafeAreaView style={styles.container}>
      {/* Glowing orb effect */}
      <View style={styles.orbContainer} pointerEvents="none">
        <View style={styles.orbOuter} />
        <View style={styles.orbMiddle} />
        <View style={styles.orbInner} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {currentStep !== 'signup' && (
          <View style={styles.header}>
            {/* Back button */}
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>{'\u2190'}</Text>
            </TouchableOpacity>

            {/* Progress dots - 3 segments */}
            <View style={styles.progressBarContainer}>
              {[1, 2, 3].map((seg) => (
                <View
                  key={seg}
                  style={[
                    styles.progressDot,
                    seg <= activeSegments && styles.progressDotActive,
                  ]}
                />
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
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text style={styles.optionText}>{text}</Text>
      {selected ? (
        <View style={styles.optionCheckCircleFilled}>
          <Text style={styles.optionCheckMark}>{'\u2713'}</Text>
        </View>
      ) : (
        <View style={styles.optionCheckCircleEmpty} />
      )}
    </TouchableOpacity>
  );
};

// --- Legacy OptionButton interface kept for type compat but unused ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.night,
  },

  // Liquid gradient orb glow
  orbContainer: {
    position: 'absolute',
    top: -120,
    left: '50%',
    marginLeft: -200,
    width: 400,
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbOuter: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(156,62,24,0.06)',
  },
  orbMiddle: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(254,136,92,0.08)',
  },
  orbInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(72,85,162,0.12)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.nightFaint,
  },
  progressDotActive: {
    backgroundColor: colors.primaryContainer,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: 120,
  },
  stepHeader: {
    marginBottom: 28,
  },
  stepLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primaryContainer,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroHeading: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.white,
    letterSpacing: -1.5,
    lineHeight: 48,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.nightMuted,
    marginTop: 4,
    lineHeight: 22,
  },
  stepContainer: {
    flex: 1,
  },

  // --- Sign up screen ---
  logoContainer: {
    alignItems: 'center',
    marginTop: 56,
    marginBottom: 56,
  },
  logo: {
    fontSize: 52,
    fontFamily: fonts.display,
    color: colors.white,
    marginBottom: spacing.sm,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: colors.nightMuted,
    fontFamily: fonts.body,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Auth toggle
  authToggle: {
    flexDirection: 'row',
    backgroundColor: colors.nightGlass,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: 28,
    gap: 4,
  },
  authToggleButton: {
    flex: 1,
  },
  authTogglePill: {
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  authTogglePillActive: {
    backgroundColor: colors.white,
  },
  authToggleText: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.nightMuted,
  },
  authToggleTextActive: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.night,
  },

  // Form
  formContainer: {
    gap: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.nightMuted,
    marginBottom: -4,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    backgroundColor: colors.nightGlass,
    borderRadius: borderRadius.md,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: colors.white,
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

  // White CTA button — pill shape
  ctaButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.full,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  ctaButtonText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.night,
    letterSpacing: -0.3,
  },
  buttonDisabled: {
    opacity: 0.4,
  },

  // Option cards — glass effect, pill-like radius
  optionCard: {
    borderRadius: borderRadius.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    backgroundColor: colors.nightGlass,
  },
  optionCardSelected: {
    backgroundColor: 'rgba(254,136,92,0.12)',
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionText: {
    flex: 1,
    fontFamily: fonts.displayMed,
    fontSize: 15,
    color: colors.white,
  },
  optionCheckCircleEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  optionCheckCircleFilled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCheckMark: {
    color: colors.white,
    fontWeight: '900',
    fontSize: 12,
  },

  // Other / custom input
  otherInputContainer: {
    gap: spacing.md,
  },
  otherLabel: {
    fontSize: 15,
    color: colors.nightMuted,
    fontFamily: fonts.body,
  },

  // Currency input
  currencyInputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    marginTop: 28,
  },
  incrementButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.nightGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.nightGlass,
    borderRadius: borderRadius.lg,
    paddingHorizontal: 24,
    paddingVertical: spacing.lg,
    minWidth: 180,
    justifyContent: 'center',
  },
  currencyPrefix: {
    fontSize: 40,
    fontFamily: fonts.display,
    color: colors.white,
    letterSpacing: -2,
  },
  currencyInput: {
    fontSize: 40,
    fontFamily: fonts.display,
    color: colors.white,
    minWidth: 60,
    textAlign: 'center',
    padding: 0,
    letterSpacing: -2,
  },
  incrementHint: {
    fontSize: 12,
    color: colors.nightMuted,
    fontFamily: fonts.body,
    textAlign: 'center',
    marginBottom: 36,
    letterSpacing: 0.3,
  },

  // Employment income inline
  employmentIncomeContainer: {
    marginTop: 28,
    backgroundColor: colors.nightGlass,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.nightMuted,
    marginBottom: spacing.md,
    fontFamily: fonts.body,
  },

  // Skip button
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  skipButtonText: {
    fontSize: 14,
    color: colors.nightMuted,
    fontFamily: fonts.body,
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 28, 46, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
