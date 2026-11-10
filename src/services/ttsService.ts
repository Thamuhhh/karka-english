import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

let currentSound: Audio.Sound | null = null;
let activeSequenceId = 0;

export type EnglishAccent = 'en-US' | 'en-GB' | 'en-AU';

let currentAccent: EnglishAccent = 'en-US';
let currentSpeechRate: number = 0.95;

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

async function stopPlaybackOnly() {
  try {
    Speech.stop();
    if (currentSound) {
      const soundToStop = currentSound;
      currentSound = null;
      await soundToStop.stopAsync();
      await soundToStop.unloadAsync();
    }
  } catch (e) {
    // Ignore cleanup error
  }
}

function speakWithLanguage(
  text: string,
  language: string,
  onDone?: () => void,
  rateOverride?: number
) {
  let finished = false;
  const finishOnce = () => {
    if (!finished) {
      finished = true;
      onDone?.();
    }
  };

  const baseRate = rateOverride ?? currentSpeechRate;

  try {
    Speech.speak(text, {
      language,
      rate: language === 'ta-IN' ? Math.min(baseRate, 0.92) : baseRate,
      pitch: 1.0,
      onDone: finishOnce,
      onStopped: finishOnce,
      onError: (err) => {
        console.warn('Speech playback error:', err);
        finishOnce();
      },
    });
  } catch (e) {
    console.warn('Speech invocation error:', e);
    finishOnce();
  }
}

export async function speakText(text: string, onDone?: () => void, rateOverride?: number) {
  activeSequenceId++;
  await stopPlaybackOnly();
  speakWithLanguage(text, currentAccent, onDone, rateOverride);
}

/** Speaks Tamil instructional text using Tamil (India) TTS voice. */
export async function speakTamil(text: string, onDone?: () => void) {
  activeSequenceId++;
  await stopPlaybackOnly();
  speakWithLanguage(text, 'ta-IN', onDone);
}

export interface BilingualSpeechSegment {
  text: string;
  lang: 'ta-IN' | 'en';
}

/** Sequentially plays mixed Tamil narration and English example sentences. */
export async function speakBilingualSequence(
  segments: BilingualSpeechSegment[],
  onDone?: () => void,
  onSegmentStart?: (index: number, segment: BilingualSpeechSegment) => void
) {
  const sequenceToken = ++activeSequenceId;
  await stopPlaybackOnly();

  const cleanSegments = segments.filter((seg) => seg.text.trim().length > 0);
  if (cleanSegments.length === 0) {
    onDone?.();
    return;
  }

  let index = 0;
  const playNext = () => {
    if (sequenceToken !== activeSequenceId) {
      return;
    }
    if (index >= cleanSegments.length) {
      onDone?.();
      return;
    }
    const segIdx = index++;
    const seg = cleanSegments[segIdx];
    const lang = seg.lang === 'ta-IN' ? 'ta-IN' : currentAccent;
    onSegmentStart?.(segIdx, seg);
    speakWithLanguage(seg.text, lang, () => {
      if (sequenceToken === activeSequenceId) {
        playNext();
      }
    });
  };

  playNext();
}

export async function playRemoteAudio(
  url: string,
  onDone?: () => void,
  fallbackText?: string
) {
  let finished = false;
  const finishOnce = () => {
    if (!finished) {
      finished = true;
      onDone?.();
    }
  };

  try {
    await stopAllAudio();
    const normalizedUrl = url.startsWith('//') ? `https:${url}` : url;
    const { sound } = await Audio.Sound.createAsync(
      { uri: normalizedUrl },
      { shouldPlay: true }
    );
    currentSound = sound;
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        if (currentSound === sound) {
          currentSound = null;
        }
        finishOnce();
      }
    });
  } catch (err) {
    console.warn('Remote audio playback failed, falling back to TTS:', err);
    if (fallbackText) {
      await speakText(fallbackText, finishOnce);
    } else {
      finishOnce();
    }
  }
}

export async function stopAllAudio() {
  activeSequenceId++;
  await stopPlaybackOnly();
}
