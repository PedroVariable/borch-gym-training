/**
 * Brand palette — black / white / red. Minimal, high-contrast, easy to read in the gym.
 *
 * Key naming kept stable so screens don't need rewrites:
 *  - `green`  → main red (CTA, focus, success-of-action)
 *  - `gold`   → black (accent / labels / emphasized text)
 *  - `bg`     → white
 *  - `text`   → near-black
 */

export const theme = {
  colors: {
    bg:       '#ffffff',
    bg2:      '#f6f7f8',
    surface:  '#ffffff',
    surface2: '#f0f1f3',

    border:        '#e5e5e7',
    borderStrong:  '#0a0a0a',

    text:     '#0a0a0a',
    textDim:  '#6b6f76',
    textMuted:'#9aa0a6',

    // Primary "red" — what used to be "green" in the code stays under that key
    green:     '#e11d2d',
    greenDeep: '#9b1320',
    greenGlow: '#ef4444',

    // Accent — what used to be "gold" is now black for clean labels
    gold:      '#0a0a0a',
    goldLight: '#3a3a3a',
    goldDeep:  '#000000',

    red:      '#e11d2d',  // alias
    overlay:  'rgba(0, 0, 0, 0.55)',
  },
  spacing: (n) => n * 4,
  radius: { sm: 6, md: 12, lg: 16, xl: 22, pill: 999 },
  font: {
    display: 'System',
    body: 'System',
  },
}

export const shadow = {
  glow: {
    shadowColor: theme.colors.green,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardStrong: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
}
