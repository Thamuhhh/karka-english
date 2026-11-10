import { Audio } from 'expo-av';
import { stopAllAudio } from './ttsService';

export interface RecordedAudioPayload {
  base64: string;
  mimeType: string;
}

export type StartCaptureResult =
  | { ok: true; recording: Audio.Recording }
  | { ok: false; reason: 'denied' | 'error' };

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read recorded audio blob'));
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function loadUriAsBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onerror = () => reject(new Error('Failed to load recorded audio URI'));
    xhr.onload = () => {
      resolve(xhr.response);
    };
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

function inferMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.webm')) return 'audio/webm';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.aac')) return 'audio/aac';
  if (lower.endsWith('.mp3')) return 'audio/mp3';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/m4a';
}

/** Requests mic access and begins capturing user speech using expo-av. */
export async function beginAudioCapture(): Promise<StartCaptureResult> {
  try {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, reason: 'denied' };
    }

    await stopAllAudio();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    return { ok: true, recording };
  } catch (err) {
    console.warn('Microphone capture start failed:', err);
    return { ok: false, reason: 'error' };
  }
}

/** Stops recording, restores playback audio routing, and encodes base64 for Gemini audio. */
export async function finishAudioCapture(
  recording: Audio.Recording
): Promise<RecordedAudioPayload | null> {
  try {
    const status = await recording.getStatusAsync();
    const durationMs = status.isRecording || status.isDoneRecording ? status.durationMillis : 0;
    const uri = recording.getURI();

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    }).catch(() => {});

    if (!uri || (durationMs > 0 && durationMs < 350)) {
      return null;
    }

    const blob = await loadUriAsBlob(uri);
    const base64 = await readBlobAsBase64(blob);
    if (!base64 || base64.length < 800) {
      return null;
    }

    return {
      base64,
      mimeType: inferMimeType(uri),
    };
  } catch (err) {
    console.warn('Microphone capture finish failed:', err);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    }).catch(() => {});
    return null;
  }
}

/** Safely releases an active recording if a screen unmounts mid-capture. */
export async function abortAudioCapture(recording: Audio.Recording | null): Promise<void> {
  if (!recording) return;
  try {
    await recording.stopAndUnloadAsync();
  } catch {
    // Ignore unload failure during teardown
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  }).catch(() => {});
}
