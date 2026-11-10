import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';

interface AnimatedSplashScreenProps {
  isReady: boolean;
  fontsLoaded: boolean;
  onExiting?: () => void;
  onFinish: () => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MIN_SPLASH_MS = 1350;

/**
 * Custom animated Karka splash screen layered over disabled Android static native splash.
 */
export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isReady,
  fontsLoaded,
  onExiting,
  onFinish,
}) => {
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitStartedRef = useRef(false);
  const onExitingRef = useRef(onExiting);
  const onFinishRef = useRef(onFinish);
  onExitingRef.current = onExiting;
  onFinishRef.current = onFinish;

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const heroExitScale = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(0.68)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const rippleScale = useRef(new Animated.Value(0.75)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkSlideY = useRef(new Animated.Value(14)).current;
  const loaderProgress = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnim = Animated.parallel([
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 6.5,
        tension: 68,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.delay(90),
        Animated.parallel([
          Animated.timing(rippleOpacity, {
            toValue: 0.72,
            duration: 180,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(rippleScale, {
            toValue: 1.58,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.timing(rippleOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(wordmarkSlideY, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(260),
        Animated.timing(loaderProgress, {
          toValue: 1,
          duration: 950,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    ]);

    const auraLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(auraPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    entranceAnim.start();
    auraLoop.start();

    const timer = setTimeout(() => {
      setMinDelayDone(true);
    }, MIN_SPLASH_MS);

    return () => {
      clearTimeout(timer);
      entranceAnim.stop();
      auraLoop.stop();
    };
  }, [
    auraPulse,
    badgeOpacity,
    badgeScale,
    loaderProgress,
    rippleOpacity,
    rippleScale,
    wordmarkOpacity,
    wordmarkSlideY,
  ]);

  useEffect(() => {
    if (!isReady || !minDelayDone || exitStartedRef.current) return;
    exitStartedRef.current = true;
    setIsExiting(true);
    onExitingRef.current?.();

    const exitAnim = Animated.parallel([
      Animated.timing(heroExitScale, {
        toValue: 1.07,
        duration: 320,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]);

    exitAnim.start(({ finished }) => {
      if (finished) {
        onFinishRef.current();
      }
    });

    return () => exitAnim.stop();
  }, [containerOpacity, heroExitScale, isReady, minDelayDone]);

  const auraScale = auraPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  });

  return (
    <Animated.View
      style={[styles.overlay, { opacity: containerOpacity }]}
      pointerEvents={isExiting ? 'none' : 'auto'}
    >
      {/* Ambient Radial Cyber-Violet Glow Matching Obsidian Launch Color */}
      <Animated.View
        style={[styles.auraWrap, { transform: [{ scale: auraScale }] }]}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%" viewBox="0 0 360 360">
          <Defs>
            <RadialGradient id="splashAura" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#7F43FE" stopOpacity="0.34" />
              <Stop offset="48%" stopColor="#4C089C" stopOpacity="0.16" />
              <Stop offset="100%" stopColor="#0E0E14" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="180" cy="180" r="180" fill="url(#splashAura)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[styles.centerStage, { transform: [{ scale: heroExitScale }] }]}
      >
        {/* Icon Squircle + Expanding Ripple Halo */}
        <View style={styles.emblemStage}>
          <Animated.View
            style={[
              styles.rippleRing,
              {
                opacity: rippleOpacity,
                transform: [{ scale: rippleScale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.iconSquircle,
              {
                opacity: badgeOpacity,
                transform: [{ scale: badgeScale }],
              },
            ]}
          >
            <Image
              source={SUPERNOVA_IMAGES.appIcon}
              style={styles.iconImg}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* Wordmark + Progress Bar */}
        <Animated.View
          style={[
            styles.wordmarkGroup,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkSlideY }],
            },
          ]}
        >
          <Image
            source={SUPERNOVA_IMAGES.karkaLogo}
            style={styles.wordmarkImg}
            resizeMode="contain"
          />

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFillWrap,
                { transform: [{ scaleX: loaderProgress }] },
              ]}
            >
              <LinearGradient
                colors={['#C4B5FD', '#7F43FE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressFillGradient}
              />
            </Animated.View>
          </View>

          {fontsLoaded && (
            <Text style={styles.subtitleText}>Speak English effortlessly</Text>
          )}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  auraWrap: {
    position: 'absolute',
    width: 340,
    height: 340,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emblemStage: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  rippleRing: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#A78BFA',
  },
  iconSquircle: {
    width: 88,
    height: 88,
    borderRadius: 25,
    backgroundColor: '#4C089C',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 181, 253, 0.45)',
    overflow: 'hidden',
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.48,
    shadowRadius: 18,
    elevation: 12,
  },
  iconImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  wordmarkGroup: {
    alignItems: 'center',
  },
  wordmarkImg: {
    width: 116,
    height: 34,
    marginBottom: 18,
  },
  progressTrack: {
    width: 116,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#1E1A33',
    overflow: 'hidden',
  },
  progressFillWrap: {
    width: '100%',
    height: '100%',
  },
  progressFillGradient: {
    flex: 1,
    borderRadius: 2,
  },
  subtitleText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: '#A5A1B8',
    letterSpacing: 0.3,
    marginTop: 14,
  },
});
