import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';

interface KarkaWordmarkProps {
  width?: number;
  height?: number;
  showIcon?: boolean;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}

/** Shared Karka brand wordmark with optional rounded app emblem. */
export const KarkaWordmark: React.FC<KarkaWordmarkProps> = ({
  width = 84,
  height = 24,
  showIcon = false,
  iconSize = 22,
  style,
}) => (
  <View style={[styles.row, style]}>
    {showIcon && (
      <View
        style={[
          styles.iconClip,
          { width: iconSize, height: iconSize, borderRadius: Math.round(iconSize * 0.28) },
        ]}
      >
        <Image source={SUPERNOVA_IMAGES.appIcon} style={styles.iconImg} resizeMode="cover" />
      </View>
    )}
    <Image
      source={SUPERNOVA_IMAGES.karkaLogo}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="Karka"
    />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconClip: {
    overflow: 'hidden',
    backgroundColor: '#4C089C',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.38)',
  },
  iconImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
});
