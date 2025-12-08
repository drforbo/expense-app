import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const USER_TYPES = [
  'content creators',
  'influencers',
  'freelancers',
  'coaches',
  'hustlers',
];

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim1 = useRef(new Animated.Value(0)).current;
  const floatAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % USER_TYPES.length);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 1500);

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim2, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim2, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, []);

  const float1Y = floatAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const float2Y = floatAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.floatingShape,
          styles.shape1,
          { transform: [{ translateY: float1Y }] },
        ]}
      />
      <Animated.View
        style={[
          styles.floatingShape,
          styles.shape2,
          { transform: [{ translateY: float2Y }] },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.headingContainer}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          
          <MaskedView
            maskElement={
              <Text style={styles.boppText}>bopp</Text>
            }
          >
            <LinearGradient
              colors={['#7C3AED', '#FF6B6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientContainer}
            >
              <Text style={[styles.boppText, { opacity: 0 }]}>bopp</Text>
            </LinearGradient>
          </MaskedView>
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.taglineStatic}>Tax sorted for</Text>
          <Animated.View
            style={[
              styles.animatedTextContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.taglineAnimated}>{USER_TYPES[currentIndex]}</Text>
          </Animated.View>
        </View>

        <View style={styles.featuresContainer}>
          <Feature 
            text="Your personal tax to-do list" 
            emoji="✅"
          />
          <Feature 
            text="Feel on top of taxes" 
            emoji="🏆"
          />
          <Feature 
            text="Track expenses in your sleep" 
            emoji="🔥"
          />
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
          <TouchableOpacity style={styles.ctaButton} onPress={onComplete}>
            <LinearGradient
              colors={['#7C3AED', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaButtonText}>Show me!</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.bottomText}>No spreadsheets. No stress.</Text>
      </View>
    </SafeAreaView>
  );
}

interface FeatureProps {
  text: string;
  emoji: string;
}

const Feature: React.FC<FeatureProps> = ({ text, emoji }) => (
  <View style={styles.feature}>
    <View style={styles.featureIconContainer}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
    </View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E1A47',
    overflow: 'hidden',
  },
  floatingShape: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.1,
  },
  shape1: {
    width: 150,
    height: 150,
    backgroundColor: '#7C3AED',
    top: 60,
    right: -50,
  },
  shape2: {
    width: 120,
    height: 120,
    backgroundColor: '#FF6B6B',
    bottom: 100,
    left: -40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 1,
  },
  headingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  boppText: {
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -3,
    color: '#fff',
  },
  gradientContainer: {
  paddingVertical: 4,
  paddingHorizontal: 0.5,
},
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 32,
    height: 80,
  },
  taglineStatic: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 8,
    fontWeight: '500',
  },
  animatedTextContainer: {
    minHeight: 36,
    justifyContent: 'center',
  },
  taglineAnimated: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FF6B6B',
    textAlign: 'center',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 28,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1F1333',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2E1A47',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  ctaButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginRight: 8,
  },
  bottomText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});