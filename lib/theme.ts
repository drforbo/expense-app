// Bopp Design System - Duolingo Energy
export const colors = {
  // Primary palette
  deepPurple: '#2E1A47',
  darkPurple: '#1F0E35',
  electricViolet: '#7C3AED',
  lightViolet: '#9D50ED',
  coral: '#FF6B6B',
  
  // Neutrals
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  mediumGray: '#9CA3AF',
  darkGray: '#374151',
  
  // Functional
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  
  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.1)',
  glassBorder: 'rgba(255, 255, 255, 0.2)',
};

export const fonts = {
  display: 'Outfit_800ExtraBold',
  body: 'Inter_500Medium',
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 30,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.electricViolet,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  lg: {
    shadowColor: colors.electricViolet,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
};
