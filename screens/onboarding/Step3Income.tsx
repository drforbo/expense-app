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

interface Step3IncomeProps {
  onNext: (income: string) => void;
  onBack: () => void;
}

export const Step3Income: React.FC<Step3IncomeProps> = ({ onNext, onBack }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <ProgressBar progress={0.66} />
        <DecorativeBlobs />
        
        <View style={styles.content}>
          <View style={styles.questionSection}>
            <QuestionHeader question="You've hustled..." />
            
            <View style={styles.buttonGroup}>
              <GlassButton
                title="More than £1000"
                onPress={() => onNext('over_1000')}
              />
              <GlassButton
                title="Nearly £1000"
                onPress={() => onNext('nearly_1000')}
              />
              <GlassButton
                title="More than £12500"
                onPress={() => onNext('over_12500')}
              />
              <GlassButton
                title="I'm just getting started"
                onPress={() => onNext('getting_started')}
                variant="primary"
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