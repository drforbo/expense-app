// Bopp Design System — Solar Flare
export const colors = {
  // Core
  background:   '#0A0A0A',   // page background (void black)
  surface:      '#141414',   // card/panel background
  coralBlaze:   '#FF5C35',   // primary CTA, key accents
  warmAmber:    '#FFAA52',   // secondary accent, glow highlights
  deepViolet:   '#7B9CCB',   // subtle UI accents, tags
  acidLime:     '#C8FF2E',   // tertiary accent, badges, highlights
  white:        '#FAFAFA',   // body text, light UI elements
  border:       'rgba(255,255,255,0.08)', // subtle borders
  // Legacy aliases (for gradual migration)
  parchment:    '#0A0A0A',
  ink:          '#FAFAFA',
  volt:         '#C8FF2E',
  ember:        '#FF5C35',
  mist:         'rgba(255,255,255,0.2)',
  dark:         '#141414',
  card:         '#141414',
  midGrey:      'rgba(250,250,250,0.5)',
  white100:     '#FFFFFF',

  // Tags
  tagVoltBg:    'rgba(200,255,46,0.15)',
  tagVoltText:  '#C8FF2E',
  tagEmberBg:   'rgba(255,92,53,0.2)',
  tagEmberText: '#FF5C35',
  tagBlueBg:    'rgba(123,156,203,0.2)',
  tagBlueText:  '#7B9CCB',
  tagGreenBg:   'rgba(200,255,46,0.15)',
  tagGreenText: '#C8FF2E',
  tagInkBg:     '#FAFAFA',
  tagInkText:   '#0A0A0A',
};

export const fonts = {
  display:      'Poppins_700Bold',
  displaySemi:  'Poppins_600SemiBold',
  displayMed:   'Poppins_600SemiBold',
  body:         'Poppins_400Regular',
  bodyBold:     'Poppins_700Bold',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const borderRadius = {
  xs:   2,
  sm:   6,
  md:   10,
  lg:   12,
  xl:   24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
};
