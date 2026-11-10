/**
 * Generates full-sentence Tamil + English lecture audio clips into `assets/audio/`
 * using `--engine gemini` (warm human coach via `.env` key) or `--engine edge`.
 * Supports `--keys k1,k2`, `--tamil-only`, `--force`, `--delay ms`, and `--limit N`.
 */
const fs = require('fs');
const path = require('path');
const { EdgeTTS, Constants } = require('@andresaya/edge-tts');
const { syncLectureAudio } = require('./sync_lecture_audio');

const ROOT_DIR = path.resolve(__dirname, '..');
const TAMIL_VOICE = process.env.TAMIL_VOICE || 'ta-IN-PallaviNeural';
const ENGLISH_VOICE = process.env.ENGLISH_VOICE || 'en-IN-NeerjaNeural';
const GEMINI_VOICE = process.env.GEMINI_TTS_VOICE || 'Zephyr';
const GEMINI_TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
const AUDIO_EXTS = ['.mp3', '.m4a', '.wav'];

function parseArgs(argv) {
  const args = {
    engine: 'edge',
    force: false,
    keepWav: false,
    tamilOnly: false,
    suffix: null,
    keys: null,
    limit: Infinity,
    concurrency: null,
    delayMs: null,
    voice: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--engine' && argv[i + 1]) {
      args.engine = argv[++i].toLowerCase();
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--keep-wav') {
      args.keepWav = true;
    } else if (arg === '--tamil-only') {
      args.tamilOnly = true;
    } else if (arg === '--suffix' && argv[i + 1]) {
      args.suffix = argv[++i].trim();
    } else if (arg === '--keys' && argv[i + 1]) {
      args.keys = new Set(argv[++i].split(',').map((k) => k.trim()).filter(Boolean));
    } else if (arg === '--limit' && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed > 0) args.limit = parsed;
    } else if (arg === '--concurrency' && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 6) args.concurrency = parsed;
    } else if (arg === '--delay' && argv[i + 1]) {
      const parsed = Number(argv[++i]);
      if (Number.isFinite(parsed) && parsed >= 0) args.delayMs = parsed;
    } else if (arg === '--voice' && argv[i + 1]) {
      args.voice = argv[++i].trim();
    }
  }
  if (args.concurrency === null) args.concurrency = args.engine === 'gemini' ? 1 : 2;
  if (args.delayMs === null) args.delayMs = args.engine === 'gemini' ? 3500 : 0;
  return args;
}

