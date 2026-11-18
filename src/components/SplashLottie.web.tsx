import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export interface SplashLottieProps {
  source: unknown;
  size?: number;
  speed?: number;
  loop?: boolean;
  onAnimationFinish?: (isCancelled: boolean) => void;
}

/**
 * Web fallback for SplashLottie: expanding cyber-violet & gold rings behind the Fox Mascot.
 */
export const SplashLottie: React.FC<SplashLottieProps> = ({
  size = 236,
  speed = 1.45,
  onAnimationFinish,
}) => {
  const onFinishRef = useRef(onAnimationFinish);
  onFinishRef.current = onAnimationFinish;

  const discOpacity = useRef(new Animated.Value(0)).current;
  const discScale = useRef(new Animated.Value(0.72)).current;
  const ring1Scale = useRef(new Animated.Value(0.68)).current;
  const ring1Opacity = useRef(new Animated.Value(0.55)).current;
  const ring2Scale = useRef(new Animated.Value(0.72)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const durationMs = Math.round(900 / Math.max(speed, 0.5));

    const anim = Animated.parallel([
      Animated.timing(discOpacity, {
        toValue: 1,
        duration: Math.round(durationMs * 0.35),
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.spring(discScale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: false,
      }),
      Animated.timing(ring1Scale, {
        toValue: 1.42,
        duration: durationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(ring1Opacity, {
        toValue: 0,
        duration: durationMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.delay(Math.round(durationMs * 0.18)),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1.48,
            duration: Math.round(durationMs * 0.82),
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }),
          Animated.sequence([
            Animated.timing(ring2Opacity, {
              toValue: 0.4,
              duration: Math.round(durationMs * 0.16),
              useNativeDriver: false,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0,
              duration: Math.round(durationMs * 0.66),
              easing: Easing.out(Easing.quad),
              useNativeDriver: false,
            }),
          ]),
        ]),
      ]),
    ]);

    anim.start(({ finished }) => {
      onFinishRef.current?.(!finished);
    });

    return () => anim.stop();
  }, [discOpacity, discScale, ring1Opacity, ring1Scale, ring2Opacity, ring2Scale, speed]);

  const discSize = Math.round(size * 0.58);
  const ringSize = Math.round(size * 0.64);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.violetRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: Math.round(ringSize / 2),
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.goldRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: Math.round(ringSize / 2),
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.backdropDisc,
          {
            width: discSize,
            height: discSize,
            borderRadius: Math.round(discSize / 2),
            opacity: discOpacity,
            transform: [{ scale: discScale }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  violetRing: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: '#7F43FE',
  },
  goldRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
  },
  backdropDisc: {
    backgroundColor: 'rgba(127, 67, 254, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.4)',
  },
});
