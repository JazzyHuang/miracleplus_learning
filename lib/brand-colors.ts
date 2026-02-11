/**
 * Brand color constants for contexts where CSS variables are not available
 * (e.g., OG images via @vercel/og, PWA manifest, global-error.tsx inline styles)
 *
 * These MUST stay in sync with the CSS variables in globals.css
 */

export const BRAND_COLORS = {
  // Light mode
  light: {
    background: '#FAFAF7',
    foreground: '#1C1917',
    card: '#FFFFFF',
    cardForeground: '#1C1917',
    primary: '#4A62B3',       // hsl(225, 50%, 48%)
    primaryForeground: '#FFFFFF',
    secondary: '#F0EFEC',
    accent: '#F2F0ED',
    muted: '#EDECE9',
    mutedForeground: '#736F6B',
    border: '#E2DFD9',
    destructive: '#C53030',
    success: '#4A8B6F',
    warning: '#C17F24',
    info: '#4A62B3',          // same as primary
    brand: '#4A62B3',         // same as primary
    brandSecondary: '#6B7FBA',
  },
  // Dark mode
  dark: {
    background: '#1C1A18',
    foreground: '#E2DFD9',
    card: '#272422',
    cardForeground: '#E2DFD9',
    primary: '#7B93D4',       // hsl(225, 55%, 60%)
    primaryForeground: '#FFFFFF',
    secondary: '#2E2B28',
    accent: '#2E2B28',
    muted: '#332F2C',
    mutedForeground: '#918C87',
    border: '#332F2C',
    destructive: '#D4564F',
    success: '#5FA87D',
    warning: '#D4983A',
    info: '#7B93D4',          // same as primary
    brand: '#7B93D4',         // same as primary
    brandSecondary: '#8DA0D4',
  },
} as const;

/** Shared brand identity colors (theme-independent) */
export const BRAND = {
  name: 'Miracle Learning',
  themeColorLight: '#FAFAF7',
  themeColorDark: '#1C1A18',
} as const;
