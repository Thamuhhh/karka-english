import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { THEME } from '../constants/theme';

interface LiveStreakBadgeProps {
  streakDays: number;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Compact header streak badge with a multi-layered live flickering SVG flame.
 */
export const LiveStreakBadge: React.FC<LiveStreakBadgeProps> = ({ streakDays }) => {
  const outerCycle = useRef(new Animated.Value(0)).current;
  const coreCycle = useRef(new Animated.Value(0)).current;
  const sparkA = useRef(new Animated.Value(0)).current;
  const sparkB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const outerAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(outerCycle, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(outerCycle, {
          toValue: 2,
          duration: 480,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(outerCycle, {
          toValue: 3,
          duration: 540,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(outerCycle, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    const coreAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(coreCycle, {
          toValue: 1,
          duration: 380,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(coreCycle, {
          toValue: 2,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(coreCycle, {
          toValue: 0,
          duration: 360,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    const sparkAAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkA, {
          toValue: 1,
          duration: 1350,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(sparkA, {
          toValue: 0,
          duration: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.delay(350),
      ])
    );

    const sparkBAnim = Animated.loop(
      Animated.sequence([
        Animated.delay(750),
        Animated.timing(sparkB, {
          toValue: 1,
          duration: 1250,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(sparkB, {
          toValue: 0,
          duration: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );

    outerAnim.start();
    coreAnim.start();
    sparkAAnim.start();
    sparkBAnim.start();

    return () => {
      outerAnim.stop();
      coreAnim.stop();
      sparkAAnim.stop();
      sparkBAnim.stop();
    };
  }, [outerCycle, coreCycle, sparkA, sparkB]);

  const outerScaleY = outerCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [1, 1.09, 0.94, 1.05],
  });
  const outerScaleX = outerCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [1, 0.95, 1.04, 0.97],
  });
  const outerRotate = outerCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['0deg', '-4.5deg', '3.5deg', '-2deg'],
  });
  const outerShiftY = outerCycle.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, -1.2, 0.4, -0.7],
  });

  const coreScaleY = coreCycle.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0.95, 1.12, 1.01],
  });
  const coreScaleX = coreCycle.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1.03, 0.92, 1],
  });
  const coreRotate = coreCycle.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ['0deg', '4deg', '-3deg'],
  });

  const sparkATranslateY = sparkA.interpolate({
    inputRange: [0, 1],
    outputRange: [1, -9],
  });
  const sparkATranslateX = sparkA.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 2.5, 1],
  });
  const sparkAOpacity = sparkA.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 0.95, 0.65, 0],
  });

  const sparkBTranslateY = sparkB.interpolate({
    inputRange: [0, 1],
    outputRange: [2, -8],
  });
  const sparkBTranslateX = sparkB.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -2.5, -1],
  });
  const sparkBOpacity = sparkB.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 0.9, 0.6, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.flameStage}>
        {/* Rising Glowing Ember Sparks */}
        <Animated.View
          style={[
            styles.sparkLayer,
            {
              opacity: sparkAOpacity,
              transform: [{ translateY: sparkATranslateY }, { translateX: sparkATranslateX }],
            },
          ]}
        >
          <Svg width={18} height={24} viewBox="3.5 0 17 28">
            <Circle cx="13.5" cy="6.5" r="1.35" fill="#FDE68A" />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.sparkLayer,
            {
              opacity: sparkBOpacity,
              transform: [{ translateY: sparkBTranslateY }, { translateX: sparkBTranslateX }],
            },
          ]}
        >
          <Svg width={18} height={24} viewBox="3.5 0 17 28">
            <Circle cx="9.5" cy="7.5" r="1.15" fill="#FB923C" />
          </Svg>
        </Animated.View>

        {/* Outer Licking Flame Silhouette */}
        <Animated.View
          style={[
            styles.flameLayer,
            {
              transform: [
                { translateY: outerShiftY },
                { rotate: outerRotate },
                { scaleX: outerScaleX },
                { scaleY: outerScaleY },
              ],
            },
          ]}
        >
          <Svg width={18} height={24} viewBox="3.5 0 17 28">
            <Defs>
              <LinearGradient id="novaFireOuterGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0" stopColor="#FBBF24" />
                <Stop offset="0.45" stopColor="#F97316" />
                <Stop offset="1" stopColor="#EA580C" />
              </LinearGradient>
            </Defs>
            <Path
              d="M12 2.2 C12.4 5.8 15.8 7.8 17.5 11.4 C19.1 14.7 19.2 18.8 17 21.7 C15.7 23.4 13.9 24.5 12 24.5 C9.4 24.5 7 23.1 5.6 20.6 C4.1 17.9 4.5 14.3 6.2 11.7 C7.1 10.3 8.1 9.4 8.5 7.7 C9.3 9.2 10.2 9.8 10.6 9.8 C10.7 6.8 11.3 4.2 12 2.2 Z"
              fill="url(#novaFireOuterGrad)"
            />
          </Svg>
        </Animated.View>

        {/* Inner White-Gold Dancing Core */}
        <Animated.View
          style={[
            styles.flameLayer,
            {
              transform: [
                { rotate: coreRotate },
                { scaleX: coreScaleX },
                { scaleY: coreScaleY },
              ],
            },
          ]}
        >
          <Svg width={18} height={24} viewBox="3.5 0 17 28">
            <Defs>
              <LinearGradient id="novaFireCoreGrad" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0" stopColor="#FEF9C3" />
                <Stop offset="0.65" stopColor="#FDE047" />
                <Stop offset="1" stopColor="#F59E0B" />
              </LinearGradient>
            </Defs>
            <Path
              d="M12.2 11.2 C13.5 13.6 15.4 15.5 15.4 18.4 C15.4 21 13.9 22.9 12 22.9 C10.1 22.9 8.6 21 8.6 18.4 C8.6 16.3 9.8 14.5 10.7 13.5 C11 14.3 11.5 14.6 11.8 14.5 C11.9 13.3 12 12.2 12.2 11.2 Z"
              fill="url(#novaFireCoreGrad)"
            />
          </Svg>
        </Animated.View>
      </View>

      <Text style={styles.countText}>{streakDays}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
  },
  flameStage: {
    width: 18,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  flameLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countText: {
    fontFamily: THEME.fonts.extraBold,
    fontSize: 16,
    lineHeight: 20,
    color: '#FFFFFF',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
});
