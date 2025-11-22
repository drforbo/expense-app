import React, { useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { OnboardingStep, OptionCard, ContinueButton } from './OnboardingStep';
import { LinearGradient } from 'expo-linear-gradient';

interface Step7FirstCategorizationProps {
  onNext: (categorized: boolean) => void;
}

export const Step7FirstCategorization: React.FC<Step7FirstCategorizationProps> = ({ onNext }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // This would be a real transaction from their bank
  const sampleTransaction = {
    merchant: 'Amazon',
    amount: '£127.99',
    date: 'Nov 15, 2024',
    description: 'Ring Light & Microphone',
  };

  const categories = [
    {
      id: 'equipment',
      icon: '📸',
      title: 'Equipment',
      description: 'Cameras, lights, props - tools for content creation',
      isCorrect: true,
    },
    {
      id: 'marketing',
      icon: '📢',
      title: 'Marketing',
      description: 'Ads, promotions, brand building expenses',
      isCorrect: false,
    },
    {
      id: 'personal',
      icon: '🏠',
      title: 'Personal',
      description: 'Not business-related, not tax deductible',
      isCorrect: false,
    },
    {
      id: 'office',
      icon: '💼',
      title: 'Office Supplies',
      description: 'Stationery, software, workspace items',
      isCorrect: false,
    },
  ];

  return (
    <OnboardingStep
      step={7}
      totalSteps={9}
      title="Let's categorize your first expense"
      subtitle="This is how Bopp learns your spending patterns"
    >
      {/* Transaction card */}
      <View style={styles.transactionCard}>
        <LinearGradient
          colors={['rgba(124, 58, 237, 0.1)', 'rgba(255, 107, 107, 0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.transactionHeader}>
          <View>
            <Text style={styles.transactionMerchant}>{sampleTransaction.merchant}</Text>
            <Text style={styles.transactionDescription}>{sampleTransaction.description}</Text>
          </View>
          <Text style={styles.transactionAmount}>{sampleTransaction.amount}</Text>
        </View>
        <Text style={styles.transactionDate}>{sampleTransaction.date}</Text>
      </View>

      {/* Instruction */}
      <View style={styles.instructionBox}>
        <Text style={styles.instructionText}>
          👆 What did you buy this for?
        </Text>
      </View>

      {/* Category options */}
      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <OptionCard
            key={category.id}
            icon={category.icon}
            title={category.title}
            description={category.description}
            selected={selectedCategory === category.id}
            onSelect={() => setSelectedCategory(category.id)}
          />
        ))}
      </View>

      <View style={styles.buttonWrapper}>
        <ContinueButton
          onPress={() => selectedCategory && onNext(true)}
          disabled={!selectedCategory}
          text="Check Answer"
        />
      </View>
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  transactionCard: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionMerchant: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  transactionDescription: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  transactionAmount: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: '#7C3AED',
  },
  transactionDate: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  instructionBox: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  instructionText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoriesContainer: {
    marginBottom: 32,
  },
  buttonWrapper: {
    marginTop: 'auto',
  },
});