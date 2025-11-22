import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import { GradientContainer, DecorativeBlobs } from '../../lib/components';
import { colors, spacing } from '../../lib/theme';

interface Step6LoadingProps {
  onComplete: () => void;
}

export const Step6Loading: React.FC<Step6LoadingProps> = ({ onComplete }) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <View style={styles.content}>
          <Text style={styles.loadingText}>Finding your{'\n'}expenses...</Text>
          
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]}>
            <View style={styles.spinnerOuter} />
            <View style={styles.spinnerInner} />
          </Animated.View>
          
          <Text style={styles.subtext}>
            Analyzing your transactions with AI
          </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 36,
  },
  spinner: {
    width: 80,
    height: 80,
    marginBottom: spacing.xl,
    position: 'relative',
  },
  spinnerOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: colors.glassWhite,
    borderTopColor: colors.coral,
    borderRightColor: colors.electricViolet,
  },
  spinnerInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  subtext: {
    fontSize: 14,
    color: colors.mediumGray,
    textAlign: 'center',
  },
});