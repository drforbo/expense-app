import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

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

type Screen = 'workType' | 'timeCommitment' | 'income' | 'goal' | 'personalizedGuide';

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

      console.log('🔍 FRONTEND - About to send:');
      console.log('   goalValue parameter:', goalValue);
      console.log('   workType:', customWorkType || workType);
      console.log('   timeCommitment:', timeCommitment);
      console.log('   monthlyIncome:', monthlyIncome);
      console.log('   receivesGiftedItems:', receivesGiftedItems);
      console.log('   hasInternationalIncome:', hasInternationalIncome);

      // Call your backend server
      const API_URL = 'http://192.168.1.129:3000';
      
      const payload = {
        workType: customWorkType || workType,
        timeCommitment,
        monthlyIncome,
        receivesGiftedItems,
        hasInternationalIncome,
        trackingGoal: goalValue,
      };

      console.log('📤 FRONTEND - Full payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${API_URL}/api/generate-guide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to generate guide');
      }

      const data = await response.json();
      const generatedGuide = data.guide;
      
      console.log('✅ FRONTEND - Received guide');
      setPersonalizedGuide(generatedGuide);
    } catch (err) {
      console.error('Error generating guide:', err);
      setGuideError('Unable to generate your personalized guide.');
      setPersonalizedGuide(getGenericGuide());
    } finally {
      setGuideLoading(false);
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
    const screens = ['workType', 'timeCommitment', 'income', 'goal', 'personalizedGuide'];
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
              minimumTrackTintColor="#7C3AED"
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor="#FF6B6B"
            />
            
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>£0</Text>
              <Text style={styles.sliderLabel}>£15k+</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.continueButton} onPress={handleIncomeNext}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
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
              style={[
                styles.yesNoButton,
                receivesGiftedItems === true && styles.yesNoButtonSelected,
              ]}
              onPress={() => handleGiftedItemsAnswer(true)}
            >
              <Text style={[
                styles.yesNoText,
                receivesGiftedItems === true && styles.yesNoTextSelected,
              ]}>
                Yes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.yesNoButton,
                receivesGiftedItems === false && styles.yesNoButtonSelected,
              ]}
              onPress={() => handleGiftedItemsAnswer(false)}
            >
              <Text style={[
                styles.yesNoText,
                receivesGiftedItems === false && styles.yesNoTextSelected,
              ]}>
                No
              </Text>
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
              style={[
                styles.yesNoButton,
                hasInternationalIncome === true && styles.yesNoButtonSelected,
              ]}
              onPress={() => handleInternationalAnswer(true)}
            >
              <Text style={[
                styles.yesNoText,
                hasInternationalIncome === true && styles.yesNoTextSelected,
              ]}>
                Yes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.yesNoButton,
                hasInternationalIncome === false && styles.yesNoButtonSelected,
              ]}
              onPress={() => handleInternationalAnswer(false)}
            >
              <Text style={[
                styles.yesNoText,
                hasInternationalIncome === false && styles.yesNoTextSelected,
              ]}>
                No
              </Text>
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
          <ActivityIndicator size="large" color="#7C3AED" />
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
      <ScrollView 
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
          <Text style={styles.guideText}>{personalizedGuide}</Text>
        </View>

        {guideError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {guideError}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.continueButton} onPress={handleGuideComplete}>
          <Text style={styles.continueButtonText}>Got it! Let's go</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.regenerateButton} 
          onPress={() => generatePersonalizedGuide(trackingGoal)}
        >
          <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.regenerateButtonText}>Regenerate guide</Text>
        </TouchableOpacity>
      </ScrollView>
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
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                  onSubmitEditing={handleOtherSubmit}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[
                    styles.otherSubmitButton,
                    !customWorkType.trim() && styles.otherSubmitButtonDisabled,
                  ]}
                  onPress={handleOtherSubmit}
                  disabled={!customWorkType.trim()}
                >
                  <Text style={styles.otherSubmitText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
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
              onPress={() => handleSelection('compliance')}
            />
            <OptionButton
              text="Yes - Limited company"
              icon="home"
              onPress={() => handleSelection('deductions')}
            />
            <OptionButton
              text="Not yet"
              icon="thumbs-up"
              onPress={() => handleSelection('tax_prep')}
            />
          </View>
        );

      case 'personalizedGuide':
        return renderPersonalizedGuide();

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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {currentScreen !== 'personalizedGuide' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${getProgressPercentage()}%` },
                ]}
              />
            </View>
          </View>
        )}

        {currentScreen === 'personalizedGuide' ? (
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
          <Ionicons name={icon} size={24} color="#FF6B6B" />
        </View>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionText}>{text}</Text>
          {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressBar: {
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
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  screenContainer: {
    paddingTop: 20,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 32,
    lineHeight: 36,
  },
  questionSubtext: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.6,
    marginBottom: 32,
    lineHeight: 24,
  },
  optionButton: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2E1A47',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  otherInputContainer: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 24,
  },
  otherLabel: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    fontWeight: '600',
  },
  otherInput: {
    backgroundColor: '#2E1A47',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  otherSubmitButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherSubmitButtonDisabled: {
    backgroundColor: '#4B5563',
    opacity: 0.5,
  },
  otherSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  incomeDisplay: {
    fontSize: 56,
    fontWeight: '900',
    color: '#7C3AED',
    marginBottom: 4,
  },
  incomeSubtext: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.6,
    marginBottom: 40,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.5,
  },
  continueButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  yesNoContainer: {
    gap: 16,
  },
  yesNoButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  yesNoButtonSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#FF6B6B',
  },
  yesNoText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.7,
  },
  yesNoTextSelected: {
    opacity: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#FFFFFF',
    fontSize: 16,
    opacity: 0.6,
    marginTop: 12,
    textAlign: 'center',
  },
  guideScrollView: {
    flex: 1,
  },
  guideScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  guideHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  guideEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  guideTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  guideSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
  },
  guideContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 26,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
  },
  regenerateButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  regenerateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.6,
  },
});