function loadGeminiKey() {
  const envDirect = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  if (envDirect.length > 10) return envDirect;
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return null;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = /^\s*(?:EXPO_PUBLIC_GEMINI_API_KEY|GEMINI_API_KEY)\s*=\s*(.+?)\s*$/.exec(line);
    if (match) {
      const cleaned = match[1].replace(/^['"]|['"]$/g, '').trim();
      if (cleaned.length > 10) return cleaned;
    }
  }
  return null;
}

function writeAudioReplacingOldExts(audioDir, key, ext, buf) {
  for (const oldExt of AUDIO_EXTS) {
    const oldPath = path.join(audioDir, `${key}${oldExt}`);
    if (oldExt !== ext && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }
  const outPath = path.join(audioDir, `${key}${ext}`);
  fs.writeFileSync(outPath, buf);
  return path.basename(outPath);
}

function pcmToWavBuffer(pcmBuf, sampleRate) {
  const wav = Buffer.alloc(44 + pcmBuf.length);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + pcmBuf.length, 4);
  wav.write('WAVE', 8);
  wav.write('fmt ', 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(pcmBuf.length, 40);
  pcmBuf.copy(wav, 44);
  return wav;
}

function hasExistingAudio(audioDir, key) {
  return AUDIO_EXTS.some((ext) => fs.existsSync(path.join(audioDir, `${key}${ext}`)));
}

const ONES_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const TENS_WORDS = ['', '', 'twenty', 'thirty', 'forty', 'fifty'];

function twoDigitsToEnglish(num) {
  if (num < 20) return ONES_WORDS[num] || String(num);
  const tens = TENS_WORDS[Math.floor(num / 10)];
  const ones = num % 10;
  return ones === 0 ? tens : `${tens} ${ONES_WORDS[ones]}`;
}

function replaceEnglishTimesAndYears(text) {
  return text
    .replace(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi, (_, hStr, mStr, meridiem) => {
      const hour = Number(hStr);
      const min = Number(mStr);
      const minWords = min === 0 ? '' : min < 10 ? ` oh ${ONES_WORDS[min]}` : ` ${twoDigitsToEnglish(min)}`;
      const letters = meridiem.toUpperCase().split('').join(' ');
      return `${twoDigitsToEnglish(hour)}${minWords} ${letters}`;
    })
    .replace(/\b(20\d{2})\b/g, (_, yearStr) => {
      const tail = Number(yearStr.slice(2));
      return tail === 0 ? 'two thousand' : tail < 10 ? `two thousand ${ONES_WORDS[tail]}` : `twenty ${twoDigitsToEnglish(tail)}`;
    });
}

function cleanSpeechText(text, mode, engine = 'edge') {
  let out = String(text || '').trim();
  if (engine === 'gemini') {
    return out.replace(/\s*->\s*/g, ', ').replace(/\s{2,}/g, ' ').trim();
  }
  if (mode === 'tamil') {
    out = replaceEnglishTimesAndYears(out)
      .replace(/\s*->\s*/g, ', ')
      .replace(/\s+\/\s+/g, ', ')
      .replace(/\.{2,}/g, ' ')
      .replace(/["“”]/g, '')
      .replace(/\b(AT|ON|IN)\b/g, (m) => m.toLowerCase())
      .replace(/([A-Za-z0-9\u0B80-\u0BFF])-(?=[\u0B80-\u0BFF])/g, '$1 ')
      .replace(/([\u0B80-\u0BFF])-(?=[A-Za-z])/g, '$1 ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  return out;
}

function extractInlineAudioPart(json) {
  const parts = json?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    if (typeof inline?.data === 'string' && inline.data.length > 100) {
      return {
        base64: inline.data,
        mimeType: inline.mimeType || inline.mime_type || 'audio/L16;rate=24000',
      };
    }
  }
  return null;
}

async function requestGeminiAudio(apiKey, clip, voiceName) {
  const text = cleanSpeechText(clip.text, clip.mode, 'gemini');
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || GEMINI_VOICE },
        },
      },
    },
  });

  const endpoints = [
    (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
    ...(apiKey.startsWith('AQ.')
      ? [(m) => `https://aiplatform.googleapis.com/v1/publishers/google/models/${m}:generateContent`]
      : []),
  ];

  const errors = [];
  for (const buildUrl of endpoints) {
    for (const model of GEMINI_TTS_MODELS) {
      const res = await fetch(buildUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body,
        signal: AbortSignal.timeout(25000),
      });
      if (res.ok) {
        const json = await res.json();
        const inline = extractInlineAudioPart(json);
        if (inline) return inline;
        errors.push(`${model}: Empty audio candidate`);
        continue;
      }
      const errText = await res.text().catch(() => '');
      errors.push(`${model}: HTTP ${res.status} ${errText.slice(0, 140)}`);
    }
  }
  throw new Error(errors.join(' | ').slice(0, 260));
}

async function generateWithGemini(apiKey, clip, audioDir, voiceName) {
  const inline = await requestGeminiAudio(apiKey, clip, voiceName);
  const rawBuf = Buffer.from(inline.base64, 'base64');
  const lower = inline.mimeType.toLowerCase();
  if (lower.includes('mp3') || lower.includes('mpeg')) {
    return writeAudioReplacingOldExts(audioDir, clip.key, '.mp3', rawBuf);
  }
  if (lower.includes('wav')) {
    return writeAudioReplacingOldExts(audioDir, clip.key, '.wav', rawBuf);
  }
  const rateMatch = /rate=(\d+)/i.exec(inline.mimeType);
  const sampleRate = rateMatch ? Number(rateMatch[1]) : 24000;
  return writeAudioReplacingOldExts(audioDir, clip.key, '.wav', pcmToWavBuffer(rawBuf, sampleRate));
}

