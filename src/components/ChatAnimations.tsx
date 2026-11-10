import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { THEME } from '../constants/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface TypingDotsProps {
  color?: string;
  size?: number;
  label?: string;
  labelStyle?: StyleProp<TextStyle>;
}

/**
 * Staggered three-dot typing wave indicator for live AI text and voice replies.
 */
export const TypingDots: React.FC<TypingDotsProps> = ({
  color = THEME.colors.primaryGlow,
  size = 6,
  label,
  labelStyle,
}) => {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: 960,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      })
    );
    loop.start();
    return () => {
      loop.stop();
    };
  }, [phase]);

  const dotTracks = [
    {
      y: phase.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, -4, 0, 0, 0],
      }),
      opacity: phase.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0.35, 1, 0.45, 0.35, 0.35],
      }),
    },
    {
      y: phase.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, 0, -4, 0, 0],
      }),
      opacity: phase.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0.35, 0.35, 1, 0.45, 0.35],
      }),
    },
    {
      y: phase.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0, 0, 0, -4, 0],
      }),
      opacity: phase.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: [0.35, 0.35, 0.35, 1, 0.45],
      }),
    },
  ];

  return (
    <View style={styles.dotsContainer}>
      <View style={styles.dotsTrack}>
        {dotTracks.map((track, idx) => (
          <Animated.View
            key={idx}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              opacity: track.opacity,
              transform: [{ translateY: track.y }],
            }}
          />
        ))}
      </View>
      {label ? <Text style={[styles.labelText, labelStyle]}>{label}</Text> : null}
    </View>
  );
};

interface AnimatedChatBubbleProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Smooth vertical reveal entrance for newly mounted chat message rows.
 */
export const AnimatedChatBubble: React.FC<AnimatedChatBubbleProps> = ({ children, style }) => {
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [appear]);

  const translateY = appear.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: appear,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

interface TypewriterTextProps {
  text: string;
  animate?: boolean;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
}

/**
 * Progressive word-by-word typing reveal for incoming AI chat responses.
 */
export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  animate = false,
  style,
  prefix = '',
  suffix = '',
}) => {
  const words = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/) : [];
  }, [text]);

  const [visibleCount, setVisibleCount] = useState(() => (animate ? 1 : words.length));

  useEffect(() => {
    if (!animate || words.length <= 1) {
      setVisibleCount(words.length);
      return;
    }

    setVisibleCount(1);
    // Keep total reveal crisp (~380-520ms) regardless of sentence length
    const stepMs = Math.max(20, Math.min(42, Math.floor(460 / words.length)));
    let current = 1;

    const timer = setInterval(() => {
      current += 1;
      setVisibleCount(current);
      if (current >= words.length) {
        clearInterval(timer);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [animate, words]);

  const displayBody =
    !animate || visibleCount >= words.length ? text : words.slice(0, visibleCount).join(' ');

  return (
    <Text style={style}>
      {prefix}
      {displayBody}
      {!animate || visibleCount >= words.length ? suffix : ''}
    </Text>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 18,
  },
  dotsTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  labelText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
  },
});
