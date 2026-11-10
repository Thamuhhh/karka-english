export const THEME = {
  colors: {
    // Ultra-Premium Dark Obsidian & Cyber Violet Palette
    background: '#0E0E14', // Deep Luxury Obsidian
    backgroundSecondary: '#14131D',
    backgroundTertiary: '#1A1826',

    surface: '#181724', // Frosted Glass Card Surface
    surfaceCard: '#1F1D30',
    surfaceElevated: '#28253E',
    surfaceDark: '#12111B',

    border: '#2E2B45',
    borderLight: '#3D395C',
    borderGlow: '#7F43FE66',

    // Supernova Signature Neon Purples
    primary: '#7F43FE',
    primaryHover: '#6D28D9',
    primaryBorder: '#5B21B6', // 3D bevel shadow
    primaryGlow: '#A78BFA',
    primaryLight: 'rgba(127, 67, 254, 0.15)',
    primaryText: '#FFFFFF',

    // Solar Nova Amber & Gold
    gold: '#FBBF24',
    goldHover: '#F59E0B',
    goldGlow: '#FDE68A',
    goldBorder: '#D97706',
    goldLight: 'rgba(251, 191, 36, 0.15)',

    // Fluency Emerald Green
    accent: '#10B981',
    accentBorder: '#059669',
    accentLight: 'rgba(16, 185, 129, 0.15)',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.15)',

    // Cyber Cyan
    secondary: '#06B6D4',
    secondaryBorder: '#0891B2',
    secondaryLight: 'rgba(6, 182, 212, 0.15)',

    // Hearts & Crimson Red
    error: '#EF4444',
    errorBorder: '#DC2626',
    errorLight: 'rgba(239, 68, 68, 0.15)',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.15)',

    // Typography
    text: '#FFFFFF',
    textSecondary: '#A5A1B8',
    textMuted: '#6E6A85',
    textWhite: '#FFFFFF',
  },
  gradients: {
    card: ['#1F1D30', '#181724'] as const,
    primary: ['#8B5CF6', '#7F43FE'] as const,
    gold: ['#FDE047', '#EAB308'] as const,
    accent: ['#34D399', '#059669'] as const,
    banner: ['#281C54', '#151324'] as const,
    surface: ['#232038', '#161522'] as const,
  },
  fonts: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semiBold: 'Poppins_600SemiBold',
    bold: 'Poppins_700Bold',
    extraBold: 'Poppins_800ExtraBold',
    body: 'Montserrat_400Regular',
    bodyMedium: 'Montserrat_500Medium',
    bodySemiBold: 'Montserrat_600SemiBold',
    bodyBold: 'Montserrat_700Bold',
    tamil: 'NotoSansTamil_400Regular',
    tamilMedium: 'NotoSansTamil_500Medium',
    tamilSemiBold: 'NotoSansTamil_600SemiBold',
    tamilBold: 'NotoSansTamil_700Bold',
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
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 6,
    },
    glowPurple: {
      shadowColor: '#7F43FE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
    glowGold: {
      shadowColor: '#FBBF24',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
  },
};
