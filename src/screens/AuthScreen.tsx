import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { AuthUser } from '../types';
import { saveAuthUser } from '../services/storageService';
import { playSoundEffect } from '../services/soundEffectsService';

type AuthMode = 'welcome' | 'login' | 'signup';
type SignupStep = 0 | 1 | 2 | 3;
type FocusField =
  | 'loginId'
  | 'loginPass'
  | 'signupName'
  | 'signupEmail'
  | 'signupPass'
  | null;

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
  onTopColorChange?: (color: string) => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MAX_CONTENT_WIDTH = 440;

const AUTH_TOP_COLORS: Record<AuthMode, string> = {
  welcome: '#1D1436',
  login: '#20163B',
  signup: '#27194A',
};

const LEARNING_GOALS = [
  {
    id: 'Daily Conversations',
    title: 'Daily Conversations',
    subtitle: 'Friends, travel & everyday confidence',
    icon: 'chatbubbles-outline' as const,
    color: '#A78BFA',
    tint: 'rgba(167, 139, 250, 0.16)',
  },
  {
    id: 'Work & Office',
    title: 'Work & Office',
    subtitle: 'Standups, meetings & client calls',
    icon: 'briefcase-outline' as const,
    color: '#38BDF8',
    tint: 'rgba(56, 189, 248, 0.16)',
  },
  {
    id: 'Crack Interviews',
    title: 'Crack Interviews',
    subtitle: 'Clear answers without hesitation',
    icon: 'rocket-outline' as const,
    color: '#FBBF24',
    tint: 'rgba(251, 191, 36, 0.16)',
  },
  {
    id: 'Speak Without Fear',
    title: 'Speak Without Fear',
    subtitle: 'Think & speak naturally from Tamil',
    icon: 'mic-outline' as const,
    color: '#34D399',
    tint: 'rgba(52, 211, 153, 0.16)',
  },
] as const;

const DAILY_TARGETS = [
  {
    minutes: 5,
    tier: 'Casual',
    xp: '20 XP / day',
    icon: 'leaf-outline' as const,
    color: '#34D399',
    tint: 'rgba(52, 211, 153, 0.15)',
    popular: false,
  },
  {
    minutes: 10,
    tier: 'Regular',
    xp: '50 XP / day',
    icon: 'flame-outline' as const,
    color: '#A78BFA',
    tint: 'rgba(167, 139, 250, 0.18)',
    popular: true,
  },
  {
    minutes: 15,
    tier: 'Serious',
    xp: '80 XP / day',
    icon: 'flash-outline' as const,
    color: '#FBBF24',
    tint: 'rgba(251, 191, 36, 0.16)',
    popular: false,
  },
  {
    minutes: 20,
    tier: 'Intense',
    xp: '120 XP / day',
    icon: 'trophy-outline' as const,
    color: '#38BDF8',
    tint: 'rgba(56, 189, 248, 0.16)',
    popular: false,
  },
] as const;

