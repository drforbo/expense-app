import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import {
  GradientContainer,
  GlassButton,
  DecorativeBlobs,
} from '../../lib/components';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface UserData {
  userType: string;
  employmentStatus: string;
  income: string;
}

interface Step4QuickGuideProps {
  userData: UserData;
  onNext: () => void;
}

export const Step4QuickGuide: React.FC<Step4QuickGuideProps> = ({ userData, onNext }) => {
  const getTitle = () => {
    const typeLabels = {
      content_creator: 'content creator',
      reseller: 'reseller',
      freelancer: 'freelancer',
    };
    
    const employmentLabels = {
      part_time: 'alongside your job',
      full_time: 'full-time',
    };
    
    const incomeLabels = {
      over_1000: 'nearly earned £1000',
      nearly_1000: 'nearly earned £1000',
      over_12500: 'more than £12500',
      getting_started: "I'm just getting started",
    };
    
    return `As a ${typeLabels[userData.userType as keyof typeof typeLabels] || 'hustler'} ${employmentLabels[userData.employmentStatus as keyof typeof employmentLabels] || ''} who ${incomeLabels[userData.income as keyof typeof incomeLabels] || ''}`;
  };

  const getTasks = () => {
    const tasks = [];
    
    if (userData.income === 'over_1000' || userData.income === 'nearly_1000' || userData.income === 'over_12500') {
      tasks.push({
        title: 'Register with HMRC',
        description: 'You need to register as self-employed',
        urgent: userData.income === 'nearly_1000',
      });
    }
    
    tasks.push({
      title: 'Organise your expenses into person and business',
      description: '',
      urgent: false,
    });
    
    if (userData.income === 'over_1000' || userData.income === 'over_12500') {
      tasks.push({
        title: 'Submit tax return and pay tax on profit by 31st January 2026',
        description: '',
        urgent: false,
      });
    }
    
    return tasks;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.header}>The things you need to know</Text>
          
          <View style={styles.userSummary}>
            <Text style={styles.summaryText}>{getTitle()}</Text>
          </View>
          
          <Text style={styles.taskHeader}>You will need to...</Text>
          
          <View style={styles.taskList}>
            {getTasks().map((task, index) => (
              <View key={index} style={styles.taskCard}>
                <View style={styles.taskNumber}>
                  <Text style={styles.taskNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.description ? (
                    <Text style={styles.taskDescription}>{task.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.buttonContainer}>
            <GlassButton
              title="Let's get started →"
              onPress={onNext}
              variant="primary"
            />
          </View>
        </ScrollView>
      </GradientContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepPurple,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  userSummary: {
    backgroundColor: colors.glassWhite,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  summaryText: {
    fontSize: 15,
    color: colors.white,
    lineHeight: 22,
  },
  taskHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    marginBottom: spacing.md,
  },
  taskList: {
    marginBottom: spacing.xl,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: colors.deepPurple,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  taskNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.electricViolet,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  taskNumberText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 20,
  },
  taskDescription: {
    fontSize: 13,
    color: colors.mediumGray,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: spacing.md,
  },
});