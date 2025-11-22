import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep, OptionCard, ContinueButton } from './OnboardingStep';

interface Step2EmploymentProps {
  onNext: (employment: string) => void;
}

export const Step2Employment: React.FC<Step2EmploymentProps> = ({ onNext }) => {
  const [selectedEmployment, setSelectedEmployment] = useState<string | null>(null);

  const options = [
    {
      id: 'self_employed',
      icon: '💪',
      title: 'Self-Employed',
      description: 'I work for myself, filing self-assessment tax returns',
    },
    {
      id: 'side_hustle',
      icon: '🌙',
      title: 'Side Hustle',
      description: 'I have a day job, but content is my side income',
    },
    {
      id: 'full_time_creator',
      icon: '💼',
      title: 'Full-Time Creator',
      description: 'This is my main job and sole source of income',
    },
    {
      id: 'not_sure',
      icon: '🤔',
      title: 'Not Sure Yet',
      description: 'I am still figuring out my employment status',
    },
  ];

  return (
    <OnboardingStep
      step={2}
      totalSteps={9}
      title="What's your work situation?"
      subtitle="This helps us understand your tax obligations"
    >
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <OptionCard
            key={option.id}
            icon={option.icon}
            title={option.title}
            description={option.description}
            selected={selectedEmployment === option.id}
            onSelect={() => setSelectedEmployment(option.id)}
          />
        ))}
      </View>

      <ContinueButton
        onPress={() => selectedEmployment && onNext(selectedEmployment)}
        disabled={!selectedEmployment}
      />
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  optionsContainer: {
    marginBottom: 8,
  },
});