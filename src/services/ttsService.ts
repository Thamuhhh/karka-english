import * as Speech from 'expo-speech';
import { Audio, AVPlaybackSource } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { getLastGeminiError, synthesizeGeminiSpeech } from '../api/supernovaAi';
import { LectureAudioClip } from '../constants/curriculum';
import { LECTURE_AUDIO_ASSETS, LECTURE_AUDIO_TEXTS } from '../constants/lectureAudioMap';

let currentSound: Audio.Sound | null = null;
let activeSequenceId = 0;
let cachedVoices: Speech.Voice[] | null = null;
let lastSpeechNotice: string | null = null;
const geminiAudioCache = new Map<string, string>();
const MAX_AUDIO_CACHE_ENTRIES = 48;

export function getLastSpeechNotice(): string | null {
  return lastSpeechNotice;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Bytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((len * 3) / 4 - pad);
  let outIdx = 0;

  for (let i = 0; i < len; i += 4) {
    const a = B64_CHARS.indexOf(clean[i]);
    const b = B64_CHARS.indexOf(clean[i + 1]);
    const c = B64_CHARS.indexOf(clean[i + 2]);
    const d = B64_CHARS.indexOf(clean[i + 3]);
    const triplet = (a << 18) | (b << 12) | ((c < 0 ? 0 : c) << 6) | (d < 0 ? 0 : d);
    if (outIdx < out.length) out[outIdx++] = (triplet >> 16) & 0xff;
    if (outIdx < out.length) out[outIdx++] = (triplet >> 8) & 0xff;
    if (outIdx < out.length) out[outIdx++] = triplet & 0xff;
  }
  return out;
}

function encodeBase64Bytes(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? bytes[i + 1] : 0;
    const b2 = hasB2 ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    out += B64_CHARS[(triplet >> 18) & 0x3f];
    out += B64_CHARS[(triplet >> 12) & 0x3f];
    out += hasB1 ? B64_CHARS[(triplet >> 6) & 0x3f] : '=';
    out += hasB2 ? B64_CHARS[triplet & 0x3f] : '=';
  }
  return out;
}

function parseSampleRate(mimeType: string): number {
  const match = /rate=(\d+)/i.exec(mimeType);
  const parsed = match ? Number(match[1]) : 24000;
  return Number.isFinite(parsed) && parsed >= 8000 ? parsed : 24000;
}

function writeAscii(view: Uint8Array, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view[offset + i] = str.charCodeAt(i);
  }
}

function writeUint32LE(view: Uint8Array, offset: number, value: number) {
  view[offset] = value & 0xff;
  view[offset + 1] = (value >> 8) & 0xff;
  view[offset + 2] = (value >> 16) & 0xff;
  view[offset + 3] = (value >> 24) & 0xff;
}

function writeUint16LE(view: Uint8Array, offset: number, value: number) {
  view[offset] = value & 0xff;
  view[offset + 1] = (value >> 8) & 0xff;
}

