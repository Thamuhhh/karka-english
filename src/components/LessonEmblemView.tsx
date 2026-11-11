import React from 'react';
import { Image, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { getLessonNodeEmblem } from '../constants/supernovaAssets';

interface LessonEmblemViewProps {
  classId: string;
  dimmed?: boolean;
}

const SVG_EMBLEM_RENDERERS: Record<string, () => React.ReactNode> = {
  // Class 6: Professional Phone Call Etiquette
  'sn-2-1': () => (
    <G>
      <Path
        d="M 27 32 C 25 36 27 47 36 58 C 46 69 57 73 62 71 L 67 65 C 69 63 68 60 66 58 L 58 53 C 56 52 53 53 51 55 L 49 57 C 45 54 41 50 38 45 L 40 43 C 42 41 42 38 41 36 L 35 28 C 33 26 30 26 28 28 Z"
        fill="url(#obsidianMetal)"
        stroke="url(#violetGlass)"
        strokeWidth="2.2"
      />
      <Path d="M 54 34 A 14 14 0 0 1 68 48" stroke="url(#warmGold)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M 55 24 A 24 24 0 0 1 77 46" stroke="url(#violetGlass)" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    </G>
  ),

  // Class 13: Banking & Financial Transactions
  'sn-3-3': () => (
    <G>
      <Rect
        x="20"
        y="31"
        width="56"
        height="36"
        rx="7"
        fill="url(#obsidianMetal)"
        stroke="url(#violetGlass)"
        strokeWidth="2"
        transform="rotate(-8 48 49)"
      />
      <Rect x="28" y="42" width="12" height="9" rx="2" fill="url(#warmGold)" transform="rotate(-8 48 49)" />
      <Circle cx="68" cy="64" r="12" fill="url(#warmGold)" stroke="#161423" strokeWidth="2" />
      <Circle cx="68" cy="64" r="6" fill="none" stroke="#451A03" strokeWidth="1.6" />
    </G>
  ),

  // Class 14: Job Interview: Tell Me About Yourself
  'sn-3-4': () => (
    <G>
      <Rect x="25" y="23" width="50" height="56" rx="8" fill="url(#obsidianMetal)" stroke="url(#violetGlass)" strokeWidth="2" />
      <Rect x="42" y="19" width="16" height="7" rx="3.5" fill="url(#warmGold)" />
      <Circle cx="50" cy="43" r="8.5" fill="url(#violetGlass)" />
      <Path d="M 35 61 C 35 54 65 54 65 61" fill="url(#violetGlass)" opacity="0.88" />
      <Rect x="34" y="67" width="32" height="4" rx="2" fill="url(#warmGold)" opacity="0.9" />
    </G>
  ),

  // Class 15: Strengths & Weaknesses (Growth Bars + Spark)
  'sn-3-5': () => (
    <G>
      <Rect x="23" y="54" width="13" height="21" rx="3.5" fill="url(#obsidianMetal)" stroke="#4C3D8A" strokeWidth="1.6" />
      <Rect x="43" y="41" width="13" height="34" rx="3.5" fill="url(#violetGlass)" />
      <Rect x="63" y="28" width="13" height="47" rx="3.5" fill="url(#warmGold)" />
      <Path d="M 27 42 L 48 31 L 69 20" stroke="#FDE68A" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <Circle cx="69" cy="20" r="3.5" fill="#FEF3C7" />
    </G>
  ),

  // Class 16: Airport, Boarding & International Travel
  'sn-3-6': () => (
    <G>
      <Path d="M 18 68 Q 48 80 82 54" stroke="url(#warmGold)" strokeWidth="2.4" strokeDasharray="4 4" strokeLinecap="round" fill="none" />
      <Path
        d="M 74 26 L 54 38 L 32 30 L 26 35 L 43 47 L 31 59 L 22 57 L 19 61 L 31 65 L 35 76 L 39 73 L 38 64 L 50 52 L 62 70 L 67 64 L 59 43 Z"
        fill="url(#violetGlass)"
        stroke="#E9D5FF"
        strokeWidth="1.4"
      />
    </G>
  ),

  // Class 17: Hotel Check-In & Service Requests
  'sn-4-1': () => (
    <G>
      <Rect x="45" y="25" width="10" height="5" rx="2.5" fill="url(#warmGold)" />
      <Path d="M 50 30 C 33 30 24 43 24 58 L 76 58 C 76 43 67 30 50 30 Z" fill="url(#obsidianMetal)" stroke="url(#violetGlass)" strokeWidth="2.2" />
      <Path d="M 35 42 A 16 16 0 0 1 48 34" stroke="#E9D5FF" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
      <Rect x="19" y="61" width="62" height="8" rx="4" fill="url(#warmGold)" />
      <Rect x="16" y="69" width="68" height="5" rx="2.5" fill="#2A2546" />
    </G>
  ),

  // Class 18: Corporate Networking & Small Talk
  'sn-4-2': () => (
    <G>
      <Path d="M 32 35 L 67 33 L 52 68 Z" stroke="url(#violetGlass)" strokeWidth="2.6" fill="none" />
      <Path d="M 52 68 L 73 58" stroke="url(#warmGold)" strokeWidth="2.4" strokeLinecap="round" />
      <Circle cx="32" cy="35" r="9.5" fill="url(#obsidianMetal)" stroke="url(#violetGlass)" strokeWidth="2.4" />
      <Circle cx="67" cy="33" r="10.5" fill="url(#violetGlass)" />
      <Circle cx="52" cy="68" r="9" fill="url(#warmGold)" />
      <Circle cx="73" cy="58" r="5.5" fill="url(#obsidianMetal)" stroke="url(#warmGold)" strokeWidth="2" />
    </G>
  ),

  // Class 19: Agreeing & Disagreeing Politely in Debates
  'sn-4-3': () => (
    <G>
      <Rect x="48" y="25" width="4" height="45" rx="2" fill="url(#warmGold)" />
      <Rect x="34" y="69" width="32" height="6" rx="3" fill="url(#obsidianMetal)" stroke="url(#warmGold)" strokeWidth="1.6" />
      <Path d="M 24 34 L 76 28" stroke="url(#warmGold)" strokeWidth="3.2" strokeLinecap="round" />
      <Path d="M 26 34 L 19 52 L 33 52 Z" fill="none" stroke="#C4B5FD" strokeWidth="1.6" />
      <Path d="M 18 52 A 9 7 0 0 0 34 52 Z" fill="url(#violetGlass)" />
      <Path d="M 74 28 L 67 46 L 81 46 Z" fill="none" stroke="#FDE68A" strokeWidth="1.6" />
      <Path d="M 66 46 A 9 7 0 0 0 82 46 Z" fill="url(#warmGold)" />
    </G>
  ),

  // Class 20: Giving Strategic Advice & Guidance
  'sn-4-4': () => (
    <G>
      <Circle cx="50" cy="42" r="18" fill="url(#violetGlass)" stroke="#E9D5FF" strokeWidth="1.8" />
      <Path d="M 42 57 L 58 57 L 55 67 L 45 67 Z" fill="url(#obsidianMetal)" stroke="url(#warmGold)" strokeWidth="1.6" />
      <Rect x="44" y="69" width="12" height="5" rx="2.5" fill="url(#warmGold)" />
      <Path d="M 45 44 C 45 36 55 36 55 44 L 50 52 Z" fill="#FDE68A" />
      <Path d="M 50 16 L 50 20 M 24 42 L 28 42 M 72 42 L 76 42 M 31 24 L 34 27 M 69 24 L 66 27" stroke="url(#warmGold)" strokeWidth="2.4" strokeLinecap="round" />
    </G>
  ),

  // Class 21: Expressing Deep Emotions & Idioms
  'sn-4-5': () => (
    <G>
      <Path
        d="M 50 74 C 31 61 21 49 21 36 C 21 26 29 20 38 20 C 44 20 48 23 50 28 C 52 23 56 20 62 20 C 71 20 79 26 79 36 C 79 49 69 61 50 74 Z"
        fill="url(#violetGlass)"
        stroke="#E9D5FF"
        strokeWidth="1.8"
      />
      <Polygon points="50,29 63,40 50,62 37,40" fill="url(#warmGold)" opacity="0.82" />
    </G>
  ),

  // Class 22: Capstone Master Fluency & Elevator Pitch
  'sn-4-6': () => (
    <G>
      <Path
        d="M 22 64 L 19 34 L 36 46 L 50 25 L 64 46 L 81 34 L 78 64 Z"
        fill="url(#warmGold)"
        stroke="#FEF3C7"
        strokeWidth="1.6"
      />
      <Rect x="22" y="66" width="56" height="7" rx="3.5" fill="url(#obsidianMetal)" stroke="url(#warmGold)" strokeWidth="1.5" />
      <Circle cx="50" cy="51" r="6" fill="url(#violetGlass)" stroke="#FFFFFF" strokeWidth="1.2" />
      <Circle cx="34" cy="54" r="3.8" fill="url(#violetGlass)" />
      <Circle cx="66" cy="54" r="3.8" fill="url(#violetGlass)" />
    </G>
  ),
};

/**
 * Renders each class node's unique 3D-styled obsidian-violet emblem:
 * bespoke generated 3D artwork when available, otherwise topic-specific vector medallions.
 */
export const LessonEmblemView: React.FC<LessonEmblemViewProps> = ({ classId, dimmed }) => {
  const customRenderer = SVG_EMBLEM_RENDERERS[classId];
  if (!customRenderer) {
    return (
      <Image
        source={getLessonNodeEmblem(classId)}
        style={[styles.nodeImg, dimmed && styles.dimmed]}
        resizeMode="cover"
      />
    );
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" style={dimmed ? styles.dimmed : undefined}>
      <Defs>
        <RadialGradient id="violetAura" cx="50%" cy="48%" r="52%">
          <Stop offset="0%" stopColor="#7F43FE" stopOpacity="0.34" />
          <Stop offset="62%" stopColor="#261B47" stopOpacity="0.22" />
          <Stop offset="100%" stopColor="#0E0E14" stopOpacity="1" />
        </RadialGradient>
        <SvgGradient id="obsidianMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#353152" />
          <Stop offset="55%" stopColor="#1B192B" />
          <Stop offset="100%" stopColor="#0F0E18" />
        </SvgGradient>
        <SvgGradient id="violetGlass" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#C4B5FD" />
          <Stop offset="50%" stopColor="#7F43FE" />
          <Stop offset="100%" stopColor="#4C1D95" />
        </SvgGradient>
        <SvgGradient id="warmGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FDE68A" />
          <Stop offset="55%" stopColor="#F59E0B" />
          <Stop offset="100%" stopColor="#B45309" />
        </SvgGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill="#0E0E14" />
      <Circle cx="50" cy="50" r="48" fill="url(#violetAura)" />
      {customRenderer()}
    </Svg>
  );
};

const styles = StyleSheet.create({
  nodeImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.06 }],
  },
  dimmed: {
    opacity: 0.42,
  },
});
