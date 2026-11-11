import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ImageStyle,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { MASCOT_EXPRESSIONS, MascotMood } from '../constants/supernovaAssets';
import { GrammarCorrection } from '../types';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export interface MascotStateInput {
  isListening?: boolean;
  isProcessing?: boolean;
  isTyping?: boolean;
  isSpeaking?: boolean;
  feedback?: GrammarCorrection | null;
  idleMood?: MascotMood;
}

/** Resolves a live interactive Elvate fox expression from AI interaction and feedback states. */
export function resolveAiMascotMood({
  isListening = false,
  isProcessing = false,
  isTyping = false,
  isSpeaking = false,
  feedback = null,
  idleMood = 'wave',
}: MascotStateInput): MascotMood {
  if (isListening) return 'listening';
  if (isProcessing) return 'thinking';
  if (isTyping) return 'typing';
  if (isSpeaking) return 'speaking';

  if (feedback) {
    if (!feedback.hasErrors && feedback.fluencyScore >= 90) return 'reward';
    if (!feedback.hasErrors) return 'correct';
    if (feedback.fluencyScore >= 75) return 'idea';
    if (feedback.fluencyScore >= 55) return 'surprised';
    return 'confused';
  }

  return idleMood;
}

interface MascotAvatarProps {
  mood: MascotMood;
  size?: number;
  rounded?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

/** Animated Elvate fox mascot avatar that pops smoothly when switching AI expressions. */
export const MascotAvatar: React.FC<MascotAvatarProps> = ({
  mood,
  size = 40,
  rounded = true,
  backgroundColor = '#171329',
  borderColor,
  borderWidth = 0,
  animated = true,
  style,
  imageStyle,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const prevMoodRef = useRef<MascotMood>(mood);

  useEffect(() => {
    if (!animated || prevMoodRef.current === mood) {
      prevMoodRef.current = mood;
      return;
    }
    prevMoodRef.current = mood;
    scaleAnim.setValue(0.86);
    opacityAnim.setValue(0.72);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [mood, animated, scaleAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: rounded ? size / 2 : 14,
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      <Image
        source={MASCOT_EXPRESSIONS[mood]}
        style={[styles.image, imageStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
