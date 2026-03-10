import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, spacing, borderRadius, shadows } from '../../lib/theme';

const { width } = Dimensions.get('window');

interface QuickGuideProps {
  onComplete: () => void;
  onBack: () => void;
}

const GUIDE_STEPS = [
  {
    icon: 'camera' as const,
    title: 'Snap Your Receipts',
    description: 'Just take a photo of any expense. We\'ll automatically categorize it for HMRC.',
    color: colors.ember,
  },
  {
    icon: 'game-controller' as const,
    title: 'Gamified Tracking',
    description: 'Build streaks, earn badges, and level up by staying on top of your expenses.',
    color: colors.ink,
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Stay Compliant',
    description: 'We translate your spending into HMRC-compliant tax categories automatically.',
    color: colors.ember,
  },
  {
    icon: 'flash' as const,
    title: 'Tax Time Made Easy',
    description: 'Export everything you need for your self-assessment in seconds.',
    color: colors.ink,
  },
];

export default function QuickGuide({ onComplete, onBack }: QuickGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const handleDotPress = (index: number) => {
    setCurrentStep(index);
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {GUIDE_STEPS.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={step.icon} size={80} color={step.color} />
            </View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.paginationContainer}>
        {GUIDE_STEPS.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleDotPress(index)}
            style={[
              styles.dot,
              currentStep === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Next/Get Started button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentStep === GUIDE_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    ...shadows.sm,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.display,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    color: colors.midGrey,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: fonts.body,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.mist,
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.ink,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  nextButton: {
    backgroundColor: colors.ember,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontFamily: fonts.displaySemi,
    color: colors.white,
    marginRight: spacing.xs,
  },
});
