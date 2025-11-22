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
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  onBack?: () => void;
}

interface OnboardingData {
  workType: string;
  customWorkType?: string;
  timeCommitment: string;
  incomeRange: string;
  trackingGoal: string;
}

type Screen = 'workType' | 'timeCommitment' | 'income' | 'goal';

export default function OnboardingFlow({ onComplete, onBack }: OnboardingFlowProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('workType');
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  
  const [workType, setWorkType] = useState<string>('');
  const [customWorkType, setCustomWorkType] = useState<string>('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [timeCommitment, setTimeCommitment] = useState<string>('');
  const [incomeRange, setIncomeRange] = useState<string>('');
  const [trackingGoal, setTrackingGoal] = useState<string>('');

  const workTypeLabel = () => {
    if (workType === 'content_creation') return 'content';
    if (workType === 'freelancing') return 'freelance work';
    if (workType === 'side_hustle') return 'side income';
    if (workType === 'other' && customWorkType) return customWorkType;
    return 'work';
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
    } else if (currentScreen === 'income') {
      setIncomeRange(value);
    } else if (currentScreen === 'goal') {
      setTrackingGoal(value);
      setTimeout(() => {
        const data: OnboardingData = {
          workType,
          customWorkType: workType === 'other' ? customWorkType : undefined,
          timeCommitment,
          incomeRange,
          trackingGoal: value,
        };
        console.log('Completing with data:', data);
        onComplete(data);
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

  const goBack = () => {
    if (screenHistory.length === 0) {
      // First screen - go back to welcome if handler provided
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
                  text="Side hustle"
                  icon="cash"
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
        return (
          <View style={styles.screenContainer}>
            <Text style={styles.questionText}>
              What's your monthly income from {workTypeLabel()}?
            </Text>
            <OptionButton
              text="Under £500"
              icon="trending-down"
              onPress={() => handleSelection('0-500', 'goal')}
            />
            <OptionButton
              text="£500 - £2,000"
              icon="stats-chart"
              onPress={() => handleSelection('500-2000', 'goal')}
            />
            <OptionButton
              text="£2,000 - £5,000"
              icon="trending-up"
              onPress={() => handleSelection('2000-5000', 'goal')}
            />
            <OptionButton
              text="Over £5,000"
              icon="rocket"
              onPress={() => handleSelection('5000+', 'goal')}
            />
          </View>
        );

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
              text="Not yet (This is okay!)"
              icon="thumbs-up"
              onPress={() => handleSelection('tax_prep')}
            />
          </View>
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
        {/* Header with back button - always show */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

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

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {renderScreen()}
        </ScrollView>
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
});