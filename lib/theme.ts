// Bopp Design System v2 — Clash Display + Satoshi
export const colors = {
  // Brand
  parchment: '#F5F2EC',   // app background
  ink:       '#0D0D0D',   // primary text, buttons
  volt:      '#E8FF47',   // primary accent — every positive action
  ember:     '#FF4D1C',   // urgency, deadlines, CTAs
  mist:      '#C8C4BA',   // dividers, disabled, captions
  dark:      '#141414',   // dark cards

  // UI
  white:     '#FFFFFF',
  midGrey:   '#6B6866',
  card:      '#FFFFFF',

  // Tags
  tagVoltBg:    '#F5FFB0',
  tagVoltText:  '#5A6800',
  tagEmberBg:   '#FFE4DC',
  tagEmberText: '#C02800',
  tagBlueBg:    '#E0ECFF',
  tagBlueText:  '#1A3A8C',
  tagGreenBg:   '#D4F5E8',
  tagGreenText: '#0A6040',
  tagInkBg:     '#0D0D0D',
  tagInkText:   '#E8FF47',
};

export const fonts = {
  display:      'ClashDisplay-Bold',       // headings, logo, numbers
  displaySemi:  'ClashDisplay-SemiBold',   // subheadings, labels
  displayMed:   'ClashDisplay-Medium',     // UI labels
  body:         'Satoshi-Regular',         // body text, captions
  bodyBold:     'Satoshi-Bold',            // body emphasis
};

export const spacing = {
  xs:  8,
  sm:  12,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const borderRadius = {
  xs:   2,
  sm:   4,
  md:   8,
  lg:   12,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
