import { Audio } from 'expo-av';

const SOUNDS = {
  button: require('../../assets/supernova/sounds/button.mp3'),
  buttonV2: require('../../assets/supernova/sounds/button_v2.mp3'),
  success: require('../../assets/supernova/sounds/success.mp3'),
  error: require('../../assets/supernova/sounds/error.mp3'),
  chime: require('../../assets/supernova/sounds/chime.mp3'),
  finish: require('../../assets/supernova/sounds/finish_activity.mp3'),
  woo: require('../../assets/supernova/sounds/woo.mp3'),
  callRing: require('../../assets/supernova/sounds/call_ring.mp3'),
};

export type SoundEffectType = keyof typeof SOUNDS;

let soundEffectsEnabled = true;

export function setSoundEffectsEnabled(enabled: boolean) {
  soundEffectsEnabled = enabled;
}

export function isSoundEffectsEnabled(): boolean {
  return soundEffectsEnabled;
}

export const playSoundEffect = async (soundType: SoundEffectType) => {
  if (!soundEffectsEnabled) return;

  try {
    const soundFile = SOUNDS[soundType];
    if (!soundFile) return;

    const { sound } = await Audio.Sound.createAsync(soundFile, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch (err) {
    console.warn('Sound effect error:', err);
  }
};
