import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { GradientContainer, GlassButton, DecorativeBlobs } from '../../lib/components';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface Transaction {
  name: string;
  amount: number;
  date: string;
}

interface Step7FirstCategorizationProps {
  transaction: Transaction;
  onNext: () => void;
}

export const Step7FirstCategorization: React.FC<Step7FirstCategorizationProps> = ({
  transaction,
  onNext,
}) => {
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState<'allowable' | 'personal' | null>(null);

  const handleAnswer = (answer: 'yes' | 'no') => {
    setAnswered(true);
    setResult(answer === 'yes' ? 'allowable' : 'personal');
    
    setTimeout(() => {
      onNext();
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <View style={styles.content}>
          {!answered ? (
            <>
              <View style={styles.topSection}>
                <Text style={styles.header}>Let's sort your{'\n'}first expense</Text>
                
                <View style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.merchantName}>{transaction.name}</Text>
                    <Text style={styles.amount}>£{transaction.amount.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.date}>{transaction.date}</Text>
                </View>
              </View>
              
              <View style={styles.bottomSection}>
                <Text style={styles.question}>
                  Will this product appear{'\n'}in your content?
                </Text>
                
                <View style={styles.buttonGroup}>
                  <GlassButton
                    title="Yes, it will"
                    onPress={() => handleAnswer('yes')}
                    variant="primary"
                  />
                  <GlassButton
                    title="No, personal purchase"
                    onPress={() => handleAnswer('no')}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.resultContainer}>
              <View style={[
                styles.resultIcon,
                result === 'allowable' ? styles.successIcon : styles.personalIcon
              ]}>
                <Text style={styles.resultEmoji}>
                  {result === 'allowable' ? '✓' : '👤'}
                </Text>
              </View>
              
              <Text style={styles.resultHeader}>
                {result === 'allowable' ? 'Sorted!' : 'Got it!'}
              </Text>
              
              <Text style={styles.resultText}>
                This is{' '}
                <Text style={styles.resultBold}>
                  {result === 'allowable' 
                    ? 'allowable (business expense)' 
                    : 'personal (not allowable)'}
                </Text>
              </Text>
              
              {result === 'allowable' && (
                <View style={styles.savingsCard}>
                  <Text style={styles.savingsText}>
                    You'll save ~£{(transaction.amount * 0.2).toFixed(2)} in tax 💰
                  </Text>
                </View>
              )}
            </View>
          )}
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
  topSection: {
    alignItems: 'center',
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 36,
  },
  transactionCard: {
    backgroundColor: colors.deepPurple,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    width: '100%',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.coral,
  },
  date: {
    fontSize: 13,
    color: colors.mediumGray,
  },
  question: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 30,
  },
  buttonGroup: {
    marginTop: spacing.md,
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    backgroundColor: colors.success,
  },
  personalIcon: {
    backgroundColor: colors.mediumGray,
  },
  resultEmoji: {
    fontSize: 50,
    color: colors.white,
  },
  resultHeader: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  resultText: {
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  resultBold: {
    fontWeight: '700',
    color: colors.coral,
  },
  savingsCard: {
    backgroundColor: colors.glassWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.xl,
  },
  savingsText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    textAlign: 'center',
  },
});