import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    color: '#FF6B6B',
  },
  {
    icon: 'game-controller' as const,
    title: 'Gamified Tracking',
    description: 'Build streaks, earn badges, and level up by staying on top of your expenses.',
    color: '#7C3AED',
  },
  {
    icon: 'shield-checkmark' as const,
    title: 'Stay Compliant',
    description: 'We translate your spending into HMRC-compliant tax categories automatically.',
    color: '#FF6B6B',
  },
  {
    icon: 'flash' as const,
    title: 'Tax Time Made Easy',
    description: 'Export everything you need for your self-assessment in seconds.',
    color: '#7C3AED',
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
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
            <View style={[styles.iconCircle, { backgroundColor: '#1F1333' }]}>
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
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F1333',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#7C3AED',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  nextButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
});