function hashCacheKey(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** Returns ordered disk cache paths across persistent doc dir and cache dir. */
function getCandidateDiskPaths(cacheKey: string, ext = 'wav'): string[] {
  if (Platform.OS === 'web') return [];
  const filename = `nila_tts_${hashCacheKey(cacheKey)}.${ext}`;
  const dirs = [FileSystem.documentDirectory, FileSystem.cacheDirectory].filter(
    (d): d is string => Boolean(d)
  );
  return Array.from(new Set(dirs)).map((dir) => `${dir}${filename}`);
}

function getPersistentAudioPath(cacheKey: string, ext = 'wav'): string | null {
  const paths = getCandidateDiskPaths(cacheKey, ext);
  return paths[0] || null;
}

async function inlineAudioToPlayableUri(
  cacheKey: string,
  base64Data: string,
  mimeType: string
): Promise<string> {
  const lower = mimeType.toLowerCase();
  let finalBase64 = base64Data;
  let ext = 'wav';
  let cleanMime = 'audio/wav';

  if (lower.includes('mp3') || lower.includes('mpeg')) {
    ext = 'mp3';
    cleanMime = 'audio/mpeg';
  } else if (lower.includes('aac')) {
    ext = 'aac';
    cleanMime = 'audio/aac';
  } else if (!lower.includes('wav')) {
    const pcm = decodeBase64Bytes(base64Data);
    const sampleRate = parseSampleRate(mimeType);
    const wav = new Uint8Array(44 + pcm.length);

    writeAscii(wav, 0, 'RIFF');
    writeUint32LE(wav, 4, 36 + pcm.length);
    writeAscii(wav, 8, 'WAVE');
    writeAscii(wav, 12, 'fmt ');
    writeUint32LE(wav, 16, 16);
    writeUint16LE(wav, 20, 1); // PCM
    writeUint16LE(wav, 22, 1); // Mono
    writeUint32LE(wav, 24, sampleRate);
    writeUint32LE(wav, 28, sampleRate * 2);
    writeUint16LE(wav, 32, 2);
    writeUint16LE(wav, 34, 16);
    writeAscii(wav, 36, 'data');
    writeUint32LE(wav, 40, pcm.length);
    wav.set(pcm, 44);

    finalBase64 = encodeBase64Bytes(wav);
  }

  const fileUri = getPersistentAudioPath(cacheKey, ext);
  if (fileUri) {
    await FileSystem.writeAsStringAsync(fileUri, finalBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  }

  return `data:${cleanMime};base64,${finalBase64}`;
}

function cacheAudioUri(key: string, uri: string) {
  if (geminiAudioCache.size >= MAX_AUDIO_CACHE_ENTRIES) {
    const oldestKey = geminiAudioCache.keys().next().value;
    if (oldestKey) geminiAudioCache.delete(oldestKey);
  }
  geminiAudioCache.set(key, uri);
}

export type EnglishAccent = 'en-US' | 'en-GB' | 'en-AU';

let currentAccent: EnglishAccent = 'en-US';
let currentSpeechRate: number = 0.95;

async function ensureVoicesLoaded(): Promise<Speech.Voice[]> {
  if (cachedVoices) return cachedVoices;
  try {
    const list = await Speech.getAvailableVoicesAsync();
    cachedVoices = Array.isArray(list) ? list : [];
    return cachedVoices;
  } catch {
    return [];
  }
}

/** Preloads available device speech voices so first spoken turn starts without discovery delay. */
export function warmupVoices(): void {
  void ensureVoicesLoaded();
}

async function pickPreferredVoiceId(language: string): Promise<string | undefined> {
  const voices = await ensureVoicesLoaded();
  if (voices.length === 0) return undefined;

  const targetLower = language.toLowerCase();
  const baseLang = targetLower.split('-')[0];
  const matching = voices.filter((v) => {
    const vl = (v.language || '').toLowerCase();
    return vl === targetLower || vl.startsWith(`${baseLang}-`) || vl === baseLang;
  });
  if (matching.length === 0) return undefined;

  const scoreVoice = (v: Speech.Voice): number => {
    let score = 0;
    const id = `${v.identifier} ${v.name}`.toLowerCase();
    const vl = (v.language || '').toLowerCase();
    if (vl === targetLower) score += 100;
    else if (vl.startsWith(`${baseLang}-`) || vl === baseLang) score += 20;
    if (v.quality === Speech.VoiceQuality.Enhanced) score += 40;
    // For Tamil fallback, Google network/neural voices sound much warmer than robotic offline local Tamil;
    // for English, prefer instant offline enhanced voices without network delay.
    if (baseLang === 'ta') {
      if (id.includes('network') || id.includes('neural') || id.includes('wavenet')) score += 35;
    } else if (id.includes('network')) {
      score -= 35;
    }
    if (
      id.includes('samantha') ||
      id.includes('karen') ||
      id.includes('serena') ||
      id.includes('tpf') ||
      id.includes('sfg') ||
      id.includes('taf') ||
      id.includes('female')
    ) {
      score += 10;
    }
    return score;
  };

  const best = [...matching].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  return best?.identifier;
}

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

async function speakWithLanguage(
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
    const voiceId = await pickPreferredVoiceId(language);
    Speech.speak(text, {
      language,
      ...(voiceId ? { voice: voiceId } : {}),
      rate: language === 'ta-IN' ? Math.max(baseRate, 1.0) : baseRate,
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

async function playAudioSource(
  sequenceToken: number,
  source: AVPlaybackSource,
  rate: number,
  finishOnce: () => void
): Promise<boolean> {
  if (sequenceToken !== activeSequenceId) {
    return true;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  }).catch(() => {});

  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: true,
    rate,
    shouldCorrectPitch: true,
  });
  if (sequenceToken !== activeSequenceId) {
    await sound.unloadAsync().catch(() => {});
    return true;
  }

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
  return true;
}

async function tryPlayBundledLectureAsset(
  sequenceToken: number,
  assetKey: string | undefined,
  text: string,
  rate: number,
  finishOnce: () => void
): Promise<boolean> {
  if (!assetKey) return false;
  const assetModule = LECTURE_AUDIO_ASSETS[assetKey];
  if (!assetModule) return false;
  const sourceText = LECTURE_AUDIO_TEXTS[assetKey];
  if (sourceText && sourceText.trim() !== text.trim()) return false;

  try {
    lastSpeechNotice = null;
    return await playAudioSource(sequenceToken, assetModule, rate, finishOnce);
  } catch (err) {
    console.warn('Bundled lecture audio playback fallback triggered:', err);
    return false;
  }
}

async function tryPlayGeneratedLectureAudio(
  sequenceToken: number,
  clip: LectureAudioClip | undefined,
  text: string,
  rate: number,
  finishOnce: () => void
): Promise<boolean> {
  if (!clip?.url || clip.text.trim() !== text.trim()) return false;
  try {
    const cacheKey = `course-audio:${clip.url}:${clip.text}`;
    let audioUri = geminiAudioCache.get(cacheKey);
    if (audioUri && Platform.OS !== 'web' && audioUri.startsWith('file://')) {
      const info = await FileSystem.getInfoAsync(audioUri).catch(() => ({ exists: false }));
      if (!info.exists) {
        geminiAudioCache.delete(cacheKey);
        audioUri = undefined;
      }
    }
    if (!audioUri && Platform.OS !== 'web') {
      const extension = new URL(clip.url).pathname.toLowerCase().endsWith('.mp3') ? 'mp3' : 'wav';
      const cachedPath = getPersistentAudioPath(cacheKey, extension);
      if (cachedPath) {
        const info = await FileSystem.getInfoAsync(cachedPath).catch(() => ({ exists: false }));
        if (info.exists) audioUri = cachedPath;
        else {
          const download = await FileSystem.downloadAsync(clip.url, cachedPath);
          audioUri = download.uri;
        }
      }
    }
    audioUri ||= clip.url;
    cacheAudioUri(cacheKey, audioUri);
    return await playAudioSource(sequenceToken, { uri: audioUri }, rate, finishOnce);
  } catch (err) {
    console.warn('Generated course audio playback fallback triggered:', err);
    return false;
  }
}

async function playCachedOrSynthesizedAudio(
  sequenceToken: number,
  cacheKey: string,
  text: string,
  mode: 'tamil-coach' | 'english-native',
  finishOnce: () => void
): Promise<boolean> {
  try {
    let audioUri = geminiAudioCache.get(cacheKey);
    if (audioUri && Platform.OS !== 'web' && audioUri.startsWith('file://')) {
      const info = await FileSystem.getInfoAsync(audioUri).catch(() => ({ exists: false }));
      if (!info.exists) {
        geminiAudioCache.delete(cacheKey);
        audioUri = undefined;
      }
    }

    // Check both documentDirectory and legacy cacheDirectory before calling Gemini TTS
    if (!audioUri) {
      for (const candidatePath of getCandidateDiskPaths(cacheKey, 'wav')) {
        const info = await FileSystem.getInfoAsync(candidatePath).catch(() => ({ exists: false }));
        if (info.exists) {
          audioUri = candidatePath;
          cacheAudioUri(cacheKey, candidatePath);
          break;
        }
      }
    }

    if (!audioUri) {
      const generated = await synthesizeGeminiSpeech(text, mode, currentAccent);
      if (!generated || sequenceToken !== activeSequenceId) {
        const err = getLastGeminiError();
        if (err && err.includes('429')) {
          lastSpeechNotice = 'Gemini voice quota cooling down — using device voice briefly';
        }
        return false;
      }
      lastSpeechNotice = null;
      audioUri = await inlineAudioToPlayableUri(cacheKey, generated.base64, generated.mimeType);
      cacheAudioUri(cacheKey, audioUri);
    } else {
      lastSpeechNotice = null;
    }

    return await playAudioSource(sequenceToken, { uri: audioUri }, 1.06, finishOnce);
  } catch (err) {
    console.warn('Gemini TTS playback fallback triggered:', err);
    return false;
  }
}

export async function speakText(
  text: string,
  onDone?: () => void,
  rateOverride?: number,
  preferAiVoice = false,
  assetKey?: string,
  lectureAudio?: LectureAudioClip
) {
  const sequenceToken = ++activeSequenceId;
  await stopPlaybackOnly();

  let finished = false;
  const finishOnce = () => {
    if (!finished) {
      finished = true;
      onDone?.();
    }
  };

  if (await tryPlayGeneratedLectureAudio(sequenceToken, lectureAudio, text, rateOverride ?? 1.0, finishOnce)) {
    return;
  }
  if (await tryPlayBundledLectureAsset(sequenceToken, assetKey, text, rateOverride ?? 1.0, finishOnce)) {
    return;
  }

  const shouldUseAiVoice =
    preferAiVoice && (!rateOverride || Math.abs(rateOverride - currentSpeechRate) < 0.05);
  if (shouldUseAiVoice) {
    const cacheKey = `en:${currentAccent}:${text.trim()}`;
    const played = await playCachedOrSynthesizedAudio(
      sequenceToken,
      cacheKey,
      text,
      'english-native',
      finishOnce
    );
    if (played || sequenceToken !== activeSequenceId) return;
  }

  speakWithLanguage(text, currentAccent, onDone, rateOverride);
}

function runBilingualSequence(
  sequenceToken: number,
  segments: BilingualSpeechSegment[],
  onDone?: () => void,
  onSegmentStart?: (index: number, segment: BilingualSpeechSegment) => void
) {
  let index = 0;
  const playNext = () => {
    if (sequenceToken !== activeSequenceId) {
      return;
    }
    if (index >= segments.length) {
      onDone?.();
      return;
    }
    const segIdx = index++;
    const seg = segments[segIdx];
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

/** Speaks Tamil coach commentary using bundled AI4Bharat audio if present, else Gemini TTS + fallback. */
export async function speakTamil(
  text: string,
  onDone?: () => void,
  assetKey?: string,
  lectureAudio?: LectureAudioClip
) {
  const sequenceToken = ++activeSequenceId;
  await stopPlaybackOnly();

  let finished = false;
  const finishOnce = () => {
    if (!finished) {
      finished = true;
      onDone?.();
    }
  };

  if (await tryPlayGeneratedLectureAudio(sequenceToken, lectureAudio, text, 1.0, finishOnce)) {
    return;
  }
  if (await tryPlayBundledLectureAsset(sequenceToken, assetKey, text, 1.0, finishOnce)) {
    return;
  }

  const clean = text.trim();
  if (!clean) {
    finishOnce();
    return;
  }

  const cacheKey = `ta-coach:${clean}`;
  const played = await playCachedOrSynthesizedAudio(
    sequenceToken,
    cacheKey,
    clean,
    'tamil-coach',
    finishOnce
  );
  if (played || sequenceToken !== activeSequenceId) {
    return;
  }

  // Keep offline fallback in a single consistent voice (avoid jarring mid-sentence AI switches)
  speakWithLanguage(clean.replace(/["“”]/g, ''), 'ta-IN', finishOnce);
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

  runBilingualSequence(sequenceToken, cleanSegments, onDone, onSegmentStart);
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
