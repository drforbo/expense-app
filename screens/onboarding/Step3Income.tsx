import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, Text, Animated, TouchableOpacity } from 'react-native';
import { OnboardingStep, ContinueButton } from './OnboardingStep';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Step3IncomeProps {
  onNext: (income: string) => void;
}

export const Step3Income: React.FC<Step3IncomeProps> = ({ onNext }) => {
  const [income, setIncome] = useState('');
  const [selectedRange, setSelectedRange] = useState<string | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (income || selectedRange) {
      Animated.spring(glowAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  }, [income, selectedRange]);

  const ranges = [
    { id: 'under_10k', label: 'Under £10k', emoji: '🌱' },
    { id: '10k_30k', label: '£10k - £30k', emoji: '📈' },
    { id: '30k_50k', label: '£30k - £50k', emoji: '💪' },
    { id: 'over_50k', label: 'Over £50k', emoji: '🚀' },
    { id: 'prefer_not_say', label: 'Prefer not to say', emoji: '🤐' },
  ];

  const handleRangeSelect = (rangeId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedRange(rangeId);
    setIncome(''); // Clear manual input
  };

  return (
    <OnboardingStep
      step={3}
      totalSteps={9}
      title="What's your income from content?"
      subtitle="This helps us give you better tax advice"
    >
      {/* Custom input card */}
      <Animated.View
        style={[
          styles.inputCard,
          {
            borderColor: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(184, 255, 60, 0)', 'rgba(184, 255, 60, 0.5)'],
            }),
          },
        ]}
      >
        <Text style={styles.inputLabel}>Annual income</Text>
        <View style={styles.inputWrapper}>
          <Text style={styles.currencySymbol}>£</Text>
          <TextInput
            style={styles.input}
            value={income}
            onChangeText={(text) => {
              setIncome(text.replace(/[^0-9]/g, ''));
              setSelectedRange(null); // Clear range selection
            }}
            placeholder="0"
            placeholderTextColor="rgba(255, 255, 255, 0.3)"
            keyboardType="numeric"
            onFocus={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          />
        </View>
      </Animated.View>

      {/* Or divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or pick a range</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Range options */}
      <View style={styles.rangeContainer}>
        {ranges.map((range) => (
          <TouchableOpacity
            key={range.id}
            onPress={() => handleRangeSelect(range.id)}
            style={[
              styles.rangeChip,
              selectedRange === range.id && styles.rangeChipSelected,
            ]}
          >
            {selectedRange === range.id && (
              <LinearGradient
                colors={['rgba(184, 255, 60, 0.2)', 'rgba(143, 217, 38, 0.1)']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <Text style={styles.rangeEmoji}>{range.emoji}</Text>
            <Text
              style={[
                styles.rangeLabel,
                selectedRange === range.id && styles.rangeLabelSelected,
              ]}
            >
              {range.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonWrapper}>
        <ContinueButton
          onPress={() => onNext(income || selectedRange || '')}
          disabled={!income && !selectedRange}
        />
      </View>
    </OnboardingStep>
  );
};

const styles = StyleSheet.create({
  inputCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(184, 255, 60, 0)',
    padding: 24,
    marginBottom: 32,
  },
  inputLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 32,
    color: '#B8FF3C',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Outfit_700Bold',
    fontSize: 32,
    color: '#FFFFFF',
    padding: 0,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 16,
  },
  rangeContainer: {
    gap: 12,
    marginBottom: 32,
  },
  rangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  rangeChipSelected: {
    borderColor: '#B8FF3C',
  },
  rangeEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  rangeLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  rangeLabelSelected: {
    color: '#FFFFFF',
    fontFamily: 'Outfit_600SemiBold',
  },
  buttonWrapper: {
    marginTop: 'auto',
  },
});