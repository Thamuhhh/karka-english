import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView, { LottieViewProps } from 'lottie-react-native';

export interface SplashLottieProps {
  source: LottieViewProps['source'];
  size?: number;
  speed?: number;
  loop?: boolean;
  onAnimationFinish?: (isCancelled: boolean) => void;
}

/**
 * Native (Android / iOS) Lottie player for the custom splash screen.
 */
export const SplashLottie: React.FC<SplashLottieProps> = ({
  source,
  size = 188,
  speed = 1.4,
  loop = false,
  onAnimationFinish,
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    lottieRef.current?.play();
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <LottieView
        ref={lottieRef}
        source={source}
        autoPlay
        loop={loop}
        speed={speed}
        resizeMode="contain"
        onAnimationFinish={onAnimationFinish}
        style={styles.animation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  animation: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
