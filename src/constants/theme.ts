export const THEME = {
  colors: {
    // Exact Supernova Official Palette (Extracted from live.gosupernova.app)
    background: '#1C1C22', // Official Supernova Charcoal Obsidian
    backgroundDark: '#12151E',
    surface: '#1F1F2A', // Official Supernova Card Surface
    surfaceCard: '#23232A',
    surfaceElevated: '#292D3E',
    surfaceDark: '#16161A',
    border: '#2C2C38',
    borderDark: '#1E1E28',
    borderLight: '#3A3A4A',

    // Signature Supernova Purple (#7F43FE)
    primary: '#7F43FE',
    primaryHover: '#6E32EE',
    primaryBorder: '#5E22DE', // 3D bevel shadow
    primaryGlow: '#9B6EFF',
    primaryText: '#FFFFFF',

    // Solar Amber Gold (#F8D46A / #F5BD4A)
    gold: '#F8D46A',
    goldGlow: '#FDE08A',
    goldBorder: '#D99B00',
    goldLight: 'rgba(248, 212, 106, 0.15)',

    // Fluency Emerald Green (#0BB35A / #34C759)
    accent: '#0BB35A',
    accentBorder: '#089248',
    accentLight: 'rgba(11, 179, 90, 0.15)',
    success: '#0BB35A',
    successBg: 'rgba(11, 179, 90, 0.15)',

    // Secondary Cyan
    secondary: '#12BBF2',
    secondaryBorder: '#0EA5E9',
    secondaryLight: 'rgba(18, 187, 242, 0.15)',

    // Hearts & Errors
    error: '#EF4444',
    errorBorder: '#DC2626',
    errorLight: 'rgba(239, 68, 68, 0.15)',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    warning: '#F5BD4A',
    warningBg: 'rgba(245, 189, 74, 0.15)',

    // Typography
    text: '#FFFFFF',
    textSecondary: '#A0A0B2',
    textMuted: '#6B6B80',
    textWhite: '#FFFFFF',
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    full: 9999,
  },
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 5,
    },
    button3D: {
      borderBottomWidth: 4,
    },
  },
};
