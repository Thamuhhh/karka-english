import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { MASCOT_EXPRESSIONS } from '../constants/supernovaAssets';
import { ElvateWordmark } from './ElvateBrand';
import { SplashLottie } from './SplashLottie';

// Replace this file with any custom Lottie .json from LottieFiles.com to customize the backdrop burst.
const SPLASH_LOTTIE_SOURCE = require('../../assets/lottie/elvate-splash.json');

interface AnimatedSplashScreenProps {
  isReady: boolean;
  fontsLoaded: boolean;
  onExiting?: () => void;
  onFinish: () => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MIN_SPLASH_MS = 680;
const FALLBACK_LOTTIE_MS = 1050;

/**
 * Custom Lottie + Fox Mascot Elvate splash screen layered seamlessly over the dark native launch background.
 */
export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  isReady,
  fontsLoaded,
  onExiting,
  onFinish,
}) => {
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [lottieDone, setLottieDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const exitStartedRef = useRef(false);
  const onExitingRef = useRef(onExiting);
  const onFinishRef = useRef(onFinish);
  onExitingRef.current = onExiting;
  onFinishRef.current = onFinish;

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const heroExitScale = useRef(new Animated.Value(1)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const mascotScale = useRef(new Animated.Value(0.62)).current;
  const mascotSlideY = useRef(new Animated.Value(20)).current;
  const mascotTilt = useRef(new Animated.Value(-1)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkSlideY = useRef(new Animated.Value(12)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;

  const handleLottieFinish = useCallback(() => {
    setLottieDone(true);
  }, []);

  useEffect(() => {
    const entranceAnim = Animated.parallel([
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(mascotScale, {
        toValue: 1,
        friction: 5.8,
        tension: 105,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(mascotSlideY, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(mascotTilt, {
          toValue: 0.7,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(mascotTilt, {
          toValue: 0,
          duration: 220,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.sequence([
        Animated.delay(140),
        Animated.parallel([
          Animated.timing(wordmarkOpacity, {
            toValue: 1,
            duration: 260,
            easing: Easing.out(Easing.quad),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(wordmarkSlideY, {
            toValue: 0,
            duration: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
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

    const minTimer = setTimeout(() => {
      setMinDelayDone(true);
    }, MIN_SPLASH_MS);

    // Safety fallback so a looping or slow custom Lottie never traps the user on launch.
    const fallbackTimer = setTimeout(() => {
      setLottieDone(true);
    }, FALLBACK_LOTTIE_MS);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(fallbackTimer);
      entranceAnim.stop();
      auraLoop.stop();
    };
  }, [
    auraPulse,
    mascotOpacity,
    mascotScale,
    mascotSlideY,
    mascotTilt,
    wordmarkOpacity,
    wordmarkSlideY,
  ]);

  useEffect(() => {
    if (!isReady || !minDelayDone || !lottieDone || exitStartedRef.current) return;
    exitStartedRef.current = true;
    setIsExiting(true);
    onExitingRef.current?.();

    const exitAnim = Animated.parallel([
      Animated.timing(heroExitScale, {
        toValue: 1.05,
        duration: 220,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 220,
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
  }, [containerOpacity, heroExitScale, isReady, lottieDone, minDelayDone]);

  const auraScale = auraPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1.08],
  });

  const mascotRotate = mascotTilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-7deg', '0deg', '6deg'],
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
              <Stop offset="48%" stopColor="#4C089C" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#0E0E14" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx="180" cy="180" r="180" fill="url(#splashAura)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[styles.centerStage, { transform: [{ scale: heroExitScale }] }]}
      >
        {/* Lottie Vector Burst + Fox Mascot Hero */}
        <View style={styles.mascotStage}>
          <View style={styles.lottieLayer} pointerEvents="none">
            <SplashLottie
              source={SPLASH_LOTTIE_SOURCE}
              size={236}
              speed={1.45}
              loop={false}
              onAnimationFinish={handleLottieFinish}
            />
          </View>

          <Animated.View
            style={[
              styles.mascotWrap,
              {
                opacity: mascotOpacity,
                transform: [
                  { translateY: mascotSlideY },
                  { scale: mascotScale },
                  { rotate: mascotRotate },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['#2E1B5E', '#170F33']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.mascotCircleBg}
            >
              <Image
                source={MASCOT_EXPRESSIONS.wave}
                style={styles.mascotImg}
                resizeMode="contain"
                accessibilityLabel="Elvate Fox Mascot"
              />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Wordmark + Tagline */}
        <Animated.View
          style={[
            styles.wordmarkGroup,
            {
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkSlideY }],
            },
          ]}
        >
          <ElvateWordmark width={122} height={34} style={styles.wordmarkSpacing} />
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
    width: 360,
    height: 360,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mascotStage: {
    width: 236,
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  lottieLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotWrap: {
    width: 126,
    height: 126,
    borderRadius: 63,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(196, 181, 253, 0.45)',
    backgroundColor: '#1C123B',
  },
  mascotCircleBg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  mascotImg: {
    width: 114,
    height: 114,
    marginBottom: -4,
  },
  wordmarkGroup: {
    alignItems: 'center',
  },
  wordmarkSpacing: {
    marginBottom: 10,
  },
  subtitleText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: '#A5A1B8',
    letterSpacing: 0.35,
  },
});
