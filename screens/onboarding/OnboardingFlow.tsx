import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  workType: string;
  customWorkType?: string;
  timeCommitment: string;
  incomeRange: string;
  trackingGoal: string;
}

type Screen = 'workType' | 'timeCommitment' | 'income' | 'goal';

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('workType');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  
  const [workType, setWorkType] = useState<string>('');
  const [customWorkType, setCustomWorkType] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [timeCommitment, setTimeCommitment] = useState<string>('');
  const [incomeRange, setIncomeRange] = useState<string>('');
  const [trackingGoal, setTrackingGoal] = useState<string>('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isTransitioning = useRef(false);

  const workTypeLabel = () => {
    if (workType === 'content_creation') return 'content';
    if (workType === 'freelancing') return 'freelance work';
    if (workType === 'side_hustle') return 'side income';
    if (workType === 'other' && customWorkType) return customWorkType;
    return 'work';
  };

  const handleSelection = (value: string, nextScreen?: Screen) => {
    if (isTransitioning.current) return;

    // Animate selection
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Set the value based on current screen
    if (currentScreen === 'workType') {
      if (value === 'other') {
        setWorkType(value);
        setShowOtherInput(true);
        return; // Don't progress yet
      }
      setWorkType(value);
    } else if (currentScreen === 'timeCommitment') {
      setTimeCommitment(value);
    } else if (currentScreen === 'income') {
      setIncomeRange(value);
    } else if (currentScreen === 'goal') {
      setTrackingGoal(value);
    }

    // Auto-progress after delay
    if (nextScreen) {
      setTimeout(() => {
        goToScreen(nextScreen);
      }, 300);
    }
  };

  const handleOtherSubmit = () => {
    if (customWorkType.trim() && !isTransitioning.current) {
      setWorkType('other');
      setTimeout(() => {
        goToScreen('timeCommitment');
      }, 300);
    }
  };

  const goToScreen = (screen: Screen) => {
    if (isTransitioning.current) return;
    
    isTransitioning.current = true;
    setScreenHistory([...screenHistory, currentScreen]);
    
    // Slide out animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentScreen(screen);
      slideAnim.setValue(width);
      
      // Slide in animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isTransitioning.current = false;
      });
    });
  };

  const goBack = () => {
    if (screenHistory.length === 0 || isTransitioning.current) return;

    isTransitioning.current = true;
    const previousScreen = screenHistory[screenHistory.length - 1];
    setScreenHistory(screenHistory.slice(0, -1));

    // Slide back animation (reverse direction)
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentScreen(previousScreen);
      slideAnim.setValue(-width);
      
      // Slide in from left
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isTransitioning.current = false;
      });

      // Reset "other" input state if going back to workType
      if (previousScreen === 'workType' && workType === 'other') {
        setShowOtherInput(false);
        setCustomWorkType('');
      }
    });
  };

  const handleComplete = () => {
    if (isTransitioning.current) return;
    
    const data: OnboardingData = {
      workType,
      customWorkType: workType === 'other' ? customWorkType : undefined,
      timeCommitment,
      incomeRange,
      trackingGoal,
    };
    onComplete(data);
  };

  useEffect(() => {
    if (currentScreen === 'goal' && trackingGoal && !isTransitioning.current) {
      // Auto-complete after goal selection
      setTimeout(() => {
        handleComplete();
      }, 500);
    }
  }, [trackingGoal, currentScreen]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'workType':
        return (
          <ScreenContainer>
            <QuestionText>What brings you to Bopp?</QuestionText>
            
            {!showOtherInput ? (
              <>
                <OptionButton
                  text="Content creation"
                  icon="videocam"
                  onPress={() => handleSelection('content_creation', 'timeCommitment')}
                  selected={workType === 'content_creation'}
                />
                <OptionButton
                  text="Freelancing"
                  icon="briefcase"
                  onPress={() => handleSelection('freelancing', 'timeCommitment')}
                  selected={workType === 'freelancing'}
                />
                <OptionButton
                  text="Side hustle"
                  icon="cash"
                  onPress={() => handleSelection('side_hustle', 'timeCommitment')}
                  selected={workType === 'side_hustle'}
                />
                <OptionButton
                  text="Other"
                  icon="ellipsis-horizontal"
                  onPress={() => handleSelection('other')}
                  selected={workType === 'other'}
                />
              </>
            ) : (
              <OtherInputContainer>
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
              </OtherInputContainer>
            )}
          </ScreenContainer>
        );

      case 'timeCommitment':
        return (
          <ScreenContainer>
            <QuestionText>How much time do you spend on this?</QuestionText>
            <OptionButton
              text="Full-time"
              subtitle="30+ hours/week"
              icon="time"
              onPress={() => handleSelection('full_time', 'income')}
              selected={timeCommitment === 'full_time'}
            />
            <OptionButton
              text="Part-time"
              subtitle="10-30 hours/week"
              icon="timer"
              onPress={() => handleSelection('part_time', 'income')}
              selected={timeCommitment === 'part_time'}
            />
            <OptionButton
              text="Side hustle"
              subtitle="Less than 10 hours/week"
              icon="hourglass"
              onPress={() => handleSelection('casual', 'income')}
              selected={timeCommitment === 'casual'}
            />
          </ScreenContainer>
        );

      case 'income':
        return (
          <ScreenContainer>
            <QuestionText>
              What's your monthly income from {workTypeLabel()}?
            </QuestionText>
            <OptionButton
              text="Under £500"
              icon="trending-down"
              onPress={() => handleSelection('0-500', 'goal')}
              selected={incomeRange === '0-500'}
            />
            <OptionButton
              text="£500 - £2,000"
              icon="stats-chart"
              onPress={() => handleSelection('500-2000', 'goal')}
              selected={incomeRange === '500-2000'}
            />
            <OptionButton
              text="£2,000 - £5,000"
              icon="trending-up"
              onPress={() => handleSelection('2000-5000', 'goal')}
              selected={incomeRange === '2000-5000'}
            />
            <OptionButton
              text="Over £5,000"
              icon="rocket"
              onPress={() => handleSelection('5000+', 'goal')}
              selected={incomeRange === '5000+'}
            />
          </ScreenContainer>
        );

      case 'goal':
        return (
          <ScreenContainer>
            <QuestionText>What's your main goal with Bopp?</QuestionText>
            <OptionButton
              text="Stay HMRC compliant"
              icon="shield-checkmark"
              onPress={() => handleSelection('compliance')}
              selected={trackingGoal === 'compliance'}
            />
            <OptionButton
              text="Maximize deductions"
              icon="wallet"
              onPress={() => handleSelection('deductions')}
              selected={trackingGoal === 'deductions'}
            />
            <OptionButton
              text="Understand my finances"
              icon="analytics"
              onPress={() => handleSelection('understanding')}
              selected={trackingGoal === 'understanding'}
            />
            <OptionButton
              text="Make tax season easier"
              icon="calendar"
              onPress={() => handleSelection('tax_prep')}
              selected={trackingGoal === 'tax_prep'}
            />
          </ScreenContainer>
        );

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
        {/* Header with back button */}
        {screenHistory.length > 0 && (
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    ((['workType', 'timeCommitment', 'income', 'goal'].indexOf(
                      currentScreen
                    ) +
                      1) /
                      4) *
                    100
                  }%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Animated content */}
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ translateX: slideAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          {renderScreen()}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ScreenContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <View style={styles.screenContainer}>{children}</View>;

const QuestionText: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <Text style={styles.questionText}>{children}</Text>;

interface OptionButtonProps {
  text: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  selected: boolean;
}

const OptionButton: React.FC<OptionButtonProps> = ({
  text,
  subtitle,
  icon,
  onPress,
  selected,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.optionButton, selected && styles.optionButtonSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionIconContainer}>
            <Ionicons
              name={icon}
              size={24}
              color={selected ? '#7C3AED' : '#FF6B6B'}
            />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={styles.optionText}>{text}</Text>
            {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={selected ? '#7C3AED' : '#9CA3AF'}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const OtherInputContainer: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <View style={styles.otherInputContainer}>{children}</View>;

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
    width: width,
  },
  screenContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 32,
    lineHeight: 36,
  },
  optionButton: {
    backgroundColor: '#1F1333',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#2E1A47',
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
});