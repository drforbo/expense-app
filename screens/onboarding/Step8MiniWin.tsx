import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import {
  GradientContainer,
  GlassButton,
  DecorativeBlobs,
} from '../../lib/components';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface Step8MiniWinProps {
  totalSorted: number;
  remainingCount: number;
  onNext: () => void;
}

export const Step8MiniWin: React.FC<Step8MiniWinProps> = ({
  totalSorted,
  remainingCount,
  onNext,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <View style={styles.content}>
          <View style={styles.fireIcon}>
            <Text style={styles.fire}>🔥</Text>
          </View>
          
          <Text style={styles.header}>Day 1 complete!</Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>£{totalSorted.toFixed(2)}</Text>
              <Text style={styles.statLabel}>expenses sorted</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{remainingCount}</Text>
              <Text style={styles.statLabel}>more ready to go</Text>
            </View>
          </View>
          
          <View style={styles.streakCard}>
            <Text style={styles.streakEmoji}>⚡</Text>
            <Text style={styles.streakText}>
              Keep going to build your streak
            </Text>
          </View>
          
          <View style={styles.buttonContainer}>
            <GlassButton
              title="Keep going →"
              onPress={onNext}
              variant="primary"
            />
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
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  fireIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.glassWhite,
    borderWidth: 3,
    borderColor: colors.coral,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fire: {
    fontSize: 60,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.deepPurple,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.coral,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 13,
    color: colors.mediumGray,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: colors.glassBorder,
    marginHorizontal: spacing.md,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassWhite,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.electricViolet,
    padding: spacing.md,
  },
  streakEmoji: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
});