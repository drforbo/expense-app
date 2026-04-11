// Bopp Design System
// Single source of truth — all values match the component redesign spec exactly.

export const colors = {
  // Light mode (most screens)
  ember:          '#E8470A',   // primary orange-red
  emberLight:     '#F5A623',   // amber/gold gradient start
  emberDeep:      '#C0392B',   // deep red gradient end
  parchment:      '#FAF7F0',   // off-white background
  ink:            '#1A1A1A',   // primary text
  inkMuted:       '#6B6B6B',   // secondary/label text
  inkFaint:       '#D4CFC8',   // dividers, borders
  blush:          '#FEF0EB',   // tinted parchment for owed/warning cards
  white:          '#FFFFFF',

  // Dark mode (Splash, Analytics header, Tax Estimate modal)
  night:          '#0F0E0D',   // near-black background (warm, not cold)
  nightMuted:     'rgba(255,255,255,0.6)',   // secondary text on dark
  nightFaint:     'rgba(255,255,255,0.1)',   // dividers/borders on dark
  nightGlass:     'rgba(255,255,255,0.12)',  // glass card on dark bg

  // Semantic — mapped to spec
  positive:       '#2E7D32',   // verified, income success
  negative:       '#E8470A',   // expense amounts, errors — same as ember

  // Legacy aliases (keep for screens not yet migrated)
  background:     '#FAF7F0',   // maps to parchment
  surface:        '#FFFFFF',   // cards are white on parchment
  gradientStart:  '#F5A623',   // maps to emberLight
  gradientMid:    '#E8470A',   // maps to ember
  gradientEnd:    '#C0392B',   // maps to emberDeep
  midGrey:        '#6B6B6B',   // maps to inkMuted
  muted:          '#6B6B6B',   // maps to inkMuted
  border:         '#D4CFC8',   // maps to inkFaint
  black:          '#1A1A1A',   // maps to ink

  // Tags / badges
  tagExpenseBg:   '#FEF0EB',   // maps to blush
  tagExpenseText: '#E8470A',   // maps to ember
  tagIncomeBg:    '#E8F5E9',
  tagIncomeText:  '#2E7D32',
};

export const gradients = {
  // Primary hero gradient — hero cards and large CTAs
  hero:     ['#F5A623', '#E8470A', '#C0392B'] as const,

  // Subtle warm gradient — section headers, small accent elements
  warm:     ['#F5A623', '#E8470A'] as const,

  // Ember to deep — buttons and active states
  button:   ['#E8470A', '#C0392B'] as const,

  // Income bar
  income:   ['#F5A623', '#E8470A'] as const,

  // Expense bar
  expense:  ['#E8470A', '#C0392B'] as const,

  // Neutral bar
  neutral:  ['#D4CFC8', '#B8B2AA'] as const,

  // Legacy alias
  primary:  ['#F5A623', '#E8470A', '#C0392B'] as const,
};

export const fonts = {
  // Poppins — single family, weight variants
  display:      'Poppins-Black',        // 900 — hero headings, big numbers
  displaySemi:  'Poppins-ExtraBold',    // 800 — section headings, hero numbers
  displayMed:   'Poppins-Bold',         // 700 — amounts, CTA text
  body:         'Poppins-Regular',      // 400 — body copy, labels, meta
  bodyBold:     'Poppins-SemiBold',     // 600 — emphasis, list items, tags
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,    // screen edge padding — ALWAYS 20px horizontal
  xxl:  28,
  xxxl: 40,
};

export const borderRadius = {
  xs:   6,     // tags, tiny badges
  sm:   10,    // transaction icons
  md:   16,    // upload rows, small cards
  lg:   20,    // most cards, profile cards, checklist cards
  xl:   24,    // hero cards, feature cards
  full: 9999,  // ALL buttons — pill shape always
};

// Typography presets matching the spec
export const typography = {
  screenLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  heroNumber: {
    fontSize: 48,
    fontFamily: fonts.displaySemi,
  },
  sectionHeading: {
    fontSize: 28,
    fontFamily: fonts.displaySemi,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: fonts.body,
  },
  amountPrimary: {
    fontSize: 22,
    fontFamily: fonts.displayMed,
  },
  amountSecondary: {
    fontSize: 15,
    fontFamily: fonts.bodyBold,
  },
};