async function generateWithEdge(tts, clip, audioDir, voiceOverride) {
  const isTamil = clip.mode === 'tamil';
  const voice = voiceOverride || (isTamil ? TAMIL_VOICE : ENGLISH_VOICE);
  const text = cleanSpeechText(clip.text, clip.mode, 'edge');
  const options = {
    rate: isTamil ? '+4%' : '0%',
    outputFormat: Constants.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
  };
  const result = await tts.generate(text, voice, options);
  if (!result?.audio || result.audio.length === 0) {
    throw new Error(`Empty audio returned for ${clip.key}`);
  }
  return writeAudioReplacingOldExts(audioDir, clip.key, '.mp3', result.audio);
}

async function synthesizeClipWithRetry(ctx, clip, audioDir, attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return ctx.engine === 'gemini'
        ? await generateWithGemini(ctx.geminiKey, clip, audioDir, ctx.voice)
        : await generateWithEdge(ctx.edgeTts, clip, audioDir, ctx.voice);
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        const isQuota = String(err?.message || '').includes('429');
        const waitMs = isQuota ? 12000 * attempt : 1500 * attempt;
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw lastErr;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { clips, audioDir } = syncLectureAudio();

  let geminiKey = null;
  if (opts.engine === 'gemini') {
    geminiKey = loadGeminiKey();
    if (!geminiKey) {
      throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env or environment.');
    }
  }

  const priorityRank = (key) => (key.endsWith('-tamil') ? 0 : key.endsWith('-right') ? 1 : 2);
  const pending = clips
    .filter((clip) => {
      if (opts.keys && !opts.keys.has(clip.key)) return false;
      if (opts.tamilOnly && clip.mode !== 'tamil') return false;
      if (opts.suffix && !clip.key.endsWith(opts.suffix)) return false;
      if (opts.keepWav && fs.existsSync(path.join(audioDir, `${clip.key}.wav`))) return false;
      return opts.force || opts.keepWav || Boolean(opts.keys) || !hasExistingAudio(audioDir, clip.key);
    })
    .sort((a, b) => priorityRank(a.key) - priorityRank(b.key))
    .slice(0, opts.limit);

  if (pending.length === 0) {
    console.log('No matching lecture clips to generate.');
    return;
  }

  const voiceLabel = opts.engine === 'gemini' ? opts.voice || GEMINI_VOICE : TAMIL_VOICE;
  console.log(
    `Generating ${pending.length} lecture clip(s) into assets/audio/ via ${opts.engine} (${voiceLabel})...`
  );

  const ctx = {
    engine: opts.engine,
    geminiKey,
    edgeTts: opts.engine === 'edge' ? new EdgeTTS({ timeout: 30000 }) : null,
    voice: opts.voice,
  };

  let cursor = 0;
  let successCount = 0;
  let consecutiveFailures = 0;
  let abortAll = false;
  const failures = [];

  async function worker() {
    while (!abortAll) {
      const idx = cursor++;
      if (idx >= pending.length) return;
      const clip = pending[idx];
      try {
        const savedName = await synthesizeClipWithRetry(ctx, clip, audioDir);
        successCount += 1;
        consecutiveFailures = 0;
        console.log(`[${idx + 1}/${pending.length}] Saved ${savedName}`);
      } catch (err) {
        consecutiveFailures += 1;
        failures.push({ key: clip.key, error: err?.message || String(err) });
        console.warn(`[${idx + 1}/${pending.length}] Failed ${clip.key}: ${err?.message || err}`);
        if (consecutiveFailures >= 3) {
          console.warn('Stopping early after 3 consecutive failures; run again with --keep-wav to resume.');
          abortAll = true;
          return;
        }
      }
      if (opts.delayMs > 0 && idx + 1 < pending.length && !abortAll) {
        await new Promise((r) => setTimeout(r, opts.delayMs));
      }
    }
  }

  const workers = Array.from({ length: Math.min(opts.concurrency, pending.length) }, () => worker());
  await Promise.all(workers);

  const { linkedCount } = syncLectureAudio();
  console.log(
    `Audio generation complete: ${successCount}/${pending.length} saved; ${linkedCount}/${clips.length} linked.`
  );

  if (failures.length > 0) {
    console.error(`Failed clips (${failures.length}):`, failures);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal audio generation error:', err);
  process.exit(1);
});
