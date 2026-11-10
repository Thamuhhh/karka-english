import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { AuthUser } from '../types';
import { saveAuthUser } from '../services/storageService';
import { playSoundEffect } from '../services/soundEffectsService';

type AuthMode = 'welcome' | 'login' | 'signup';

interface AuthScreenProps {
  onAuthenticated: (user: AuthUser) => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MAX_CONTENT_WIDTH = 440;

const SIGNUP_PROMPTS = [
  'First, what should I call you?',
  'Great! Where should we save your progress?',
  'Last step — set a quick password.',
];

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

/**
 * Duolingo-inspired tactile Obsidian onboarding, Sign Up wizard, and Sign In screen.
 */
export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [signupStep, setSignupStep] = useState<0 | 1 | 2>(0);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transitionAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = () => {
    transitionAnim.setValue(0.4);
    Animated.timing(transitionAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  };

  const switchMode = (nextMode: AuthMode) => {
    setErrorMsg(null);
    setShowPassword(false);
    if (nextMode === 'signup') {
      setSignupStep(0);
    }
    setMode(nextMode);
    animateTransition();
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
    if (signupStep > 0) {
      setSignupStep((prev) => (prev - 1) as 0 | 1 | 2);
      animateTransition();
    } else {
      switchMode('welcome');
    }
  };

  const handleSignupNext = async () => {
    setErrorMsg(null);
    if (signupStep === 0) {
      if (signupName.trim().length < 2) {
        setErrorMsg('Please enter at least 2 characters for your name.');
        return;
      }
      setSignupStep(1);
      animateTransition();
      return;
    }

    if (signupStep === 1) {
      const email = signupEmail.trim();
      if (!/\S+@\S+\.\S+/.test(email)) {
        setErrorMsg('Enter a valid email address (example: name@domain.com).');
        return;
      }
      setSignupStep(2);
      animateTransition();
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Create a password with at least 6 characters.');
      return;
    }

    await completeAuth({
      name: signupName.trim(),
      email: signupEmail.trim().toLowerCase(),
      provider: 'email',
      createdAt: new Date().toISOString(),
    });
  };

  const handleQuickSocialAuth = async (provider: 'google' | 'guest') => {
    setErrorMsg(null);
    playSoundEffect('button');
    if (provider === 'google') {
      await completeAuth({
        name: 'Alex',
        email: 'alex@gmail.com',
        provider: 'google',
        createdAt: new Date().toISOString(),
      });
      return;
    }
    await completeAuth({
      name: 'Guest Learner',
      email: '',
      provider: 'guest',
      createdAt: new Date().toISOString(),
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
    opacity: transitionAnim,
    transform: [
      {
        translateY: transitionAnim.interpolate({
          inputRange: [0.4, 1],
          outputRange: [8, 0],
        }),
      },
    ],
  };

  /* ========================================================================= */
  /* VIEW 1: DUOLINGO-STYLE WELCOME ONBOARDING                                 */
  /* ========================================================================= */
  if (mode === 'welcome') {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(127, 67, 254, 0.14)', 'rgba(14, 14, 20, 0)']}
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

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            <View style={styles.groupedInputsBox}>
              <TextInput
                style={styles.groupedTopInput}
                placeholder="Email or username"
                placeholderTextColor={THEME.colors.textMuted}
                value={loginIdentifier}
                onChangeText={(txt) => {
                  setLoginIdentifier(txt);
                  if (errorMsg) setErrorMsg(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />

              <View style={styles.groupedDivider} />

              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.groupedBottomInput}
                  placeholder="Password"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={loginPassword}
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

            {/* Quick Auth Divider & Options */}
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity
                style={styles.socialBevelBtn}
                onPress={() => handleQuickSocialAuth('google')}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-google" size={16} color="#FFFFFF" />
                <Text style={styles.socialBevelText}>GOOGLE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialBevelBtn}
                onPress={() => handleQuickSocialAuth('guest')}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <Ionicons name="person-outline" size={16} color="#C4B5FD" />
                <Text style={styles.socialBevelText}>GUEST</Text>
              </TouchableOpacity>
            </View>

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
  /* VIEW 3: DUOLINGO-STYLE 3-STEP SIGN UP WIZARD                              */
  /* ========================================================================= */
  const progressFraction = (signupStep + 1) / 3;
  const canProceedSignup =
    !isSubmitting &&
    ((signupStep === 0 && signupName.trim().length >= 2) ||
      (signupStep === 1 && /\S+@\S+\.\S+/.test(signupEmail.trim())) ||
      (signupStep === 2 && signupPassword.length >= 6));

  const signupPromptText =
    signupStep === 1 && signupName.trim()
      ? `Nice to meet you, ${signupName.trim()}! Enter your email.`
      : SIGNUP_PROMPTS[signupStep];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.signupShell}>
        {/* Duolingo Top Back Arrow + Progress Track */}
        <View style={styles.signupTopRow}>
          <TouchableOpacity
            style={styles.navBackBtn}
            onPress={handleSignupBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={THEME.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.signupProgressTrack}>
            <View
              style={[
                styles.signupProgressFill,
                { width: `${Math.round(progressFraction * 100)}%` },
              ]}
            />
          </View>

          <Text style={styles.stepFractionText}>{signupStep + 1}/3</Text>
        </View>

        <ScrollView
          style={styles.signupScroll}
          contentContainerStyle={styles.signupScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={renderAnimatedViewStyle}>
            {/* Mini Mascot + Conversational Prompt Bubble */}
            <View style={styles.promptCoachRow}>
              <View style={styles.miniMascotRing}>
                <Image
                  source={SUPERNOVA_IMAGES.novaAvatar}
                  style={styles.mascotImg}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.coachBubble}>
                <Text style={styles.coachBubbleText}>{signupPromptText}</Text>
              </View>
            </View>

            {/* Step Input Field */}
            {signupStep === 0 && (
              <View style={styles.singleInputBox}>
                <Text style={styles.inputLabel}>YOUR NAME</Text>
                <TextInput
                  style={styles.singleInput}
                  placeholder="Enter your name"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={signupName}
                  onChangeText={(txt) => {
                    setSignupName(txt);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={handleSignupNext}
                />
              </View>
            )}

            {signupStep === 1 && (
              <View style={styles.singleInputBox}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.singleInput}
                  placeholder="you@example.com"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={signupEmail}
                  onChangeText={(txt) => {
                    setSignupEmail(txt);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={handleSignupNext}
                />
              </View>
            )}

            {signupStep === 2 && (
              <View style={styles.singleInputBox}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    style={[styles.singleInput, { flex: 1 }]}
                    placeholder="At least 6 characters"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={signupPassword}
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
            )}

            {errorMsg && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color={THEME.colors.gold} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {signupStep === 0 && (
              <View style={styles.signupAltSection}>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>QUICK START</Text>
                  <View style={styles.orLine} />
                </View>

                <View style={styles.socialRow}>
                  <TouchableOpacity
                    style={styles.socialBevelBtn}
                    onPress={() => handleQuickSocialAuth('google')}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="logo-google" size={16} color="#FFFFFF" />
                    <Text style={styles.socialBevelText}>GOOGLE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.socialBevelBtn}
                    onPress={() => handleQuickSocialAuth('guest')}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-outline" size={16} color="#C4B5FD" />
                    <Text style={styles.socialBevelText}>GUEST</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.switchFooterRow}>
                  <Text style={styles.switchMuted}>Already have a profile?</Text>
                  <TouchableOpacity onPress={() => switchMode('login')} activeOpacity={0.75}>
                    <Text style={styles.switchAction}>Sign in</Text>
                  </TouchableOpacity>
                </View>
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
                {signupStep === 2 ? 'CREATE ACCOUNT' : 'CONTINUE'}
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

  /* WELCOME VIEW */
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
    transform: [{ scale: 1.04 }],
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
    borderBottomWidth: 4,
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
    backgroundColor: '#221F33',
    borderBottomWidth: 0,
  },
  bevelBtnTextDisabled: {
    color: '#6E6A85',
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
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2E2B45',
    overflow: 'hidden',
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
    backgroundColor: '#2E2B45',
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
    marginTop: 10,
    paddingHorizontal: 2,
  },
  errorText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  orText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    letterSpacing: 0.9,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialBevelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#151422',
    borderWidth: 1.5,
    borderColor: '#2E2B45',
    borderBottomWidth: 3.5,
    borderBottomColor: '#221F33',
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
    color: THEME.colors.primaryGlow,
  },
  legalCaption: {
    fontFamily: THEME.fonts.body,
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 24,
  },

  /* SIGN UP PROGRESS WIZARD */
  signupShell: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  signupTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 22,
  },
  signupProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#221F33',
    overflow: 'hidden',
  },
  signupProgressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: THEME.colors.primary,
  },
  stepFractionText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
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
    gap: 12,
    marginBottom: 24,
  },
  miniMascotRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: THEME.colors.primaryGlow,
    backgroundColor: '#161423',
    overflow: 'hidden',
  },
  coachBubble: {
    flex: 1,
    backgroundColor: '#181629',
    borderWidth: 1.5,
    borderColor: '#2D2947',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  coachBubbleText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  singleInputBox: {
    backgroundColor: '#151422',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2E2B45',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  inputLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primaryGlow,
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  singleInput: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 16,
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  signupAltSection: {
    marginTop: 8,
  },
  signupFooterDock: {
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: THEME.colors.background,
  },
});
