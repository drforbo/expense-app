import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import {
  GradientContainer,
  GlassButton,
  DecorativeBlobs,
} from '../../lib/components';
import { colors, spacing, borderRadius } from '../../lib/theme';

interface Step5ConnectBankProps {
  onConnect: () => void;
}

export const Step5ConnectBank: React.FC<Step5ConnectBankProps> = ({ onConnect }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <GradientContainer>
        <DecorativeBlobs />
        
        <View style={styles.content}>
          <View style={styles.topSection}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🏦</Text>
            </View>
            
            <Text style={styles.header}>Connect your bank</Text>
            <Text style={styles.subheader}>
              We'll find your business expenses automatically
            </Text>
          </View>
          
          <View style={styles.middleSection}>
            <BenefitItem 
              icon="✓" 
              text="Read-only access (we can't move money)" 
            />
            <BenefitItem 
              icon="✓" 
              text="Bank-level security" 
            />
            <BenefitItem 
              icon="✓" 
              text="Takes 30 seconds" 
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <GlassButton
              title="Connect securely"
              onPress={onConnect}
              variant="primary"
            />
            
            <Text style={styles.securityNote}>
              Powered by Plaid • Your data is encrypted
            </Text>
          </View>
        </View>
      </GradientContainer>
    </View>
  );
};

const BenefitItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.checkmarkContainer}>
        <Text style={styles.checkmark}>{icon}</Text>
      </View>
      <Text style={styles.benefitText}>{text}</Text>
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
  middleSection: {
    width: '100%',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.glassWhite,
    borderWidth: 2,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 50,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subheader: {
    fontSize: 16,
    color: colors.mediumGray,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkmarkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.electricViolet,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  checkmark: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  benefitText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '500',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
  securityNote: {
    fontSize: 12,
    color: colors.mediumGray,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});