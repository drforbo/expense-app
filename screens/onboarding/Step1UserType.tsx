import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import {
  GradientContainer,
  Logo,
  QuestionHeader,
  GlassButton,
  DecorativeBlobs,
} from '../../lib/components';
import { spacing, colors } from '../../lib/theme';

interface Step1UserTypeProps {
  onNext: (userType: string) => void;
}

export const Step1UserType: React.FC<Step1UserTypeProps> = ({ onNext }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <View style={styles.content}>
          <Logo />
          
          <View style={styles.questionSection}>
            <QuestionHeader question="I'm a..." />
            
            <View style={styles.buttonGroup}>
              <GlassButton
                title="Content creator"
                onPress={() => onNext('content_creator')}
                variant="primary"
              />
              <GlassButton
                title="Reselling (Vinted/eBay)"
                onPress={() => onNext('reseller')}
              />
              <GlassButton
                title="Freelancing"
                onPress={() => onNext('freelancer')}
              />
            </View>
          </View>
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
    justifyContent: 'space-evenly',
    paddingVertical: spacing.xl,
  },
  questionSection: {
    flex: 1,
    justifyContent: 'center',
  },
  buttonGroup: {
    marginTop: spacing.lg,
  },
});