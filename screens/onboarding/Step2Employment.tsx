import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import {
  GradientContainer,
  ProgressBar,
  QuestionHeader,
  GlassButton,
  BackButton,
  DecorativeBlobs,
} from '../../lib/components';
import { spacing, colors } from '../../lib/theme';

interface Step2EmploymentProps {
  onNext: (employmentStatus: string) => void;
  onBack: () => void;
}

export const Step2Employment: React.FC<Step2EmploymentProps> = ({ onNext, onBack }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <ProgressBar progress={0.33} />
        <DecorativeBlobs />
        
        <View style={styles.content}>
          <View style={styles.questionSection}>
            <QuestionHeader question="You are hustling..." />
            
            <View style={styles.buttonGroup}>
              <GlassButton
                title="Alongside a full-time job"
                onPress={() => onNext('part_time')}
                variant="primary"
              />
              <GlassButton
                title="Full time (I'm self employed)"
                onPress={() => onNext('full_time')}
              />
            </View>
          </View>
          
          <BackButton onPress={onBack} />
        </View>
      </GradientContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepPurple,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl + spacing.lg,
  },
  questionSection: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonGroup: {
    marginTop: spacing.lg,
  },
});