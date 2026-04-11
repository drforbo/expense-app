// Digital Ethereal Design System — "The Liquid Curator"
// Single source of truth for all design tokens.

export const colors = {
  // Primary (Sunset)
  primary:              '#9c3e18',   // deep sunset
  primaryContainer:     '#fe885c',   // vibrant sunset orange
  onPrimary:            '#ffffff',   // text on primary

  // Secondary (Sea & Twilight)
  secondary:            '#4855a2',   // calm blue depth
  secondaryContainer:   '#7b8fd4',   // lighter blue for chips/active
  secondaryDim:         '#6672c4',   // twilight blue
  tertiary:             '#3d599c',   // alias

  // Surfaces — cool, not warm
  surface:              '#f5f6fc',   // main background
  surfaceContainerLow:  '#eff0f7',   // card/section background
  surfaceContainer:     '#e8eaf3',   // stat icon bg, tag bg
  surfaceContainerHigh: '#dfe1ed',   // input fields, deeper layer
  surfaceLowest:        '#ffffff',   // glass cards, floating elements
  surfaceTint:          '#9c3e18',   // tinted shadow color

  // Text — never pure black
  onSurface:            '#2c2f33',   // primary text
  onSurfaceMuted:       '#6b7080',   // secondary/label text
  onSurfaceFaint:       '#a0a3aa',   // placeholder, disabled
  outlineVariant:       'rgba(99,102,128,0.15)', // ghost borders

  // Semantic
  positive:             '#2e7d32',   // success, income
  negative:             '#c0392b',   // error, expense
  warning:              '#e67e22',   // caution

  // Glass
  glass:                'rgba(255,255,255,0.55)',  // 40-70% white
  glassBorder:          'rgba(255,255,255,0.20)',  // glass rim highlight
  glassLight:           'rgba(255,255,255,0.70)',  // higher opacity glass

  // Dark mode (Onboarding / Splash)
  night:                '#1a1c2e',   // dark with blue undertone
  nightSurface:         '#262840',   // card on dark
  nightMuted:           'rgba(255,255,255,0.6)',
  nightFaint:           'rgba(255,255,255,0.12)',
  nightGlass:           'rgba(255,255,255,0.08)',

  // Tags
  tagExpenseBg:         '#fef0eb',
  tagExpenseText:       '#9c3e18',
  tagIncomeBg:          '#e8f5e9',
  tagIncomeText:        '#2e7d32',

  // Legacy aliases for migration
  white:                '#ffffff',
  ember:                '#9c3e18',
  emberLight:           '#fe885c',
  parchment:            '#f5f6fc',
  ink:                  '#2c2f33',
  inkMuted:             '#6b7080',
  inkFaint:             '#dfe1ed',
  blush:                '#fef0eb',
  background:           '#f5f6fc',
  gradientStart:        '#fe885c',
  gradientMid:          '#9c3e18',
  gradientEnd:          '#4855a2',
  border:               '#dfe1ed',
  black:                '#2c2f33',
  surface_alias:        '#ffffff',
  midGrey:              '#6b7080',
  muted:                '#6b7080',
  textSecondary:        '#6b7080',   // alias for onSurfaceMuted
  textMuted:            '#a0a3aa',   // alias for onSurfaceFaint
  tagBlueText:          '#4855a2',   // alias for secondary
  tagBlueBg:            'rgba(72,85,162,0.10)', // light blue tag bg
};

export const gradients = {
  // Liquid Gradient — 5-stop hero signature
  hero:          ['#F5A623', '#fe885c', '#c0452b', '#7b65c8', '#4855a2'] as const,
  heroLocations: [0, 0.2, 0.5, 0.78, 1] as const,

  // Warm sunset — section headers, small accent
  warm:     ['#fe885c', '#9c3e18'] as const,

  // Button — primary to secondary
  button:   ['#9c3e18', '#4855a2'] as const,

  // Income bar
  income:   ['#2e7d32', '#4caf50'] as const,

  // Expense bar
  expense:  ['#9c3e18', '#c0392b'] as const,

  // Stat card accent bars
  statEarned: ['#fe885c', '#F5A623'] as const,
  statOwed:   ['#9c3e18', '#6672c4'] as const,

  // Neutral bar
  neutral:  ['#e8e9f0', '#d0d2da'] as const,

  // Legacy alias
  primary:  ['#F5A623', '#fe885c', '#c0452b', '#7b65c8', '#4855a2'] as const,
};

export const fonts = {
  // Plus Jakarta Sans — display headlines
  display:      'PlusJakartaSans-ExtraBold',   // 800
  displaySemi:  'PlusJakartaSans-Bold',        // 700
  displayMed:   'PlusJakartaSans-SemiBold',    // 600

  // Manrope — body copy, labels
  body:         'Manrope-Regular',             // 400
  bodyMed:      'Manrope-Medium',              // 500
  bodyBold:     'Manrope-SemiBold',            // 600
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,    // generous — matches 2rem internal padding rule
  lg:   24,
  xl:   32,    // screen edge padding
  xxl:  40,
  xxxl: 56,
};

export const borderRadius = {
  xs:   8,     // tags, tiny badges
  sm:   12,    // input fields, small elements
  md:   20,    // transaction rows, small cards
  lg:   32,    // most cards (2rem)
  xl:   48,    // hero cards, feature cards (3rem)
  full: 9999,  // pill buttons, chips
};

// Typography presets
export const typography = {
  screenLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  heroNumber: {
    fontSize: 52,
    fontFamily: fonts.display,
    letterSpacing: -1,
  },
  sectionHeading: {
    fontSize: 28,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: fonts.body,
    lineHeight: 24,
  },
  amountPrimary: {
    fontSize: 24,
    fontFamily: fonts.displaySemi,
  },
  amountSecondary: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
  },
};

// Glassmorphism helper values
export const glass = {
  background: 'rgba(255,255,255,0.55)',
  blur: 40,
  borderColor: 'rgba(255,255,255,0.20)',
  borderWidth: 1.5,
};

// Ambient shadow (for modals / floating elements)
export const ambientShadow = {
  shadowColor: '#9c3e18',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  elevation: 12,
};
