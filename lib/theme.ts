// Bopp Design System
// Built from BOPP_DESIGN_SYSTEM.md — all values are exact, do not deviate.

export const colors = {
  // Backgrounds
  background:     '#FFFFFF',   // every screen bg — pure white
  surface:        '#F9F9F9',   // cards, rows, input fields
  surfaceHover:   '#F5F5F5',   // pressed state on surface

  // Brand gradient — ALWAYS used together via LinearGradient, never as flat fills
  gradientStart:  '#FF8C00',   // orange
  gradientMid:    '#FF4500',   // red-orange
  gradientEnd:    '#CC1A00',   // dark red

  // Text
  ink:            '#000000',   // primary text — pure black
  midGrey:        '#888888',   // secondary text, labels, dates
  muted:          '#AAAAAA',   // placeholder, disabled, hints
  white:          '#FFFFFF',   // text ON gradient backgrounds only

  // Semantic
  positive:       '#1A7A40',   // income amounts, success — dark green
  negative:       '#CC1A00',   // expense amounts, errors — matches gradientEnd
  warning:        '#FF8C00',   // matches gradientStart

  // Tags / badges
  tagExpenseBg:   '#FFF0E8',   // expense category pill background
  tagExpenseText: '#FF4500',   // expense category pill text
  tagIncomeBg:    '#E8F5EE',   // income badge background
  tagIncomeText:  '#1A7A40',   // income badge text
  tagBlueBg:      '#E8F0FF',   // info/bank tag background
  tagBlueText:    '#1A4ACC',   // info/bank tag text

  // Borders
  border:         '#F0F0F0',   // all dividers and card borders — 1.5px
  borderStrong:   '#E0E0E0',   // focused inputs

  // Gradient overlay tints (for use on gradient bg)
  gradientTextPrimary:   '#FFFFFF',
  gradientTextSecondary: 'rgba(255,255,255,0.6)',
  gradientAccent:        'rgba(255,255,255,0.2)',

  // Legacy aliases (keep for any screens not yet migrated)
  black:          '#000000',
  parchment:      '#FFFFFF',
  textSecondary:  '#888888',
  textMuted:      '#AAAAAA',
  textOnAccent:   '#FFFFFF',
  card:           '#F9F9F9',
  dark:           '#F9F9F9',
};

export const gradients = {
  primary: ['#FF8C00', '#FF4500', '#CC1A00'] as const,
  hero:    ['#FFD166', '#FF8C00', '#FF4500', '#990000'] as const,
  heroLocations: [0, 0.35, 0.7, 1] as const,
};

export const fonts = {
  // Poppins — single family, weight variants
  display:      'Poppins-Black',        // 900 — hero headings, big numbers, wordmark
  displaySemi:  'Poppins-ExtraBold',    // 800 — screen labels, subheadings
  displayMed:   'Poppins-Bold',         // 700 — CTA text, card titles
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
  md:   14,    // inputs, small cards
  lg:   18,    // most cards, modal surfaces
  xl:   22,    // hero cards, gradient cards
  full: 9999,  // ALL buttons — pill shape always
};