function extractDisplayNameFromEmail(identifier: string): string {
  const cleaned = identifier.trim();
  if (!cleaned) return 'Learner';
  if (cleaned.includes('@')) {
    const prefix = cleaned.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (prefix) {
      return prefix
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getPasswordStrength(password: string): {
  bars: number;
  label: string;
  color: string;
} {
  if (!password.length) {
    return { bars: 0, label: '6+ characters', color: THEME.colors.textMuted };
  }
  if (password.length < 6) {
    return { bars: 1, label: 'Too short', color: THEME.colors.gold };
  }
  const hasMix = /\d|[^A-Za-z0-9]/.test(password);
  if (password.length >= 9 || (password.length >= 7 && hasMix)) {
    return { bars: 3, label: 'Strong', color: THEME.colors.accent };
  }
  return { bars: 2, label: 'Good', color: THEME.colors.primaryGlow };
}

const GoogleLogoSvg: React.FC<{ size?: number }> = ({ size = 17 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.61l3.99 3.1C6.22 6.86 8.87 4.75 12 4.75z"
    />
    <Path
      fill="#FBBC05"
      d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58l-3.99-3.1A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.28 5.39l3.99-3.1z"
    />
    <Path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3c-1.07.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96l-3.99 3.1C3.26 21.31 7.31 24 12 24z"
    />
    <Path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.74-2.4 3.58l3.87 3c2.26-2.09 3.55-5.17 3.55-8.82z"
    />
  </Svg>
);

interface SocialQuickAuthProps {
  dividerLabel: string;
  isSubmitting: boolean;
  onSocialAuth: (provider: 'google' | 'guest') => void;
}

const SocialQuickAuth: React.FC<SocialQuickAuthProps> = ({
  dividerLabel,
  isSubmitting,
  onSocialAuth,
}) => (
  <View>
    <View style={styles.orRow}>
      <View style={styles.orLine} />
      <Text style={styles.orText}>{dividerLabel}</Text>
      <View style={styles.orLine} />
    </View>

    <View style={styles.socialRow}>
      <TouchableOpacity
        style={styles.socialBevelBtn}
        onPress={() => onSocialAuth('google')}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        <GoogleLogoSvg size={17} />
        <Text style={styles.socialBevelText}>GOOGLE</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.socialBevelBtn}
        onPress={() => onSocialAuth('guest')}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        <Ionicons name="sparkles" size={16} color={THEME.colors.gold} />
        <Text style={styles.socialBevelText}>GUEST</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Duolingo-inspired tactile Obsidian onboarding, interactive goal setup, and Sign In screen.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onTopColorChange,
}) => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [signupStep, setSignupStep] = useState<SignupStep>(0);
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  // Onboarding selections + form states
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const coachBobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(coachBobAnim, {
          toValue: 1,
          duration: 1650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(coachBobAnim, {
          toValue: 0,
          duration: 1650,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [coachBobAnim]);

  useEffect(() => {
    onTopColorChange?.(AUTH_TOP_COLORS[mode]);
  }, [mode, onTopColorChange]);

  useEffect(() => {
    slideAnim.setValue(8);
    const anim = Animated.timing(slideAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    anim.start();
    return () => anim.stop();
  }, [mode, signupStep, slideAnim]);

  const switchMode = (nextMode: AuthMode) => {
    setErrorMsg(null);
    setFocusedField(null);
    setShowPassword(false);
    if (nextMode === 'signup') {
      setSignupStep(0);
    }
    setMode(nextMode);
  };

  const completeAuth = async (user: AuthUser) => {
    setIsSubmitting(true);
    try {
      await saveAuthUser(user);
      playSoundEffect('success');
      onAuthenticated(user);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async () => {
    const id = loginIdentifier.trim();
    if (!id) {
      setErrorMsg('Enter your email or username to continue.');
      return;
    }
    if (loginPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    setErrorMsg(null);
    const derivedName = extractDisplayNameFromEmail(id);
    await completeAuth({
      name: derivedName,
      email: id.includes('@') ? id.toLowerCase() : `${id.toLowerCase()}@novabreaker.app`,
      provider: 'email',
      createdAt: new Date().toISOString(),
    });
  };

  const handleSignupBack = () => {
    setErrorMsg(null);
    setFocusedField(null);
    if (signupStep > 0) {
      setSignupStep((prev) => (prev - 1) as SignupStep);
    } else {
      switchMode('welcome');
    }
  };

  const handleSignupNext = async () => {
    setErrorMsg(null);
    if (signupStep === 0) {
      if (!selectedGoal) {
        setErrorMsg('Tap any learning goal to continue.');
        return;
      }
      playSoundEffect('button');
      setSignupStep(1);
      return;
    }

    if (signupStep === 1) {
      playSoundEffect('button');
      setSignupStep(2);
      return;
    }

    if (signupStep === 2) {
      if (signupName.trim().length < 2) {
        setErrorMsg('Please enter at least 2 characters for your name.');
        return;
      }
      setFocusedField(null);
      playSoundEffect('button');
      setSignupStep(3);
      return;
    }

    const email = signupEmail.trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Enter a valid email address (example: name@domain.com).');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Create a password with at least 6 characters.');
      return;
    }

    await completeAuth({
      name: signupName.trim(),
      email: email.toLowerCase(),
      provider: 'email',
      createdAt: new Date().toISOString(),
      learningGoal: selectedGoal || 'Daily Conversations',
      dailyGoalMinutes: dailyMinutes,
    });
  };

  const handleQuickSocialAuth = async (provider: 'google' | 'guest') => {
    setErrorMsg(null);
    playSoundEffect('button');
    const goalMeta = selectedGoal ? { learningGoal: selectedGoal, dailyGoalMinutes: dailyMinutes } : {};
    if (provider === 'google') {
      await completeAuth({
        name: signupName.trim() || 'Alex',
        email: 'alex@gmail.com',
        provider: 'google',
        createdAt: new Date().toISOString(),
        ...goalMeta,
      });
      return;
    }
    await completeAuth({
      name: signupName.trim() || 'Guest Learner',
      email: '',
      provider: 'guest',
      createdAt: new Date().toISOString(),
      ...goalMeta,
    });
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Reset Password',
      'Since NovaBreaker stores your study progress on this device, you can sign in with any password or continue with Google or Guest access.',
      [{ text: 'Got it' }]
    );
  };

  const renderAnimatedViewStyle = {
    transform: [{ translateY: slideAnim }],
  };

  const coachBobY = coachBobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3.5],
  });

  /* ========================================================================= */
  /* VIEW 1: DUOLINGO-STYLE WELCOME ONBOARDING                                 */
  /* ========================================================================= */
  if (mode === 'welcome') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[AUTH_TOP_COLORS.welcome, 'rgba(14, 14, 20, 0)']}
          style={styles.topGlow}
          pointerEvents="none"
        />

        <Animated.View style={[styles.welcomeShell, renderAnimatedViewStyle]}>
          {/* Center Mascot + Wordmark Stage */}
          <View style={styles.welcomeHero}>
            <View style={styles.speechBubble}>
              <Text style={styles.speechBubbleText}>Vanakkam! Let's speak fluent English.</Text>
              <View style={styles.speechTail} />
            </View>

            <View style={styles.mascotHalo}>
              <View style={styles.mascotRing}>
                <Image
                  source={SUPERNOVA_IMAGES.novaAvatar}
                  style={styles.mascotImg}
                  resizeMode="cover"
                />
              </View>
            </View>

            <Text style={styles.brandWordmark}>NovaBreaker</Text>
            <Text style={styles.brandTagline}>
              Master everyday &amp; workplace English through Tamil.
            </Text>
          </View>

          {/* Bottom Tactile 3D Button Stack */}
          <View style={styles.welcomeBottomStack}>
            <TouchableOpacity
              style={styles.primaryBevelBtn}
              onPress={() => {
                playSoundEffect('button');
                switchMode('signup');
              }}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryBevelText}>GET STARTED</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBevelBtn}
              onPress={() => {
                playSoundEffect('button');
                switchMode('login');
              }}
              activeOpacity={0.86}
            >
              <Text style={styles.secondaryBevelText}>I ALREADY HAVE AN ACCOUNT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  /* ========================================================================= */
  /* VIEW 2: DUOLINGO-STYLE SIGN IN                                            */
  /* ========================================================================= */
  if (mode === 'login') {
    const canSubmitLogin =
      loginIdentifier.trim().length > 0 && loginPassword.length >= 4 && !isSubmitting;
    const isLoginGroupFocused = focusedField === 'loginId' || focusedField === 'loginPass';

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={[AUTH_TOP_COLORS.login, 'rgba(14, 14, 20, 0)']}
          style={styles.topGlow}
          pointerEvents="none"
        />

        <ScrollView
          contentContainerStyle={styles.authScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Minimal Back & Title Top Row */}
          <View style={styles.authTopNav}>
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => switchMode('welcome')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.authNavTitle}>Enter your details</Text>
            <View style={styles.navSpacer} />
          </View>

          <Animated.View style={[styles.formBody, renderAnimatedViewStyle]}>
            {/* Duolingo Connected 2-Input Stack */}
            <View
              style={[
                styles.groupedInputsBox,
                isLoginGroupFocused && styles.inputBoxFocused,
              ]}
            >
              <TextInput
                style={styles.groupedTopInput}
                placeholder="Email or username"
                placeholderTextColor={THEME.colors.textMuted}
                value={loginIdentifier}
                onFocus={() => setFocusedField('loginId')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(txt) => {
                  setLoginIdentifier(txt);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />

              <View
                style={[
                  styles.groupedDivider,
                  isLoginGroupFocused && styles.groupedDividerFocused,
                ]}
              />

              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.groupedBottomInput}
                  placeholder="Password"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={loginPassword}
                  onFocus={() => setFocusedField('loginPass')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(txt) => {
                    setLoginPassword(txt);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLoginSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeToggleBtn}
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={THEME.colors.primaryGlow}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {errorMsg && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color={THEME.colors.gold} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.primaryBevelBtn,
                styles.formSubmitGap,
                !canSubmitLogin && styles.bevelBtnDisabled,
              ]}
              onPress={handleLoginSubmit}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.primaryBevelText,
                    !canSubmitLogin && styles.bevelBtnTextDisabled,
                  ]}
                >
                  SIGN IN
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotLinkWrap}
              onPress={handleForgotPassword}
              activeOpacity={0.75}
            >
              <Text style={styles.forgotLinkText}>FORGOT PASSWORD?</Text>
            </TouchableOpacity>

            <SocialQuickAuth
              dividerLabel="OR"
              isSubmitting={isSubmitting}
              onSocialAuth={handleQuickSocialAuth}
            />

            <View style={styles.switchFooterRow}>
              <Text style={styles.switchMuted}>New here?</Text>
              <TouchableOpacity onPress={() => switchMode('signup')} activeOpacity={0.75}>
                <Text style={styles.switchAction}>Create profile</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <Text style={styles.legalCaption}>
            By signing in to NovaBreaker, you agree to our Terms and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ========================================================================= */
  /* VIEW 3: VIBRANT DUOLINGO ONBOARDING & SIGN UP (AFTER GET STARTED)         */
  /* ========================================================================= */
  const progressFraction = (signupStep + 1) / 4;
  const trimmedName = signupName.trim();

  const canProceedSignup =
    !isSubmitting &&
    ((signupStep === 0 && Boolean(selectedGoal)) ||
      signupStep === 1 ||
      (signupStep === 2 && trimmedName.length >= 2) ||
      (signupStep === 3 && /\S+@\S+\.\S+/.test(signupEmail.trim()) && signupPassword.length >= 6));

  const coachPromptByStep: Record<SignupStep, string> = {
    0: 'What brings you to NovaBreaker? Pick your top focus.',
    1: 'Awesome! How much time can you practice each day?',
    2: 'Great habit! Now, what should I call you?',
    3: trimmedName
      ? `Last step, ${trimmedName}! Save your ${dailyMinutes} min/day streak.`
      : 'Last step — save your progress to your new profile.',
  };

  const headlineByStep: Record<SignupStep, string> = {
    0: 'Choose your English goal',
    1: 'Set a daily goal',
    2: 'Your coach wants to know you',
    3: 'Create your profile',
  };

  const passwordStrength = getPasswordStrength(signupPassword);
  const isFinalStepBoxFocused =
    focusedField === 'signupEmail' || focusedField === 'signupPass';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Keep ambient top violet lighting consistent after clicking Get Started */}
      <LinearGradient
        colors={[AUTH_TOP_COLORS.signup, 'rgba(91, 33, 182, 0.08)', 'rgba(14, 14, 20, 0)']}
        style={styles.onboardingGlow}
        pointerEvents="none"
      />

      <View style={styles.signupShell}>
        {/* Duolingo Back Arrow + Luminous Progress Bar */}
        <View style={styles.signupTopRow}>
          <TouchableOpacity
            style={styles.onboardingBackBtn}
            onPress={handleSignupBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#E9D5FF" />
          </TouchableOpacity>

          <View style={styles.signupProgressTrack}>
            <LinearGradient
              colors={['#C4B5FD', '#7F43FE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.signupProgressFill,
                { width: `${Math.round(progressFraction * 100)}%` },
              ]}
            >
              <View style={styles.progressShineBar} />
            </LinearGradient>
          </View>

          <View style={styles.stepPillBadge}>
            <Text style={styles.stepFractionText}>{signupStep + 1}/4</Text>
          </View>
        </View>

        <ScrollView
          style={styles.signupScroll}
          contentContainerStyle={styles.signupScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={renderAnimatedViewStyle}>
            {/* Animated Nila Coach + Pointed Speech Bubble */}
            <View style={styles.promptCoachRow}>
              <Animated.View
                style={[styles.miniMascotHalo, { transform: [{ translateY: coachBobY }] }]}
              >
                <View style={styles.miniMascotRing}>
                  <Image
                    source={SUPERNOVA_IMAGES.novaAvatar}
                    style={styles.mascotImg}
                    resizeMode="cover"
                  />
                </View>
              </Animated.View>

              <View style={styles.coachBubble}>
                <View style={styles.coachBubbleTail} />
                <Text style={styles.coachBubbleText}>{coachPromptByStep[signupStep]}</Text>
              </View>
            </View>

            <Text style={styles.stepHeadline}>{headlineByStep[signupStep]}</Text>

            {/* STEP 0: INTERACTIVE DUOLINGO GOAL SELECTOR */}
            {signupStep === 0 && (
              <View style={styles.choiceList}>
                {LEARNING_GOALS.map((goal) => {
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <TouchableOpacity
                      key={goal.id}
                      style={[
                        styles.choiceRowBtn,
                        isSelected && styles.choiceRowSelected,
                      ]}
                      onPress={() => {
                        playSoundEffect('button');
                        setSelectedGoal(goal.id);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      activeOpacity={0.86}
                    >
                      <View
                        style={[
                          styles.choiceIconBadge,
                          {
                            backgroundColor: goal.tint,
                            borderColor: isSelected ? goal.color : 'rgba(255,255,255,0.08)',
                          },
                        ]}
                      >
                        <Ionicons name={goal.icon} size={20} color={goal.color} />
                      </View>

                      <View style={styles.choiceTextCol}>
                        <Text
                          style={[
                            styles.choiceTitle,
                            isSelected && styles.choiceTitleSelected,
                          ]}
                        >
                          {goal.title}
                        </Text>
                        <Text style={styles.choiceSubtitle}>{goal.subtitle}</Text>
                      </View>

                      <View
                        style={[
                          styles.choiceCheckCircle,
                          isSelected && styles.choiceCheckCircleSelected,
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.stepZeroLinks}>
                  <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.75}>
                    <Text style={styles.switchAction}>Already have a profile? Sign in</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 1: DUOLINGO DAILY PRACTICE TARGET */}
            {signupStep === 1 && (
              <View style={styles.choiceList}>
                {DAILY_TARGETS.map((target) => {
                  const isSelected = dailyMinutes === target.minutes;
                  return (
                    <TouchableOpacity
                      key={target.minutes}
                      style={[
                        styles.choiceRowBtn,
                        isSelected && styles.choiceRowSelected,
                      ]}
                      onPress={() => {
                        playSoundEffect('button');
                        setDailyMinutes(target.minutes);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      activeOpacity={0.86}
                    >
                      <View
                        style={[
                          styles.choiceIconBadge,
                          {
                            backgroundColor: target.tint,
                            borderColor: isSelected ? target.color : 'rgba(255,255,255,0.08)',
                          },
                        ]}
                      >
                        <Ionicons name={target.icon} size={20} color={target.color} />
                      </View>

                      <View style={styles.choiceTextCol}>
                        <View style={styles.tierHeaderRow}>
                          <Text
                            style={[
                              styles.choiceTitle,
                              isSelected && styles.choiceTitleSelected,
                            ]}
                          >
                            {target.minutes} min / day
                          </Text>
                          {target.popular && (
                            <View style={styles.popularBadge}>
                              <Text style={styles.popularBadgeText}>POPULAR</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.choiceSubtitle}>
                          {target.tier} pace · {target.xp}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.choiceCheckCircle,
                          isSelected && styles.choiceCheckCircleSelected,
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* STEP 2: YOUR NAME + SELECTED GOAL RECAP PILLS */}
            {signupStep === 2 && (
              <View>
                <View style={styles.recapPillsRow}>
                  {selectedGoal && (
                    <View style={styles.recapPill}>
                      <Ionicons name="sparkles" size={12} color={THEME.colors.gold} />
                      <Text style={styles.recapPillText}>{selectedGoal}</Text>
                    </View>
                  )}
                  <View style={styles.recapPill}>
                    <Ionicons name="flame" size={12} color={THEME.colors.primaryGlow} />
                    <Text style={styles.recapPillText}>{dailyMinutes} min / day</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.singleInputBox,
                    focusedField === 'signupName' && styles.inputBoxFocused,
                  ]}
                >
                  <Text style={styles.inputLabel}>YOUR NAME</Text>
                  <View style={styles.singleInputRow}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={
                        focusedField === 'signupName' || signupName.length > 0
                          ? THEME.colors.primaryGlow
                          : THEME.colors.textMuted
                      }
                    />
                    <TextInput
                      style={styles.singleInput}
                      placeholder="Enter your first name"
                      placeholderTextColor="#7D7898"
                      value={signupName}
                      onFocus={() => setFocusedField('signupName')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(txt) => {
                        setSignupName(txt);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={handleSignupNext}
                    />
                    {trimmedName.length >= 2 && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={THEME.colors.accent}
                      />
                    )}
                  </View>
                </View>

                <Text style={styles.helperCaption}>
                  Nila will greet you personally during voice calls and lessons.
                </Text>
              </View>
            )}

            {/* STEP 3: EMAIL + PASSWORD CONNECTED BOX + STRENGTH METER + SOCIAL SAVE */}
            {signupStep === 3 && (
              <View>
                <View
                  style={[
                    styles.groupedInputsBox,
                    isFinalStepBoxFocused && styles.inputBoxFocused,
                  ]}
                >
                  <View style={styles.signupFieldRow}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color={
                        focusedField === 'signupEmail' || signupEmail.length > 0
                          ? THEME.colors.primaryGlow
                          : THEME.colors.textMuted
                      }
                    />
                    <TextInput
                      style={styles.signupFieldInput}
                      placeholder="Email address"
                      placeholderTextColor="#7D7898"
                      value={signupEmail}
                      onFocus={() => setFocusedField('signupEmail')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(txt) => {
                        setSignupEmail(txt);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="next"
                    />
                    {/\S+@\S+\.\S+/.test(signupEmail.trim()) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={19}
                        color={THEME.colors.accent}
                      />
                    )}
                  </View>

                  <View
                    style={[
                      styles.groupedDivider,
                      isFinalStepBoxFocused && styles.groupedDividerFocused,
                    ]}
                  />

                  <View style={styles.signupFieldRow}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={
                        focusedField === 'signupPass' || signupPassword.length > 0
                          ? THEME.colors.primaryGlow
                          : THEME.colors.textMuted
                      }
                    />
                    <TextInput
                      style={styles.signupFieldInput}
                      placeholder="Create password (6+ chars)"
                      placeholderTextColor="#7D7898"
                      value={signupPassword}
                      onFocus={() => setFocusedField('signupPass')}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(txt) => {
                        setSignupPassword(txt);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleSignupNext}
                    />
                    <TouchableOpacity
                      style={styles.eyeToggleBtn}
                      onPress={() => setShowPassword((prev) => !prev)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={19}
                        color={THEME.colors.primaryGlow}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.strengthRow}>
                  <View style={styles.strengthBarsWrap}>
                    {[1, 2, 3].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          passwordStrength.bars >= level && {
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.strengthLabel,
                      { color: passwordStrength.color },
                    ]}
                  >
                    {passwordStrength.label}
                  </Text>
                </View>

                <SocialQuickAuth
                  dividerLabel="OR SAVE WITH"
                  isSubmitting={isSubmitting}
                  onSocialAuth={handleQuickSocialAuth}
                />
              </View>
            )}

            {errorMsg && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color={THEME.colors.gold} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Pinned Bottom 3D Continue / Create CTA */}
        <View style={styles.signupFooterDock}>
          <TouchableOpacity
            style={[
              styles.primaryBevelBtn,
              !canProceedSignup && styles.bevelBtnDisabled,
            ]}
            onPress={handleSignupNext}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.primaryBevelText,
                  !canProceedSignup && styles.bevelBtnTextDisabled,
                ]}
              >
                {signupStep === 3 ? 'CREATE ACCOUNT' : 'CONTINUE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    position: 'relative',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  onboardingGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },

  /* WELCOME VIEW (Clean baseline preserved) */
  welcomeShell: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  welcomeHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  speechBubble: {
    backgroundColor: '#19162B',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    position: 'relative',
    alignItems: 'center',
  },
  speechBubbleText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  speechTail: {
    position: 'absolute',
    bottom: -7,
    width: 12,
    height: 12,
    backgroundColor: '#19162B',
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    transform: [{ rotate: '45deg' }],
  },
  mascotHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  mascotRing: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2.5,
    borderColor: THEME.colors.primaryGlow,
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  mascotImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.07 }],
  },
  brandWordmark: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 28,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  brandTagline: {
    fontFamily: THEME.fonts.body,
    fontSize: 14,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 6,
    paddingHorizontal: 14,
  },
  welcomeBottomStack: {
    gap: 12,
  },

  /* SIGNATURE DUOLINGO 3D BEVEL BUTTONS */
  primaryBevelBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.22)',
    borderBottomWidth: 4.5,
    borderBottomColor: THEME.colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBevelText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  secondaryBevelBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#151422',
    borderWidth: 1.5,
    borderColor: '#2E2B45',
    borderBottomWidth: 4,
    borderBottomColor: '#221F33',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBevelText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 13.5,
    color: '#C4B5FD',
    letterSpacing: 0.6,
  },
  bevelBtnDisabled: {
    backgroundColor: '#231F3A',
    borderWidth: 1.5,
    borderColor: '#352F54',
    borderTopColor: '#352F54',
    borderBottomWidth: 4,
    borderBottomColor: '#19162B',
  },
  bevelBtnTextDisabled: {
    color: '#8E88AC',
  },

  /* LOGIN & SHARED AUTH HEADER */
  authScrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  authTopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  authNavTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16.5,
    color: '#E9D5FF',
  },
  navSpacer: {
    width: 36,
  },
  formBody: {
    flex: 1,
  },
  groupedInputsBox: {
    backgroundColor: '#19172B',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#342F52',
    overflow: 'hidden',
  },
  inputBoxFocused: {
    borderColor: THEME.colors.primaryGlow,
    backgroundColor: '#1F1B35',
  },
  groupedTopInput: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  groupedDivider: {
    height: 1.5,
    backgroundColor: '#312B4D',
  },
  groupedDividerFocused: {
    backgroundColor: 'rgba(167, 139, 250, 0.38)',
  },
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupedBottomInput: {
    flex: 1,
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  eyeToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  errorText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: THEME.colors.gold,
    flex: 1,
  },
  formSubmitGap: {
    marginTop: 16,
  },
  forgotLinkWrap: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 12.5,
    color: '#A78BFA',
    letterSpacing: 0.6,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 26,
    marginBottom: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(196, 181, 253, 0.14)',
  },
  orText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#8E88AC',
    letterSpacing: 0.9,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBevelBtn: {
    flex: 1,
    height: 49,
    borderRadius: 15,
    backgroundColor: '#19172B',
    borderWidth: 1.5,
    borderColor: '#363055',
    borderBottomWidth: 4,
    borderBottomColor: '#231F3A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  socialBevelText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 12.5,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  switchFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 22,
  },
  switchMuted: {
    fontFamily: THEME.fonts.body,
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  switchAction: {
    fontFamily: THEME.fonts.bold,
    fontSize: 13,
    color: '#C4B5FD',
  },
  legalCaption: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 24,
  },

  /* ONBOARDING + SIGN UP WIZARD (AFTER CLICKING GET STARTED) */
  signupShell: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  signupTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  onboardingBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupProgressTrack: {
    flex: 1,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#211D36',
    borderWidth: 1,
    borderColor: '#342E54',
    overflow: 'hidden',
  },
  signupProgressFill: {
    height: '100%',
    borderRadius: 5,
    paddingTop: 2,
    paddingHorizontal: 4,
  },
  progressShineBar: {
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  stepPillBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#1E1A33',
    borderWidth: 1,
    borderColor: '#38315A',
  },
  stepFractionText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },
  signupScroll: {
    flex: 1,
  },
  signupScrollContent: {
    paddingBottom: 24,
  },
  promptCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  miniMascotHalo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.24)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryGlow,
  },
  miniMascotRing: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  coachBubble: {
    flex: 1,
    backgroundColor: '#201B3B',
    borderWidth: 1.5,
    borderColor: '#5B49A8',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 11,
    position: 'relative',
  },
  coachBubbleTail: {
    position: 'absolute',
    left: -6.5,
    top: '50%',
    marginTop: -5.5,
    width: 11,
    height: 11,
    backgroundColor: '#201B3B',
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#5B49A8',
    transform: [{ rotate: '45deg' }],
  },
  coachBubbleText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13.5,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  stepHeadline: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 21,
    color: '#FFFFFF',
    marginBottom: 14,
  },

  /* INTERACTIVE DUOLINGO CHOICE ROWS */
  choiceList: {
    gap: 11,
  },
  choiceRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#18162A',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#312C4E',
    borderBottomWidth: 4,
    borderBottomColor: '#211D37',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  choiceRowSelected: {
    backgroundColor: '#261E47',
    borderColor: '#A78BFA',
    borderBottomColor: THEME.colors.primaryBorder,
  },
  choiceIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceTextCol: {
    flex: 1,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  choiceTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 14.5,
    color: '#F3EEFF',
  },
  choiceTitleSelected: {
    color: '#FFFFFF',
  },
  choiceSubtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: '#A5A1B8',
    marginTop: 2,
  },
  popularBadge: {
    backgroundColor: 'rgba(127, 67, 254, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.5)',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 9.5,
    color: '#E9D5FF',
    letterSpacing: 0.5,
  },
  choiceCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#433C68',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceCheckCircleSelected: {
    backgroundColor: THEME.colors.primary,
    borderColor: '#A78BFA',
  },
  stepZeroLinks: {
    alignItems: 'center',
    marginTop: 10,
  },

  /* STEP 2-3 FORM CONTROLS */
  recapPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  recapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E1A33',
    borderWidth: 1,
    borderColor: '#37305A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  recapPillText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#DDD6FE',
  },
  singleInputBox: {
    backgroundColor: '#19172B',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#342F52',
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 5,
  },
  inputLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: '#C4B5FD',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  singleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  singleInput: {
    flex: 1,
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15.5,
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  helperCaption: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: '#9C96B8',
    marginTop: 10,
    paddingHorizontal: 2,
    lineHeight: 18,
  },
  signupFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
  },
  signupFieldInput: {
    flex: 1,
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 15,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  strengthBarsWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#272242',
  },
  strengthLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
  },
  signupFooterDock: {
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: THEME.colors.background,
  },
});
