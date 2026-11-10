import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

let currentSound: Audio.Sound | null = null;

export type EnglishAccent = 'en-US' | 'en-GB' | 'en-AU';

let currentAccent: EnglishAccent = 'en-US';
let currentSpeechRate: number = 0.9; // Slightly slower for better comprehension

export function setPreferredAccent(accent: EnglishAccent) {
  currentAccent = accent;
}

export function getPreferredAccent(): EnglishAccent {
  return currentAccent;
}

export function setSpeechRate(rate: number) {
  currentSpeechRate = rate;
}

export function getSpeechRate(): number {
  return currentSpeechRate;
}

export async function speakText(text: string, onDone?: () => void) {
  try {
    await stopAllAudio();
    Speech.speak(text, {
      language: currentAccent,
      rate: currentSpeechRate,
      pitch: 1.0,
      onDone,
      onError: (err) => {
        console.warn('Speech playback error:', err);
        if (onDone) onDone();
      },
    });
  } catch (e) {
    console.warn('Speech invocation error:', e);
    if (onDone) onDone();
  }
}

export async function playRemoteAudio(url: string, onDone?: () => void) {
  try {
    await stopAllAudio();
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
        currentSound = null;
        if (onDone) onDone();
      }
    });
  } catch (err) {
    console.warn('Audio playback error, falling back to TTS:', err);
    if (onDone) onDone();
  }
}

export async function stopAllAudio() {
  try {
    Speech.stop();
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch (e) {
    // Ignore cleanup error
  }
}

