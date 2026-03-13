import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { apiPost } from '../../lib/api';
import { colors, fonts, spacing, borderRadius, gradients } from '../../lib/theme';

const { width } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onBack?: () => void;
}

interface OnboardingData {
  workType: string;
  customWorkType?: string;
  timeCommitment: string;
  monthlyIncome: number;
  receivesGiftedItems: boolean;
  hasInternationalIncome: boolean;
  trackingGoal: string;
}

type Screen = 'workType' | 'timeCommitment' | 'income' | 'goal' | 'personalizedGuide' | 'howBoppHelps';

export default function OnboardingFlow({ onComplete, onBack }: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('workType');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);

  const [workType, setWorkType] = useState<string>('');
  const [customWorkType, setCustomWorkType] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [timeCommitment, setTimeCommitment] = useState<string>('');
  const [trackingGoal, setTrackingGoal] = useState<string>('');

  // Income question states
  const [incomeQuestionIndex, setIncomeQuestionIndex] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(1000);
  const [receivesGiftedItems, setReceivesGiftedItems] = useState<boolean | null>(null);
  const [hasInternationalIncome, setHasInternationalIncome] = useState<boolean | null>(null);

  // Personalized guide states
  const [personalizedGuide, setPersonalizedGuide] = useState('');
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState<string | null>(null);

  // bopp helps screen loading
  const [boppScreenLoading, setBoppScreenLoading] = useState(false);

  // Scroll refs
  const guideScrollRef = useRef<ScrollView>(null);
  const boppScrollRef = useRef<ScrollView>(null);

  // Animation refs
  const guideFadeAnim = useRef(new Animated.Value(0)).current;
  const boppFadeAnim = useRef(new Animated.Value(0)).current;

  const workTypeLabel = () => {
    if (workType === 'content_creation') return 'content';
    if (workType === 'freelancing') return 'freelance work';
    if (workType === 'side_hustle') return 'side income';
    if (workType === 'other' && customWorkType) return customWorkType;
    return 'work';
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `£${(value / 1000).toFixed(0)}k`;
    }
    return `£${value.toLocaleString()}`;
  };

  const generatePersonalizedGuide = async (goalValue: string) => {
    try {
      setGuideLoading(true);
      setGuideError(null);
      guideFadeAnim.setValue(0); // Reset animation

      console.log('🔍 FRONTEND - About to send:');
      console.log('   goalValue parameter:', goalValue);
      console.log('   workType:', customWorkType || workType);
      console.log('   timeCommitment:', timeCommitment);
      console.log('   monthlyIncome:', monthlyIncome);
      console.log('   receivesGiftedItems:', receivesGiftedItems);
      console.log('   hasInternationalIncome:', hasInternationalIncome);

      // Call your backend server
      const payload = {
        workType: customWorkType || workType,
        timeCommitment,
        monthlyIncome,
        receivesGiftedItems,
        hasInternationalIncome,
        trackingGoal: goalValue,
      };

      console.log('📤 FRONTEND - Full payload:', JSON.stringify(payload, null, 2));

      const data = await apiPost('/api/generate-guide', payload);
      const generatedGuide = data.guide;

      console.log('✅ FRONTEND - Received guide');

      // Add artificial delay to show loading state
      setTimeout(() => {
        setPersonalizedGuide(generatedGuide);
        setGuideLoading(false);

        // Start fade-in animation
        Animated.timing(guideFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();

        // Scroll to top when guide is loaded
        setTimeout(() => {
          guideScrollRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
      }, 1700);

    } catch (err) {
      console.error('Error generating guide:', err);
      setGuideError('Unable to generate your personalized guide.');
      setPersonalizedGuide(getGenericGuide());
      setGuideLoading(false);

      // Fade in even on error
      Animated.timing(guideFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  };

  const getGenericGuide = (): string => {
    return `Based on your profile, here's what you need to know:

- As a ${customWorkType || workType}, you'll need to register for Self Assessment with HMRC if you earn over £1,000/year.

- You can claim expenses for items you buy for your content - equipment, products, travel, and more. Keep all receipts!

${receivesGiftedItems ? '• Gifted items count as income! Track their value - HMRC considers them "payment in kind" and they\'re taxable.\n\n' : ''}${hasInternationalIncome ? '• International income needs special attention - you may need to declare it differently and watch for double taxation.\n\n' : ''}• Start tracking everything now. The earlier you build the habit, the easier tax season will be.

Ready to get started? Let's make tax simple.`;
  };

  const handleSelection = (value: string, nextScreen?: Screen) => {
    console.log('Selection:', value, 'Next screen:', nextScreen);

    if (currentScreen === 'workType') {
      if (value === 'other') {
        setWorkType(value);
        setShowOtherInput(true);
        return;
      }
      setWorkType(value);
    } else if (currentScreen === 'timeCommitment') {
      setTimeCommitment(value);
    } else if (currentScreen === 'goal') {
      console.log('🎯 GOAL SELECTED:', value);
      setTrackingGoal(value);
      setTimeout(() => {
        setScreenHistory([...screenHistory, currentScreen]);
        setCurrentScreen('personalizedGuide');
        console.log('🚀 Calling generatePersonalizedGuide with:', value);
        generatePersonalizedGuide(value);
      }, 300);
      return;
    }

    if (nextScreen) {
      setTimeout(() => {
        console.log('Moving to screen:', nextScreen);
        setScreenHistory([...screenHistory, currentScreen]);
        setCurrentScreen(nextScreen);
      }, 300);
    }
  };

  const handleOtherSubmit = () => {
    if (customWorkType.trim()) {
      setWorkType('other');
      setTimeout(() => {
        setScreenHistory([...screenHistory, currentScreen]);
        setCurrentScreen('timeCommitment');
      }, 300);
    }
  };

  const handleIncomeNext = () => {
    setIncomeQuestionIndex(1);
  };

  const handleGiftedItemsAnswer = (answer: boolean) => {
    setReceivesGiftedItems(answer);
    setTimeout(() => setIncomeQuestionIndex(2), 300);
  };

  const handleInternationalAnswer = (answer: boolean) => {
    setHasInternationalIncome(answer);
    setTimeout(() => {
      setScreenHistory([...screenHistory, currentScreen]);
      setCurrentScreen('goal');
      setIncomeQuestionIndex(0);
    }, 300);
  };

  const handleGuideComplete = () => {
    setBoppScreenLoading(true);
    boppFadeAnim.setValue(0); // Reset animation
    setScreenHistory([...screenHistory, currentScreen]);
    setCurrentScreen('howBoppHelps');

    // Simulate loading
    setTimeout(() => {
      setBoppScreenLoading(false);

      // Start fade-in animation
      Animated.timing(boppFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Scroll to top when loaded
      setTimeout(() => {
        boppScrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }, 1500);
  };

  const handleBoppComplete = async () => {
    const data: OnboardingData = {
      workType,
      customWorkType: workType === 'other' ? customWorkType : undefined,
      timeCommitment,
      monthlyIncome,
      receivesGiftedItems: receivesGiftedItems!,
      hasInternationalIncome: hasInternationalIncome!,
      trackingGoal,
    };
    console.log('Completing with data:', data);

    // Save profile to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('👤 Saving profile for user:', user.id);
        const { error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            work_type: data.workType,
            custom_work_type: data.customWorkType,
            time_commitment: data.timeCommitment,
            monthly_income: data.monthlyIncome,
            receives_gifted_items: data.receivesGiftedItems,
            has_international_income: data.hasInternationalIncome,
            tracking_goal: data.trackingGoal,
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('❌ Error saving profile:', error);
          Alert.alert('Warning', 'Profile saved locally but not synced to cloud');
        } else {
          console.log('✅ Profile saved to Supabase');
        }
      } else {
        console.log('⚠️  No authenticated user found - profile not saved');
      }
    } catch (error) {
      console.error('❌ Error in profile save:', error);
    }

    console.log('🏁 Calling onComplete with data');
    onComplete(data);
  };

  const goBack = () => {
    if (currentScreen === 'income' && incomeQuestionIndex > 0) {
      setIncomeQuestionIndex(incomeQuestionIndex - 1);
      return;
    }

    if (screenHistory.length === 0) {
      if (onBack) {
        onBack();
      }
      return;
    }

    const previousScreen = screenHistory[screenHistory.length - 1];
    setScreenHistory(screenHistory.slice(0, -1));
    setCurrentScreen(previousScreen);

    if (previousScreen === 'workType' && workType === 'other') {
      setShowOtherInput(false);
      setCustomWorkType('');
    }

    if (previousScreen === 'income') {
      setIncomeQuestionIndex(0);
    }
  };

  const getProgressPercentage = () => {
    const screens = ['workType', 'timeCommitment', 'income', 'goal', 'personalizedGuide', 'howBoppHelps'];
    let screenIndex = screens.indexOf(currentScreen);

    if (currentScreen === 'income') {
      const subProgress = incomeQuestionIndex / 3;
      return ((screenIndex + subProgress) / screens.length) * 100;
    }

    return ((screenIndex + 1) / screens.length) * 100;
  };

  const renderIncomeQuestions = () => {
    if (incomeQuestionIndex === 0) {
      return (
        <View style={styles.screenContainer}>
          <Text style={styles.questionText}>
            How much do you earn roughly per month?
          </Text>

          <View style={styles.sliderContainer}>
            <Text style={styles.incomeDisplay}>{formatCurrency(monthlyIncome)}</Text>
            <Text style={styles.incomeSubtext}>per month</Text>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={15000}
              step={100}
              value={monthlyIncome}
              onValueChange={setMonthlyIncome}
              minimumTrackTintColor={colors.gradientMid}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.gradientStart}
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>£0</Text>
              <Text style={styles.sliderLabel}>£15k+</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.continueButtonWrap} onPress={handleIncomeNext} activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if (incomeQuestionIndex === 1) {
      return (
        <View style={styles.screenContainer}>
          <Text style={styles.questionText}>
            Do you receive gifted items?
          </Text>

          <Text style={styles.questionSubtext}>
            Products or services you receive for free in exchange for content
          </Text>

          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={styles.yesNoButtonWrap}
              onPress={() => handleGiftedItemsAnswer(true)}
              activeOpacity={0.85}
            >
              {receivesGiftedItems === true ? (
                <LinearGradient
                  colors={gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.yesNoGradient}
                >
                  <Text style={styles.yesNoTextSelected}>Yes</Text>
                </LinearGradient>
              ) : (
                <View style={styles.yesNoUnselected}>
                  <Text style={styles.yesNoText}>Yes</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.yesNoButtonWrap}
              onPress={() => handleGiftedItemsAnswer(false)}
              activeOpacity={0.85}
            >
              {receivesGiftedItems === false ? (
                <LinearGradient
                  colors={gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.yesNoGradient}
                >
                  <Text style={styles.yesNoTextSelected}>No</Text>
                </LinearGradient>
              ) : (
                <View style={styles.yesNoUnselected}>
                  <Text style={styles.yesNoText}>No</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (incomeQuestionIndex === 2) {
      return (
        <View style={styles.screenContainer}>
          <Text style={styles.questionText}>
            Do you receive income or gifted items from businesses outside the UK?
          </Text>

          <Text style={styles.questionSubtext}>
            Sponsorships, affiliate income, or gifts from international companies
          </Text>

          <View style={styles.yesNoContainer}>
            <TouchableOpacity
              style={styles.yesNoButtonWrap}
              onPress={() => handleInternationalAnswer(true)}
              activeOpacity={0.85}
            >
              {hasInternationalIncome === true ? (
                <LinearGradient
                  colors={gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.yesNoGradient}
                >
                  <Text style={styles.yesNoTextSelected}>Yes</Text>
                </LinearGradient>
              ) : (
                <View style={styles.yesNoUnselected}>
                  <Text style={styles.yesNoText}>Yes</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.yesNoButtonWrap}
              onPress={() => handleInternationalAnswer(false)}
              activeOpacity={0.85}
            >
              {hasInternationalIncome === false ? (
                <LinearGradient
                  colors={gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.yesNoGradient}
                >
                  <Text style={styles.yesNoTextSelected}>No</Text>
                </LinearGradient>
              ) : (
                <View style={styles.yesNoUnselected}>
                  <Text style={styles.yesNoText}>No</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderPersonalizedGuide = () => {
    if (guideLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
          <Text style={styles.loadingText}>
            Creating your personalized guide...
          </Text>
          <Text style={styles.loadingSubtext}>
            Analyzing your profile to give you relevant tax insights
          </Text>
        </View>
      );
    }

    return (
      <Animated.View style={{ flex: 1, opacity: guideFadeAnim }}>
        <ScrollView
          ref={guideScrollRef}
          style={styles.guideScrollView}
          contentContainerStyle={styles.guideScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.guideHeader}>
            <Text style={styles.guideEmoji}>✨</Text>
            <Text style={styles.guideTitle}>Your Personalized Guide</Text>
            <Text style={styles.guideSubtitle}>
              Based on what you told us about your content business
            </Text>
          </View>

          <View style={styles.guideContainer}>
            <Markdown style={markdownStyles}>
              {personalizedGuide}
            </Markdown>
          </View>

          {guideError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {guideError}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.continueButtonWrap} onPress={handleGuideComplete} activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueButtonText}>How can bopp help?</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={() => generatePersonalizedGuide(trackingGoal)}
          >
            <Ionicons name="refresh" size={16} color={colors.midGrey} style={{ marginRight: 8 }} />
            <Text style={styles.regenerateButtonText}>Regenerate guide</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    );
  };

  const renderHowBoppHelps = () => {
    if (boppScreenLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gradientMid} />
          <Text style={styles.loadingText}>
            Personalizing your experience...
          </Text>
        </View>
      );
    }

    // trackingGoal now directly contains the business structure
    const businessStructure = trackingGoal;

    return (
      <Animated.View style={{ flex: 1, opacity: boppFadeAnim }}>
        <ScrollView
          ref={boppScrollRef}
          style={styles.guideScrollView}
          contentContainerStyle={styles.guideScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.guideHeader}>
            <Text style={styles.guideEmoji}>🚀</Text>
            <Text style={styles.guideTitle}>How bopp Helps You</Text>
            <Text style={styles.guideSubtitle}>
              Built specifically for {workType === 'content_creation' ? 'content creators' : 'people'} like you
            </Text>
          </View>

          <View style={styles.boppFeatureCard}>
            <Text style={styles.featureEmoji}>✨</Text>
            <Text style={styles.featureTitle}>Personalized for Your Work</Text>
            <Text style={styles.featureText}>
              {workType === 'content_creation'
                ? 'We know the difference between a Ring Light and a night out. bopp asks "what did you film?" not boring tax questions.'
                : 'bopp learns what you do and categorizes expenses automatically - no tax jargon required.'}
            </Text>
          </View>

          {receivesGiftedItems && (
            <View style={styles.boppFeatureCard}>
              <Text style={styles.featureEmoji}>🎁</Text>
              <Text style={styles.featureTitle}>Gifted Items Tracking</Text>
              <Text style={styles.featureText}>
                Track PR packages at retail value, then claim them back as expenses. We handle the math so you don't pay extra tax.
              </Text>
            </View>
          )}

          {hasInternationalIncome && (
            <View style={styles.boppFeatureCard}>
              <Text style={styles.featureEmoji}>🌍</Text>
              <Text style={styles.featureTitle}>International Income</Text>
              <Text style={styles.featureText}>
                Get paid by brands worldwide? We track it all and flag what needs declaring to HMRC.
              </Text>
            </View>
          )}

          <View style={styles.boppFeatureCard}>
            <Text style={styles.featureEmoji}>⚡</Text>
            <Text style={styles.featureTitle}>Connect Once, Done Forever</Text>
            <Text style={styles.featureText}>
              Link your bank and we automatically categorize every transaction. No more receipt shoebox hell.
            </Text>
          </View>

          {businessStructure === 'limited_company' && (
  <View style={styles.boppFeatureCard}>
    <Text style={styles.featureEmoji}>💼</Text>
    <Text style={styles.featureTitle}>Limited Company & Personal Tax</Text>
    <Text style={styles.featureText}>
      Bopp helps you track both your company expenses AND your personal income for Self Assessment. Get the full picture.
    </Text>
  </View>
)}

          <View style={styles.boppFeatureCard}>
            <Text style={styles.featureEmoji}>📊</Text>
            <Text style={styles.featureTitle}>Know Your Numbers</Text>
            <Text style={styles.featureText}>
              See how much to set aside for tax. We estimate high so you're never caught short.
            </Text>
          </View>

          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              {monthlyIncome < 2000
                ? '⚠️ Creators earning under £2k have been fined up to £1,200 for late filing'
                : monthlyIncome < 5000
                ? '⚠️ Creators earning £2-5k have been fined up to £3,000 for incorrect returns'
                : '⚠️ High earners have been fined over £10,000 for tax mistakes'}
            </Text>
          </View>

          <TouchableOpacity style={styles.continueButtonWrap} onPress={handleBoppComplete} activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.primary as unknown as string[]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueButtonText}>Try bopp</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </LinearGradient>
          </TouchableOpacity>


        </ScrollView>
      </Animated.View>
    );
  };

  const renderScreen = () => {
    console.log('Rendering screen:', currentScreen);

    switch (currentScreen) {
      case 'workType':
        return (
          <View style={styles.screenContainer}>
            <Text style={styles.questionText}>What is your hustle?</Text>

            {!showOtherInput ? (
              <>
                <OptionButton
                  text="Content creation"
                  icon="videocam"
                  onPress={() => handleSelection('content_creation', 'timeCommitment')}
                />
                <OptionButton
                  text="Freelancing"
                  icon="briefcase"
                  onPress={() => handleSelection('freelancing', 'timeCommitment')}
                />
                <OptionButton
                  text="(Re)selling products"
                  icon="shirt"
                  onPress={() => handleSelection('side_hustle', 'timeCommitment')}
                />
                <OptionButton
                  text="Other"
                  icon="ellipsis-horizontal"
                  onPress={() => handleSelection('other')}
                />
              </>
            ) : (
              <View style={styles.otherInputContainer}>
                <Text style={styles.otherLabel}>Tell us what you do:</Text>
                <TextInput
                  style={styles.otherInput}
                  value={customWorkType}
                  onChangeText={setCustomWorkType}
                  placeholder="e.g., dog walking, consulting"
                  placeholderTextColor={colors.muted}
                  autoFocus
                  onSubmitEditing={handleOtherSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={styles.otherSubmitWrap}
                  onPress={handleOtherSubmit}
                  disabled={!customWorkType.trim()}
                  activeOpacity={0.85}
                >
                  {!customWorkType.trim() ? (
                    <View style={[styles.otherSubmitDisabled]}>
                      <Text style={styles.otherSubmitTextDisabled}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color={colors.muted} />
                    </View>
                  ) : (
                    <LinearGradient
                      colors={gradients.primary as unknown as string[]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.otherSubmitGradient}
                    >
                      <Text style={styles.otherSubmitText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={20} color={colors.white} />
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'timeCommitment':
        return (
          <View style={styles.screenContainer}>
            <Text style={styles.questionText}>How much time do you spend on {workTypeLabel()}?</Text>
            <OptionButton
              text="Full-time"
              subtitle="30+ hours/week"
              icon="time"
              onPress={() => handleSelection('full_time', 'income')}
            />
            <OptionButton
              text="Part-time"
              subtitle="10-30 hours/week"
              icon="timer"
              onPress={() => handleSelection('part_time', 'income')}
            />
            <OptionButton
              text="Side hustle"
              subtitle="Less than 10 hours/week"
              icon="hourglass"
              onPress={() => handleSelection('casual', 'income')}
            />
          </View>
        );

      case 'income':
        return renderIncomeQuestions();

      case 'goal':
        return (
          <View style={styles.screenContainer}>
            <Text style={styles.questionText}>Are you registered?</Text>
            <OptionButton
              text="Yes - Sole trader"
              icon="person"
              onPress={() => handleSelection('sole_trader')}
            />
            <OptionButton
              text="Yes - Limited company"
              icon="briefcase"
              onPress={() => handleSelection('limited_company')}
            />
            <OptionButton
              text="Not yet"
              icon="help-circle"
              onPress={() => handleSelection('not_registered')}
            />
          </View>
        );

      case 'personalizedGuide':
        return renderPersonalizedGuide();

      case 'howBoppHelps':
        return renderHowBoppHelps();

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
        </View>

        {currentScreen !== 'personalizedGuide' && currentScreen !== 'howBoppHelps' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressTrack, { width: `${getProgressPercentage()}%` }]}>
                <LinearGradient
                  colors={gradients.primary as unknown as string[]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            </View>
          </View>
        )}

        {currentScreen === 'personalizedGuide' || currentScreen === 'howBoppHelps' ? (
          renderScreen()
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {renderScreen()}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface OptionButtonProps {
  text: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  text,
  subtitle,
  icon,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.optionButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View style={styles.optionIconContainer}>
          <Ionicons name={icon} size={24} color={colors.gradientMid} />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionText}>{text}</Text>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.midGrey} />
    </TouchableOpacity>
  );
};

// Markdown styles
const markdownStyles: any = {
  body: {
    color: colors.ink,
  },
  heading1: {
    color: colors.ink,
    fontSize: 24,
    fontFamily: fonts.display,
    marginTop: 0,
    marginBottom: 16,
  },
  heading2: {
    color: colors.gradientMid,
    fontSize: 18,
    fontFamily: fonts.display,
    marginTop: 20,
    marginBottom: 12,
  },
  paragraph: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
    fontFamily: fonts.body,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    flexDirection: 'row' as 'row',
    marginBottom: 8,
  },
  bullet_list_icon: {
    color: colors.ink,
    fontSize: 16,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: colors.ink,
    fontSize: 16,
    marginRight: 8,
  },
  bullet_list_content: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    fontFamily: fonts.body,
  },
  ordered_list_content: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    fontFamily: fonts.body,
  },
  strong: {
    fontFamily: fonts.bodyBold,
    color: colors.gradientMid,
  },
  em: {
    fontStyle: 'italic' as 'italic',
    color: colors.ink,
  },
  text: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fonts.body,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  progressTrack: {
    height: '100%',
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  screenContainer: {
    paddingTop: spacing.lg,
  },
  questionText: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.xl,
    lineHeight: 36,
  },
  questionSubtext: {
    fontSize: 16,
    color: colors.midGrey,
    marginBottom: spacing.xl,
    lineHeight: 24,
    fontFamily: fonts.body,
  },
  optionButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.ink,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  otherInputContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  otherLabel: {
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
    fontFamily: fonts.displaySemi,
  },
  otherInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 52,
    fontFamily: fonts.body,
  },
  otherSubmitWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  otherSubmitGradient: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  otherSubmitDisabled: {
    backgroundColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  otherSubmitText: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.white,
    marginRight: spacing.xs,
  },
  otherSubmitTextDisabled: {
    fontSize: 16,
    fontFamily: fonts.displaySemi,
    color: colors.muted,
    marginRight: spacing.xs,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  incomeDisplay: {
    fontSize: 56,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: 4,
  },
  incomeSubtext: {
    fontSize: 18,
    color: colors.midGrey,
    marginBottom: 40,
    fontFamily: fonts.body,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: 14,
    color: colors.midGrey,
    fontFamily: fonts.body,
  },
  continueButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  continueGradient: {
    paddingVertical: 18,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: fonts.display,
    marginRight: spacing.xs,
  },
  yesNoContainer: {
    gap: spacing.md,
  },
  yesNoButtonWrap: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  yesNoGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  yesNoUnselected: {
    backgroundColor: colors.background,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  yesNoText: {
    color: colors.ink,
    fontSize: 20,
    fontFamily: fonts.displaySemi,
    textAlign: 'center',
  },
  yesNoTextSelected: {
    color: colors.white,
    fontSize: 20,
    fontFamily: fonts.displaySemi,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: colors.ink,
    fontSize: 20,
    fontFamily: fonts.displaySemi,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: colors.midGrey,
    fontSize: 16,
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  guideScrollView: {
    flex: 1,
  },
  guideScrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  guideHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  guideEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  guideTitle: {
    fontSize: 32,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  guideSubtitle: {
    fontSize: 16,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: fonts.body,
  },
  guideContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  errorContainer: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.negative,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: fonts.body,
  },
  regenerateButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  regenerateButtonText: {
    color: colors.midGrey,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  boppFeatureCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  featureEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  featureText: {
    fontSize: 15,
    color: colors.midGrey,
    lineHeight: 22,
    fontFamily: fonts.body,
  },
  highlightBox: {
    backgroundColor: colors.tagExpenseBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  highlightText: {
    fontSize: 15,
    color: colors.gradientMid,
    fontFamily: fonts.displaySemi,
    textAlign: 'center',
    lineHeight: 22,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  skipButtonText: {
    color: colors.midGrey,
    fontSize: 14,
    fontFamily: fonts.body,
  },
});
