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
import { hydrateUserCloudSession } from '../services/storageService';
import {
  resendVerificationEmail,
  sendPasswordReset,
  signInAsGuest,
  signInWithEmail,
  signInWithGoogleOAuth,
  signUpWithEmail,
} from '../services/authService';
import { playSoundEffect } from '../services/soundEffectsService';
import { KarkaWordmark } from '../components/KarkaBrand';

type AuthMode = 'welcome' | 'login' | 'signup';
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
 * Duolingo-inspired tactile Obsidian Welcome, Sign In, and Sign Up screen.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthenticated,
  onTopColorChange,
}) => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [focusedField, setFocusedField] = useState<FocusField>(null);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginPassRef = useRef<TextInput>(null);
  const signupEmailRef = useRef<TextInput>(null);
  const signupPassRef = useRef<TextInput>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const coachBobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    onTopColorChange?.(AUTH_TOP_COLORS[mode]);
  }, [mode, onTopColorChange]);

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
    slideAnim.setValue(8);
    const anim = Animated.timing(slideAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    anim.start();
    return () => anim.stop();
  }, [mode, slideAnim]);

  const switchMode = (nextMode: AuthMode) => {
    setErrorMsg(null);
    setFocusedField(null);
    setShowPassword(false);
    setMode(nextMode);
  };

  const completeAuth = async (user: AuthUser) => {
    await hydrateUserCloudSession(user);
    playSoundEffect('success');
    onAuthenticated(user);
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
    setIsSubmitting(true);
    try {
      const result = await signInWithEmail(id, loginPassword);
      if (result.needsEmailVerification) {
        const cleanEmail = id.trim().toLowerCase();
        setErrorMsg(result.error || 'Verify your email before signing in.');
        Alert.alert(
          'Email Not Verified',
          `Check ${cleanEmail} for the verification link, then try signing in again.`,
          [
            {
              text: 'Resend Link',
              onPress: async () => {
                const resend = await resendVerificationEmail(cleanEmail);
                Alert.alert(
                  resend.error ? 'Resend Failed' : 'Verification Sent',
                  resend.error || `Sent a fresh confirmation link to ${cleanEmail}.`
                );
              },
            },
            { text: 'OK' },
          ]
        );
        return;
      }

      if (result.error || !result.user) {
        setErrorMsg(result.error || 'Could not sign in. Please try again.');
        return;
      }

      await completeAuth(result.user);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async () => {
    const name = signupName.trim();
    const email = signupEmail.trim();
    if (name.length < 2) {
      setErrorMsg('Please enter at least 2 characters for your name.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Enter a valid email address (example: name@domain.com).');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Create a password with at least 6 characters.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail(name, email, signupPassword);
      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      if (result.needsEmailVerification) {
        const cleanEmail = email.toLowerCase();
        Alert.alert(
          'Verify Your Email',
          `We sent a confirmation link to ${cleanEmail}. Open that link first, then sign in with your password.`,
          [
            {
              text: 'Go to Sign In',
              onPress: () => {
                setLoginIdentifier(cleanEmail);
                switchMode('login');
              },
            },
          ]
        );
        return;
      }

      if (result.user) {
        await completeAuth(result.user);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSocialAuth = async (provider: 'google' | 'guest') => {
    setErrorMsg(null);
    playSoundEffect('button');
    setIsSubmitting(true);
    try {
      if (provider === 'google') {
        const result = await signInWithGoogleOAuth();
        if (result.error) {
          setErrorMsg(result.error);
          return;
        }
        if (result.user) {
          await completeAuth(result.user);
        }
        return;
      }

      const result = await signInAsGuest(signupName.trim() || 'Guest Learner');
      if (result.error || !result.user) {
        setErrorMsg(result.error || 'Guest sign-in unavailable right now.');
        return;
      }
      await completeAuth(result.user);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const id = loginIdentifier.trim();
    if (!id || !/\S+@\S+\.\S+/.test(id)) {
      Alert.alert(
        'Reset Password',
        'Enter your registered email address in the email field above, then tap Forgot Password again.',
        [{ text: 'OK' }]
      );
      return;
    }

    const res = await sendPasswordReset(id);
    if (res.error) {
      setErrorMsg(res.error);
      return;
    }
    Alert.alert(
      'Reset Link Sent',
      `We sent a password recovery link to ${id.toLowerCase()}. Check your inbox and spam folder.`,
      [{ text: 'OK' }]
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

            <KarkaWordmark width={136} height={40} style={styles.brandWordmarkWrap} />
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
            <View style={styles.navBrandRight}>
              <KarkaWordmark width={52} height={16} />
            </View>
          </View>

          <Animated.View style={[styles.formBody, renderAnimatedViewStyle]}>
            {/* Duolingo Connected 2-Input Stack */}
            <View
              style={[
                styles.groupedInputsBox,
                isLoginGroupFocused && styles.inputBoxFocused,
              ]}
            >
              <View style={styles.fieldRow}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={
                    focusedField === 'loginId' || loginIdentifier.length > 0
                      ? THEME.colors.primaryGlow
                      : THEME.colors.textMuted
                  }
                />
                <TextInput
                  style={styles.groupedInput}
                  placeholder="Email or username"
                  placeholderTextColor="#7D7898"
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
                  onSubmitEditing={() => loginPassRef.current?.focus()}
                />
              </View>

              <View
                style={[
                  styles.groupedDivider,
                  isLoginGroupFocused && styles.groupedDividerFocused,
                ]}
              />

              <View style={styles.fieldRow}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={
                    focusedField === 'loginPass' || loginPassword.length > 0
                      ? THEME.colors.primaryGlow
                      : THEME.colors.textMuted
                  }
                />
                <TextInput
                  ref={loginPassRef}
                  style={styles.groupedInput}
                  placeholder="Password"
                  placeholderTextColor="#7D7898"
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
            By signing in to Karka, you agree to our Terms and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ========================================================================= */
  /* VIEW 3: SINGLE-SCREEN DUOLINGO SIGN UP (NAME + EMAIL + PASSWORD)          */
  /* ========================================================================= */
  const isNameValid = signupName.trim().length >= 2;
  const isEmailValid = /\S+@\S+\.\S+/.test(signupEmail.trim());
  const canSubmitSignup =
    isNameValid && isEmailValid && signupPassword.length >= 6 && !isSubmitting;
  const isSignupGroupFocused =
    focusedField === 'signupName' ||
    focusedField === 'signupEmail' ||
    focusedField === 'signupPass';
  const passwordStrength = getPasswordStrength(signupPassword);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[AUTH_TOP_COLORS.signup, 'rgba(91, 33, 182, 0.08)', 'rgba(14, 14, 20, 0)']}
        style={styles.onboardingGlow}
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
          <Text style={styles.authNavTitle}>Create your profile</Text>
          <View style={styles.navBrandRight}>
            <KarkaWordmark width={52} height={16} />
          </View>
        </View>

        <Animated.View style={[styles.formBody, renderAnimatedViewStyle]}>
          {/* Mini Nila Coach Greeting */}
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
              <Text style={styles.coachBubbleText}>
                Vanakkam! Enter your name, email &amp; password to start speaking.
              </Text>
            </View>
          </View>

          {/* Duolingo Connected 3-Input Box (Name + Email + Password) */}
          <View
            style={[
              styles.groupedInputsBox,
              isSignupGroupFocused && styles.inputBoxFocused,
            ]}
          >
            <View style={styles.fieldRow}>
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
                style={styles.groupedInput}
                placeholder="Your name"
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
                onSubmitEditing={() => signupEmailRef.current?.focus()}
              />
              {isNameValid && (
                <Ionicons name="checkmark-circle" size={19} color={THEME.colors.accent} />
              )}
            </View>

            <View
              style={[
                styles.groupedDivider,
                isSignupGroupFocused && styles.groupedDividerFocused,
              ]}
            />

            <View style={styles.fieldRow}>
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
                ref={signupEmailRef}
                style={styles.groupedInput}
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
                onSubmitEditing={() => signupPassRef.current?.focus()}
              />
              {isEmailValid && (
                <Ionicons name="checkmark-circle" size={19} color={THEME.colors.accent} />
              )}
            </View>

            <View
              style={[
                styles.groupedDivider,
                isSignupGroupFocused && styles.groupedDividerFocused,
              ]}
            />

            <View style={styles.fieldRow}>
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
                ref={signupPassRef}
                style={styles.groupedInput}
                placeholder="Password (6+ characters)"
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
                onSubmitEditing={handleSignupSubmit}
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
            <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
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
              !canSubmitSignup && styles.bevelBtnDisabled,
            ]}
            onPress={handleSignupSubmit}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.primaryBevelText,
                  !canSubmitSignup && styles.bevelBtnTextDisabled,
                ]}
              >
                CREATE ACCOUNT
              </Text>
            )}
          </TouchableOpacity>

          <SocialQuickAuth
            dividerLabel="OR SIGN UP WITH"
            isSubmitting={isSubmitting}
            onSocialAuth={handleQuickSocialAuth}
          />

          <View style={styles.switchFooterRow}>
            <Text style={styles.switchMuted}>Already have a profile?</Text>
            <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.75}>
              <Text style={styles.switchAction}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.legalCaption}>
          By creating an account on Karka, you agree to our Terms and Privacy Policy.
        </Text>
      </ScrollView>
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
  brandWordmarkWrap: {
    marginTop: 6,
    marginBottom: 4,
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

  /* LOGIN & SIGN UP SHARED FORM STYLES */
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
    marginBottom: 22,
  },
  navBackBtn: {
    width: 52,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  authNavTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 16.5,
    color: '#E9D5FF',
  },
  navBrandRight: {
    width: 52,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  formBody: {
    flex: 1,
  },
  promptCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  miniMascotHalo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    padding: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.24)',
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryGlow,
  },
  miniMascotRing: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  coachBubble: {
    flex: 1,
    backgroundColor: '#201B3B',
    borderWidth: 1.5,
    borderColor: '#5B49A8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 19,
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
  },
  groupedInput: {
    flex: 1,
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 15,
  },
  groupedDivider: {
    height: 1.5,
    backgroundColor: '#312B4D',
  },
  groupedDividerFocused: {
    backgroundColor: 'rgba(167, 139, 250, 0.38)',
  },
  eyeToggleBtn: {
    paddingLeft: 10,
    paddingVertical: 12,
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
    marginTop: 18,
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
    marginTop: 24,
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
    marginTop: 22,
  },
});
