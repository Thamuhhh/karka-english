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
import { ElvateWordmark } from './ElvateBrand';

interface AnimatedSplashScreenProps {
  isReady: boolean;
  fontsLoaded: boolean;
  onExiting?: () => void;
  onFinish: () => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const MIN_SPLASH_MS = 1350;

/**
 * Custom animated Elvate splash screen layered over disabled Android static native splash.
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
  const badgeScale = useRef(new Animated.Value(0.86)).current;
  const badgeSlideY = useRef(new Animated.Value(18)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const sheenX = useRef(new Animated.Value(-135)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkSlideY = useRef(new Animated.Value(14)).current;
  const loaderProgress = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entranceAnim = Animated.parallel([
      Animated.timing(badgeScale, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(badgeSlideY, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.delay(340),
        Animated.timing(sheenX, {
          toValue: 145,
          duration: 580,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.sequence([
        Animated.delay(200),
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
        Animated.delay(240),
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
    badgeSlideY,
    loaderProgress,
    sheenX,
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
        {/* Icon Squircle: Smooth Cubic Rise + Diagonal Glass Sheen */}
        <View style={styles.emblemStage}>
          <Animated.View
            style={[
              styles.iconSquircleShadow,
              {
                opacity: badgeOpacity,
                transform: [{ translateY: badgeSlideY }, { scale: badgeScale }],
              },
            ]}
          >
            <View style={styles.iconSquircleClip}>
              <Image
                source={SUPERNOVA_IMAGES.appIcon}
                style={styles.iconImg}
                resizeMode="cover"
              />
              <Animated.View
                style={[
                  styles.sheenOverlay,
                  { transform: [{ translateX: sheenX }, { rotate: '24deg' }] },
                ]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={[
                    'rgba(255, 255, 255, 0)',
                    'rgba(255, 255, 255, 0.36)',
                    'rgba(255, 255, 255, 0)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sheenGradient}
                />
              </Animated.View>
            </View>
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
          <ElvateWordmark width={116} height={34} style={styles.wordmarkSpacing} />

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
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconSquircleShadow: {
    width: 88,
    height: 88,
    borderRadius: 25,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.48,
    shadowRadius: 20,
    elevation: 12,
  },
  iconSquircleClip: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: '#9048F6',
    borderWidth: 1.5,
    borderColor: 'rgba(196, 181, 253, 0.42)',
    overflow: 'hidden',
  },
  sheenOverlay: {
    position: 'absolute',
    top: -32,
    bottom: -32,
    width: 44,
  },
  sheenGradient: {
    flex: 1,
  },
  iconImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  wordmarkGroup: {
    alignItems: 'center',
  },
  wordmarkSpacing: {
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
