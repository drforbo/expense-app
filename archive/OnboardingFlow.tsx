import React, { useState, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Step1UserType } from './onboarding/Step1UserType';
import { Step2Employment } from './onboarding/Step2Employment';
import { Step3Income } from './onboarding/Step3Income';
import { Step4QuickGuide } from './onboarding/Step4QuickGuide';
import { Step5ConnectBank } from './onboarding/Step5ConnectBank';
import { Step6Loading } from './onboarding/Step6Loading';
import { Step7FirstCategorization } from './onboarding/Step7FirstCategorization';
import { Step8MiniWin } from './onboarding/Step8MiniWin';
import { Step9Pricing } from './onboarding/Step9Pricing';

interface OnboardingData {
  userType?: string;
  employment?: string;
  income?: string;
  bankConnected?: boolean;
  firstExpenseCategorized?: boolean;
  plan?: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateTransition = (direction: 'forward' | 'backward') => {
    const toValue = direction === 'forward' ? -100 : 100;
    
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const goToNextStep = (stepData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...stepData }));
    animateTransition('forward');
    setCurrentStep((prev) => prev + 1);
  };

  const goToPreviousStep = () => {
    animateTransition('backward');
    setCurrentStep((prev) => prev - 1);
  };

  const handleComplete = (finalData: Partial<OnboardingData>) => {
    const completeData = { ...data, ...finalData };
    onComplete(completeData);
  };

  const renderStep = () => {
    const animatedStyle = {
      transform: [{ translateX: slideAnim }],
    };

    switch (currentStep) {
      case 1:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step1UserType onNext={(userType) => goToNextStep({ userType })} />
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step2Employment
              onNext={(employment) => goToNextStep({ employment })}
              onBack={goToPreviousStep}
            />
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step3Income
              onNext={(income) => goToNextStep({ income })}
              onBack={goToPreviousStep}
            />
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step4QuickGuide
              onNext={() => goToNextStep({})}
              onBack={goToPreviousStep}
            />
          </Animated.View>
        );
      case 5:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step5ConnectBank
              onNext={(bankConnected) => goToNextStep({ bankConnected })}
              onBack={goToPreviousStep}
            />
          </Animated.View>
        );
      case 6:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step6Loading
              onComplete={() => goToNextStep({})}
            />
          </Animated.View>
        );
      case 7:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step7FirstCategorization
              onNext={(categorized) =>
                goToNextStep({ firstExpenseCategorized: categorized })
              }
            />
          </Animated.View>
        );
      case 8:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step8MiniWin onNext={() => goToNextStep({})} />
          </Animated.View>
        );
      case 9:
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <Step9Pricing
              onNext={(plan) => handleComplete({ plan })}
            />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return <View style={styles.container}>{renderStep()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1419',
  },
  stepContainer: {
    flex: 1,
  },
});