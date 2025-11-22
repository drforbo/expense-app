import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep, OptionCard, ContinueButton } from './OnboardingStep';

interface Step1UserTypeProps {
  onNext: (userType: string) => void;
}

export const Step1UserType: React.FC<Step1UserTypeProps> = ({ onNext }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const options = [
    {
      id: 'content_creator',
      icon: '📸',
      title: 'Content Creator',
      description: 'I make content on Instagram, TikTok, or YouTube',
    },
    {
      id: 'influencer',
      icon: '⭐',
      title: 'Influencer',
      description: 'I partner with brands and monetize my audience',
    },
    {
      id: 'just_started',
      icon: '🚀',
      title: 'Just Getting Started',
      description: 'I am building my following and trying things out',
    },
    {
      id: 'other',
      icon: '💼',
      title: 'Other',
      description: 'Something else',
    },
  ];

  return (
    <OnboardingStep
      step={1}
      totalSteps={9}
      title="What do you do?"
      subtitle="Help us understand your situation"
    >
      {/* Options */}
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <OptionCard
            key={option.id}
            icon={option.icon}
            title={option.title}
            description={option.description}
            selected={selectedType === option.id}
            onSelect={() => setSelectedType(option.id)}
          />
        ))}
      </View>

      {/* Button */}
      <ContinueButton
        onPress={() => selectedType && onNext(selectedType)}
        disabled={!selectedType}
      />
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    marginBottom: 8,
  },
});