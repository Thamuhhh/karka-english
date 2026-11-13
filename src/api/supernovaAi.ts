import { GrammarCorrection, ChatMessage, RoleplayScenario } from '../types';
import { GuidedTranslation, SupernovaClass } from '../constants/curriculum';

let userGeminiApiKey: string | null = null;
const ENV_GEMINI_KEY = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();

function resolveGeminiKey(): string | null {
  if (userGeminiApiKey && userGeminiApiKey.length > 10) {
    return userGeminiApiKey;
  }
  return ENV_GEMINI_KEY.length > 10 ? ENV_GEMINI_KEY : null;
}

export function setGeminiApiKey(key: string | null) {
  userGeminiApiKey = key ? key.trim() : null;
}

export function getGeminiApiKey(): string | null {
  return resolveGeminiKey();
}

export function isGeminiConfigured(): boolean {
  return !!resolveGeminiKey();
}

export function getLastGeminiError(): string | null {
  return lastGeminiError;
}

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.6-flash'];
const GEMINI_TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
const MODEL_COOLDOWN_MS = 60_000;
const RATE_LIMIT_COOLDOWN_MS = 12_000;
const modelCooldownUntil: Record<string, number> = {};
let lastGeminiError: string | null = null;

function getOrderedModels(models: string[] = GEMINI_MODELS): string[] {
  const now = Date.now();
  const ready = models.filter((m) => (modelCooldownUntil[m] || 0) <= now);
  const cooling = models.filter((m) => (modelCooldownUntil[m] || 0) > now);
  return [...ready, ...cooling];
}

type EndpointBuilder = (model: string) => string;

const buildAiStudioEndpoint: EndpointBuilder = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const buildVertexExpressEndpoint: EndpointBuilder = (model) =>
  `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`;

function parseModelJson<T = any>(rawText: string): T {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function extractCandidateText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((p: any) => !p?.thought && typeof p?.text === 'string')
    .map((p: any) => p.text)
    .join('')
    .trim();
}

function getModelThinkingLevel(model: string): 'MINIMAL' | 'LOW' {
  return model.includes('lite') ? 'MINIMAL' : 'LOW';
}

function withModelPayload(model: string, payload: Record<string, any>): Record<string, any> {
  if (!payload.generationConfig?.thinkingConfig) {
    return payload;
  }
  return {
    ...payload,
    generationConfig: {
      ...payload.generationConfig,
      thinkingConfig: {
        ...payload.generationConfig.thinkingConfig,
        thinkingLevel: getModelThinkingLevel(model),
      },
    },
  };
}

interface ProviderAttemptResult {
  data: any | null;
  authOrKeyRejected: boolean;
  error: string | null;
}

interface ProviderRequestOptions {
  models?: string[];
  isValidResponse?: (data: any) => boolean;
}

async function tryEndpointProvider(
  apiKey: string,
  payload: Record<string, any>,
  timeoutMs: number,
  buildEndpoint: EndpointBuilder,
  options?: ProviderRequestOptions
): Promise<ProviderAttemptResult> {
  const modelErrors: string[] = [];
  let hadTimeout = false;
  const modelsToTry = getOrderedModels(options?.models);
  const validateResponse = options?.isValidResponse || ((data: any) => Boolean(extractCandidateText(data)));

  for (const model of modelsToTry) {
    const endpoint = buildEndpoint(model);
    // Avoid chaining multiple full-length waits if a request has already stalled on this turn
    const perModelTimeout = hadTimeout ? Math.min(timeoutMs, 15000) : timeoutMs;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), perModelTimeout) : null;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(withModelPayload(model, payload)),
        ...(controller ? { signal: controller.signal } : {}),
      });

      if (res.ok) {
        delete modelCooldownUntil[model];
        const json = await res.json();
        if (validateResponse(json)) {
          return { data: json, authOrKeyRejected: false, error: null };
        }
        const finishReason = json?.candidates?.[0]?.finishReason || 'EMPTY';
        const emptyMsg = `Empty candidate response (${finishReason})`;
        modelErrors.push(`${model}: ${emptyMsg}`);
        console.warn('Gemini empty response:', model, finishReason);
        continue;
      }

      let apiMsg = '';
      try {
        const errJson = await res.json();
        if (typeof errJson?.error?.message === 'string') {
          apiMsg = errJson.error.message.trim();
        }
      } catch {
        // Ignore non-JSON error body
      }
      const errSnippet = apiMsg ? `HTTP ${res.status}: ${apiMsg.slice(0, 180)}` : `HTTP ${res.status}`;
      modelErrors.push(`${model}: ${errSnippet}`);
      console.warn('Gemini request error:', model, errSnippet);

      if (res.status === 503 || res.status === 429) {
        const cooldown = res.status === 429 ? RATE_LIMIT_COOLDOWN_MS : MODEL_COOLDOWN_MS;
        modelCooldownUntil[model] = Date.now() + cooldown;
      }

      const isKeyRejection =
        res.status === 401 ||
        res.status === 403 ||
        (res.status === 400 && apiMsg.toLowerCase().includes('api key'));
      if (isKeyRejection) {
        return { data: null, authOrKeyRejected: true, error: errSnippet };
      }
    } catch (e: any) {
      const isTimeout = e?.name === 'AbortError';
      if (isTimeout) {
        hadTimeout = true;
      }
      const catchMsg = isTimeout
        ? `Timed out after ${Math.round(perModelTimeout / 1000)}s`
        : typeof e?.message === 'string'
          ? e.message
          : 'Network request failed';
      modelErrors.push(`${model}: ${catchMsg}`);
      console.warn('Gemini request error:', model, catchMsg);
      if (hadTimeout && modelErrors.length >= 2) {
        break;
      }
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  return {
    data: null,
    authOrKeyRejected: false,
    error: modelErrors.length > 0 ? modelErrors.join(' | ').slice(0, 280) : null,
  };
}

async function callGeminiWithTimeout(
  apiKey: string,
  payload: Record<string, any>,
  timeoutMs = 15000,
  options?: ProviderRequestOptions
): Promise<any | null> {
  lastGeminiError = null;

  // Google AI Studio keys (both AIza... and newer AQ....) use generativelanguage.googleapis.com first
  const primary = await tryEndpointProvider(
    apiKey,
    payload,
    timeoutMs,
    buildAiStudioEndpoint,
    options
  );
  if (primary.data) {
    return primary.data;
  }

  // Only fall back to Vertex AI Express Mode when an AQ. key is rejected on AI Studio
  if (primary.authOrKeyRejected && apiKey.startsWith('AQ.')) {
    const vertexFallback = await tryEndpointProvider(
      apiKey,
      payload,
      timeoutMs,
      buildVertexExpressEndpoint,
      options
    );
    if (vertexFallback.data) {
      return vertexFallback.data;
    }
    lastGeminiError =
      !vertexFallback.authOrKeyRejected && vertexFallback.error
        ? vertexFallback.error
        : primary.error || vertexFallback.error;
    return null;
  }

  lastGeminiError = primary.error;
  return null;
}

export async function validateGeminiApiKey(key: string): Promise<{ ok: boolean; message: string }> {
  const clean = key.trim();
  if (!clean) {
    return { ok: false, message: 'API key cannot be empty.' };
  }
  if ((!clean.startsWith('AIza') && !clean.startsWith('AQ.')) || clean.length < 25) {
    return {
      ok: false,
      message: 'Key format looks invalid (expected Gemini API key starting with AIza... or AQ....).',
    };
  }

  const res = await callGeminiWithTimeout(
    clean,
    {
      contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }],
      generationConfig: {
        maxOutputTokens: 256,
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    },
    10000
  );

  if (extractCandidateText(res)) {
    return { ok: true, message: 'Connected! Live Gemini Flash tutor is active.' };
  }
  return {
    ok: false,
    message: lastGeminiError || 'Could not verify online (check network or key quota). Key saved for live retry.',
  };
}

// -------------------------------------------------------------
// 1. Supernova AI Grammar & Sentence Diagnostic Engine
// -------------------------------------------------------------
export async function analyzeSentenceGrammar(sentence: string): Promise<GrammarCorrection> {
  const trimmed = sentence.trim();
  if (!trimmed) {
    return {
      originalSentence: '',
      correctedSentence: '',
      hasErrors: false,
      explanation: 'Please enter a sentence to analyze.',
      tamilExplanation: 'ஆய்வு செய்ய ஒரு வாக்கியத்தை உள்ளிடவும்.',
      formalVersion: '',
      casualVersion: '',
      nativeIdiomaticVersion: '',
      fluencyScore: 100,
    };
  }

  const activeKey = resolveGeminiKey();
  if (activeKey) {
    const prompt = `You are "Nila", the Elvate AI English linguistics tutor for Tamil-speaking professionals.
Analyze the following sentence:
"${trimmed}"

Respond ONLY with valid JSON without markdown backticks:
{
  "hasErrors": boolean,
  "correctedSentence": "string",
  "explanation": "clear explanation in concise English of what was improved",
  "tamilExplanation": "clear explanation in Tamil explaining the grammar nuance",
  "formalVersion": "polished executive email / workplace phrasing",
  "casualVersion": "natural relaxed everyday phrasing",
  "nativeIdiomaticVersion": "idiomatic native speaker alternative",
  "fluencyScore": number between 40 and 100
}`;

    const json = await callGeminiWithTimeout(activeKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    });

    const rawText = extractCandidateText(json);
    if (rawText) {
      try {
        const parsed = parseModelJson(rawText);
        return {
          originalSentence: trimmed,
          correctedSentence: parsed.correctedSentence || trimmed,
          hasErrors: parsed.hasErrors ?? false,
          explanation: parsed.explanation || 'Sentence analyzed successfully.',
          tamilExplanation:
            parsed.tamilExplanation || 'வாக்கியம் வெற்றிகரமாக பகுப்பாய்வு செய்யப்பட்டது.',
          formalVersion: parsed.formalVersion || trimmed,
          casualVersion: parsed.casualVersion || trimmed,
          nativeIdiomaticVersion: parsed.nativeIdiomaticVersion || trimmed,
          fluencyScore: Math.max(40, Math.min(100, Number(parsed.fluencyScore) || 85)),
        };
      } catch (e) {
        console.warn('Gemini JSON parse fallback triggered:', e);
      }
    }
  }

  return localGrammarDiagnosis(trimmed);
}

export function localGrammarDiagnosis(sentence: string): GrammarCorrection {
  let corrected = sentence.trim();
  let hasErrors = false;
  const explanations: string[] = [];
  const tamilNotes: string[] = [];
  let score = 96;

  const flagRule = (penalty: number, eng: string, tamil: string) => {
    hasErrors = true;
    score -= penalty;
    explanations.push(eng);
    tamilNotes.push(tamil);
  };

  // Rule 1: did / didn't + irregular past verb
  const pastAfterDid = /\b(didn't|did\s+not)\s+(went|came|ate|saw|took|did|bought|got|told|spoke)\b/gi;
  if (pastAfterDid.test(corrected)) {
    const baseMap: Record<string, string> = {
      went: 'go',
      came: 'come',
      ate: 'eat',
      saw: 'see',
      took: 'take',
      did: 'do',
      bought: 'buy',
      got: 'get',
      told: 'tell',
      spoke: 'speak',
    };
    corrected = corrected.replace(
      /\b(didn't|did\s+not)\s+(went|came|ate|saw|took|did|bought|got|told|spoke)\b/gi,
      (_, aux, v) => `${aux} ${baseMap[v.toLowerCase()] || v}`
    );
    flagRule(
      22,
      "After 'did' or 'didn't', always use the base verb form (e.g., go, come), not the past tense.",
      "'Did' அல்லது 'didn't' வந்தால் வினைச்சொல்லின் முதல் நிலை (base form: go/come) மட்டுமே வர வேண்டும்."
    );
  }

  // Rule 2: He/She/It + don't -> doesn't
  if (/\b(he|she|it|everyone|someone|nobody)\s+don't\b/i.test(corrected)) {
    corrected = corrected.replace(
      /\b(he|she|it|everyone|someone|nobody)\s+don't\b/gi,
      "$1 doesn't"
    );
    flagRule(
      18,
      "Third-person singular subjects (he, she, it, everyone) take 'doesn't', not 'don't'.",
      "He, She, It போன்ற ஒருமைக்கு 'doesn't' பயன்படுத்த வேண்டும், 'don't' அல்ல."
    );
  }

  // Rule 3: "Myself [Name]" subject error
  if (/^\s*myself\s+([A-Za-z]+)/i.test(corrected)) {
    corrected = corrected.replace(/^\s*myself\s+/i, 'I am ');
    flagRule(
      20,
      "Never use 'Myself' as a sentence subject. Start introductions with 'I am [Name]' or 'My name is [Name]'.",
      "'Myself' என்பது தவறு; 'I am [பெயர்]' அல்லது 'My name is...' என்று தொடங்க வேண்டும்."
    );
  }

  // Rule 4: "I am having (a) doubt" -> "I have a question"
  if (/\b(i\s+am|i'm)\s+having\s+(a\s+)?(doubt|question|experience)\b/i.test(corrected)) {
    corrected = corrected.replace(
      /\b(i\s+am|i'm)\s+having\s+(a\s+)?doubt\b/gi,
      'I have a question'
    );
    corrected = corrected.replace(
      /\b(i\s+am|i'm)\s+having\s+(a\s+)?question\b/gi,
      'I have a question'
    );
    corrected = corrected.replace(
      /\b(i\s+am|i'm)\s+having\s+([0-9]+\s+years?)\s*(of\s+)?experience\b/gi,
      'I have $2 of experience'
    );
    flagRule(
      16,
      "Possession and questions use stative 'have', not continuous 'am having'. Native speakers say 'I have a question'.",
      "'I am having a doubt' என்பதை விட 'I have a question' என்பதே இயல்பான ஆங்கிலம்."
    );
  }

  // Rule 5: Redundant Indian-English collocations (revert back, discuss about, return back, cope up)
  if (/\brevert\s+back\b/i.test(corrected)) {
    corrected = corrected.replace(/\brevert\s+back\b/gi, 'reply');
    flagRule(
      14,
      "'Revert' already means to reply or return, so 'revert back' is redundant. Use 'reply' or 'get back to you'.",
      "'Revert back' என்று சொல்லத் தேவையில்லை; 'reply' அல்லது 'get back' போதும்."
    );
  }
  if (/\bdiscuss\s+about\b/i.test(corrected)) {
    corrected = corrected.replace(/\bdiscuss\s+about\b/gi, 'discuss');
    flagRule(
      14,
      "'Discuss' already covers 'about'. Say 'discuss the topic', not 'discuss about the topic'.",
      "'Discuss' சொல்லுக்குப் பிறகு 'about' வரக்கூடாது."
    );
  }
  if (/\breturn\s+back\b/i.test(corrected)) {
    corrected = corrected.replace(/\breturn\s+back\b/gi, 'return');
    flagRule(12, "'Return' already means go back — remove 'back'.", "'Return'-உடன் 'back' சேர்க்க வேண்டாம்.");
  }
  if (/\bcope\s+up\s+with\b/i.test(corrected)) {
    corrected = corrected.replace(/\bcope\s+up\s+with\b/gi, 'cope with');
    flagRule(
      14,
      "The correct idiom is 'cope with', not 'cope up with'.",
      "சரியான சொற்றொடர் 'cope with' ஆகும் ('up' தேவையில்லை)."
    );
  }

  // Rule 6: "Yesterday / last week + present perfect" -> Simple Past
  if (/\b(yesterday|last\s+week|last\s+month|ago)\b.*\b(have|has)\s+(seen|done|gone|met|completed|finished|sent)\b/i.test(corrected)) {
    const pastLookup: Record<string, string> = {
      seen: 'saw',
      done: 'did',
      gone: 'went',
      met: 'met',
      completed: 'completed',
      finished: 'finished',
      sent: 'sent',
    };
    corrected = corrected.replace(
      /\b(have|has)\s+(seen|done|gone|met|completed|finished|sent)\b/gi,
      (_, __, verb) => pastLookup[verb.toLowerCase()] || verb
    );
    corrected = corrected.replace(/\byesterday\s+only\b/gi, 'just yesterday');
    flagRule(
      18,
      "Finished past time markers (yesterday, last week) require Simple Past, not Present Perfect ('have completed').",
      "'Yesterday' போன்ற முடிந்த நேரத்தைச் சொல்லும்போது 'have completed' அல்ல, 'completed' (Simple Past) வர வேண்டும்."
    );
  }

  // Rule 7: "passed out" (college graduation)
  if (/\bpassed\s+out\s+(from|of|in)\b/i.test(corrected)) {
    corrected = corrected.replace(/\bpassed\s+out\s+(from|of|in)\b/gi, 'graduated $1');
    flagRule(
      16,
      "In global English, 'pass out' means to faint. Say 'graduated from' for completing a degree.",
      "படிப்பை முடிப்பதை 'passed out' எனச் சொல்லாமல் 'graduated from' என்று சொல்ல வேண்டும்."
    );
  }

  // Rule 8: Double comparative (more better, more easier, more faster)
  if (/\bmore\s+(better|easier|faster|cheaper|stronger|clearer)\b/i.test(corrected)) {
    corrected = corrected.replace(/\bmore\s+(better|easier|faster|cheaper|stronger|clearer)\b/gi, '$1');
    flagRule(
      15,
      "Avoid double comparatives like 'more better' — 'better' alone already compares.",
      "'More better' என்று இரண்டு முறை ஒப்பிடக் கூடாது; 'better' மட்டுமே சரியானது."
    );
  }

  // Rule 9: "one of my friend/colleague" -> plural noun
  if (/\bone\s+of\s+(my|the|our)\s+(friend|colleague|student|manager|project)\b/i.test(corrected)) {
    corrected = corrected.replace(
      /\bone\s+of\s+(my|the|our)\s+(friend|colleague|student|manager|project)\b/gi,
      'one of $1 $2s'
    );
    flagRule(
      15,
      "After 'one of my/the...', always use a plural noun (e.g., 'one of my friends').",
      "'One of my...' என்பதற்குப் பிறகு எப்போதும் பன்மைச் சொல் (friends) வர வேண்டும்."
    );
  }

  // Rule 10: "I am agree" -> "I agree"
  if (/\b(i\s+am|i'm|we\s+are|they\s+are)\s+agree\b/i.test(corrected)) {
    corrected = corrected
      .replace(/\b(i\s+am|i'm)\s+agree\b/gi, 'I agree')
      .replace(/\bwe\s+are\s+agree\b/gi, 'we agree')
      .replace(/\bthey\s+are\s+agree\b/gi, 'they agree');
    flagRule(
      15,
      "'Agree' is a main verb, not an adjective — say 'I agree', never 'I am agree'.",
      "'Agree' ஒரு வினைச்சொல்; எனவே 'I agree' என்றே சொல்ல வேண்டும் ('am' தேவையில்லை)."
    );
  }

  // Rule 11: "since + duration" -> "for + duration"
  if (/\bsince\s+\d+\s+(years?|months?|weeks?|days?|hours?)\b/i.test(corrected)) {
    corrected = corrected.replace(
      /\bsince\s+(\d+\s+(?:years?|months?|weeks?|days?|hours?))\b/gi,
      'for $1'
    );
    flagRule(
      15,
      "Use 'for' with time durations (for 3 years) and 'since' only with starting dates/times (since 2022).",
      "கால அளவுக்கு 'for' (for 3 years) பயன்படுத்தவும்; தொடக்க நேரத்திற்கு மட்டுமே 'since' வரும்."
    );
  }

  // Rule 12: Punctuation & capitalization polish
  if (!/^[A-Z]/.test(corrected)) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
    if (!hasErrors) {
      explanations.push('Capitalized the start of the sentence cleanly.');
      tamilNotes.push('வாக்கியத்தின் முதல் எழுத்து பெரிய எழுத்தாக (Capital) இருக்க வேண்டும்.');
      score -= 3;
    }
  }
  if (!/[.?!]$/.test(corrected)) {
    corrected += '.';
  }

  const baseNoPunct = corrected.replace(/[.?!]+$/, '');
  const lowerStart = baseNoPunct.charAt(0).toLowerCase() + baseNoPunct.slice(1);
  const formal = baseNoPunct.endsWith('?')
    ? `Could you please clarify: ${lowerStart}?`
    : `For your reference, ${lowerStart}.`;
  const casual = baseNoPunct.endsWith('?')
    ? `Hey, ${lowerStart}?`
    : `Just so you know, ${lowerStart}.`;
  const native = hasErrors
    ? corrected
    : baseNoPunct.endsWith('?')
      ? corrected
      : `To put it clearly, ${lowerStart}.`;

  return {
    originalSentence: sentence,
    correctedSentence: corrected,
    hasErrors,
    explanation:
      explanations.length > 0
        ? explanations.join(' ')
        : 'Clean grammar and natural phrasing! Ready for workplace conversations.',
    tamilExplanation:
      tamilNotes.length > 0
        ? tamilNotes.join(' ')
        : 'வாக்கிய அமைப்பு மிகச் சரியாக உள்ளது! இயல்பாகவும் தெளிவாகவும் உள்ளது.',
    formalVersion: formal,
    casualVersion: casual,
    nativeIdiomaticVersion: native,
    fluencyScore: Math.max(45, Math.min(100, score)),
  };
}

async function requestSingleTurnCoachReply(
  activeKey: string,
  contextInstruction: string,
  history: ChatMessage[],
  userMessage: string
): Promise<{ reply: string; feedback: GrammarCorrection } | null> {
  const recent = history.slice(-5);
  const last = recent[recent.length - 1];
  const prior =
    last && last.role === 'user' && last.content.trim() === userMessage.trim()
      ? recent.slice(0, -1)
      : recent;
  const recentLines = prior
    .slice(-4)
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'Learner'}: ${m.content}`)
    .join('\n');

  const prompt = `${contextInstruction}
Recent Conversation:
${recentLines || '(First turn)'}
Learner just said: "${userMessage}"

This is a relaxed, spoken roleplay, not a lesson or an interview about grammar. React to the specific detail the learner shared. Use contractions and everyday phrasing. Avoid generic praise, repeated sentence openers, and repeating the learner's words. Ask a relevant follow-up only when it would naturally keep this conversation going; sometimes respond without a question. Keep the spoken reply brief (usually one sentence, at most about 25 words). Never put corrections or grammar explanations in the spoken reply; put them only in the feedback fields. Keep each English and Tamil explanation to one short sentence. Treat the conversation history as the source of truth and don't ask for information the learner already gave.
Respond ONLY with valid JSON:
{
  "reply": "string",
  "hasErrors": boolean,
  "correctedSentence": "string",
  "explanation": "concise English grammar note",
  "tamilExplanation": "concise Tamil grammar note",
  "nativeIdiomaticVersion": "natural native phrasing",
  "fluencyScore": number between 40 and 100
}`;

  const json = await callGeminiWithTimeout(activeKey, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'LOW' },
    },
  });

  const rawText = extractCandidateText(json);
  if (!rawText) return null;

  try {
    const parsed = parseModelJson(rawText);
    const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
    if (!reply) return null;

    const corrected =
      typeof parsed.correctedSentence === 'string' && parsed.correctedSentence.trim()
        ? parsed.correctedSentence.trim()
        : userMessage;
    const native =
      typeof parsed.nativeIdiomaticVersion === 'string' && parsed.nativeIdiomaticVersion.trim()
        ? parsed.nativeIdiomaticVersion.trim()
        : corrected;

    return {
      reply,
      feedback: {
        originalSentence: userMessage,
        correctedSentence: corrected,
        hasErrors: Boolean(parsed.hasErrors),
        explanation:
          typeof parsed.explanation === 'string' && parsed.explanation.trim()
            ? parsed.explanation.trim()
            : 'Clear and natural phrasing!',
        tamilExplanation:
          typeof parsed.tamilExplanation === 'string' && parsed.tamilExplanation.trim()
            ? parsed.tamilExplanation.trim()
            : 'நன்றாக உள்ளது! தொடர்ந்து பேசுங்கள்.',
        formalVersion: corrected,
        casualVersion: native,
        nativeIdiomaticVersion: native,
        fluencyScore: Math.max(40, Math.min(100, Number(parsed.fluencyScore) || 85)),
      },
    };
  } catch (e) {
    console.warn('Gemini coach JSON parse fallback triggered:', e);
    return null;
  }
}

// -------------------------------------------------------------
// 2. Supernova Chat Coach (Roleplay & Conversation)
// -------------------------------------------------------------
export async function sendChatMessage(
  history: ChatMessage[],
  userMessage: string,
  scenario: RoleplayScenario
): Promise<{ reply: string; feedback: GrammarCorrection }> {
  const activeKey = resolveGeminiKey();
  if (activeKey) {
    const combined = await requestSingleTurnCoachReply(
      activeKey,
      `You are an English coach in roleplay:
Role: ${scenario.persona}
Scenario: ${scenario.description}
Roleplay style: ${scenario.systemPrompt}
Speak like a real person in this role, not like a tutor grading every line.`,
      history,
      userMessage
    );
    if (combined) {
      return combined;
    }
  }

  const feedback = localGrammarDiagnosis(userMessage);
  const userTurnCount = history.filter((message) => message.role === 'user').length;
  const reply = generateLocalScenarioReply(userMessage, scenario, userTurnCount);
  return { reply, feedback };
}

export function generateLocalScenarioReply(
  userMsg: string,
  scenario: RoleplayScenario,
  turnCount = 1
): string {
  const lower = userMsg.toLowerCase();
  const pickByTurn = (options: string[]) => options[Math.max(0, turnCount - 1) % options.length];

  if (scenario.id === 'interview-tech') {
    if (lower.includes('project') || lower.includes('built') || lower.includes('developed')) {
      return pickByTurn([
        'What part of that project did you own?',
        'How did you decide what to build first?',
      ]);
    }
    if (lower.includes('challenge') || lower.includes('problem') || lower.includes('bug') || lower.includes('latency')) {
      return 'How did you narrow down what was causing it?';
    }
    if (lower.includes('developer') || lower.includes('engineer') || lower.includes('react') || lower.includes('api')) {
      return 'What kind of work have you enjoyed most recently?';
    }
    return pickByTurn(['What happened next?', 'What did you learn from that experience?']);
  }

  if (scenario.id === 'cafe-order') {
    if (lower.includes('coffee') || lower.includes('latte') || lower.includes('cappuccino') || lower.includes('tea')) {
      return 'Sure. What size would you like?';
    }
    if (lower.includes('croissant') || lower.includes('pastry') || lower.includes('muffin') || lower.includes('milk')) {
      return 'Would you like me to warm that up?';
    }
    return pickByTurn(["That'll be £4.50. Is that for here or to take away?", 'You can tap your card whenever you are ready.']);
  }

  if (scenario.id === 'airport-travel') {
    if (lower.includes('vacation') || lower.includes('tourism') || lower.includes('visit') || lower.includes('holiday')) {
      return 'How long are you staying?';
    }
    if (lower.includes('work') || lower.includes('conference') || lower.includes('meeting') || lower.includes('business')) {
      return 'Which company are you visiting?';
    }
    return pickByTurn(['Do you have a return ticket?', 'All right. Enjoy your stay.']);
  }

  if (scenario.id === 'workplace-standup') {
    if (lower.includes('blocker') || lower.includes('stuck') || lower.includes('waiting') || lower.includes('delay')) {
      return 'What would help you move it forward?';
    }
    if (lower.includes('yesterday') || lower.includes('today') || lower.includes('testing') || lower.includes('completed')) {
      return 'Is there anything you need from the team today?';
    }
    return pickByTurn(['Got it. Anything else for today?', 'Thanks for the update.']);
  }

  if (scenario.id === 'casual-hangout') {
    if (lower.includes('pizza') || lower.includes('food') || lower.includes('dinner') || lower.includes('hungry')) {
      return pickByTurn(['That sounds good. What do you feel like ordering?', 'Nice. Have you tried that place before?']);
    }
    if (lower.includes('busy') || lower.includes('tired') || lower.includes('good') || lower.includes('productive')) {
      return pickByTurn(['What was the best part of your day?', 'Hope you get a chance to relax. What do you usually do to unwind?']);
    }
    return pickByTurn(['Oh, I see. What do you enjoy about it?', 'Tell me more about that.']);
  }

  return pickByTurn(['I see. What happened next?', 'Tell me a little more.']);
}

const CONTRACTION_MAP: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\bi've\b/g, 'i have'],
  [/\bi'd\b/g, 'i would'],
  [/\bi'll\b/g, 'i will'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bcan't\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\bcouldn't\b/g, 'could not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'],
];

function normalizeForComparison(text: string): string {
  let clean = text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [pattern, expansion] of CONTRACTION_MAP) {
    clean = clean.replace(pattern, expansion);
  }
  return clean.replace(/[']/g, '').replace(/\s+/g, ' ').trim();
}

const STOPWORDS = new Set(['a', 'an', 'the', 'is', 'am', 'are', 'to', 'of', 'in', 'on', 'for', 'my', 'i']);

export interface TranslationEvalResult {
  isCorrect: boolean;
  score: number;
  feedbackEnglish: string;
  tamilExplanation: string;
  expectedEnglish: string;
}

/** Evaluates a learner's typed English translation against the target prompt and grammar rules. */
export async function checkLessonTranslation(
  userAnswer: string,
  translation: GuidedTranslation
): Promise<TranslationEvalResult> {
  const normUser = normalizeForComparison(userAnswer);
  const normExpected = normalizeForComparison(translation.expectedEnglish);

  if (normUser && normUser === normExpected) {
    return {
      isCorrect: true,
      score: 100,
      feedbackEnglish: translation.explanation,
      tamilExplanation: translation.tamilExplanation,
      expectedEnglish: translation.expectedEnglish,
    };
  }

  const grammar = await analyzeSentenceGrammar(userAnswer);
  const expectedKeywords = normExpected
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  const userTokenSet = new Set(normUser.split(' '));
  const matchedCount = expectedKeywords.filter((w) => userTokenSet.has(w)).length;
  const keywordCoverage = expectedKeywords.length > 0 ? matchedCount / expectedKeywords.length : 0;

  if (!grammar.hasErrors && keywordCoverage >= 0.6) {
    return {
      isCorrect: true,
      score: Math.max(85, grammar.fluencyScore),
      feedbackEnglish: `Great natural phrasing! ${translation.explanation}`,
      tamilExplanation: translation.tamilExplanation,
      expectedEnglish: translation.expectedEnglish,
    };
  }

  return {
    isCorrect: false,
    score: grammar.fluencyScore,
    feedbackEnglish: grammar.hasErrors ? grammar.explanation : translation.explanation,
    tamilExplanation: translation.tamilExplanation,
    expectedEnglish: translation.expectedEnglish,
  };
}

/** Generates Nila's conversational reply + grammar feedback during Lesson Stage 4 (Real Talk). */
export async function sendLessonRealTalkReply(
  history: ChatMessage[],
  userMessage: string,
  lesson: SupernovaClass
): Promise<{ reply: string; feedback: GrammarCorrection }> {
  const activeKey = resolveGeminiKey();
  if (activeKey) {
    const combined = await requestSingleTurnCoachReply(
      activeKey,
      `You are Nila, an English partner for a Tamil speaker finishing "${lesson.title}".
Goal: ${lesson.speakingChallenge.prompt}
Target grammar pattern: ${lesson.grammarTopic}`,
      history,
      userMessage
    );
    if (combined) {
      return combined;
    }
  }

  const feedback = localGrammarDiagnosis(userMessage);

  const userTurnNum = history.filter((m) => m.role === 'user').length;
  const sampleNative = lesson.speakingChallenge.sampleNativeResponse;
  const correctionTip = feedback.hasErrors
    ? `Quick tip: try "${feedback.correctedSentence}". `
    : '';

  const localReplies = [
    `${correctionTip}Nice! That sounds natural for "${lesson.grammarTopic}". Can you add one more detail or tell me why?`,
    `${correctionTip}Awesome conversation flow! For an even more natural touch, natives also say: "${sampleNative}". Ready to wrap up, or want one more turn?`,
  ];

  const reply = localReplies[Math.min(userTurnNum - 1, localReplies.length - 1)] || localReplies[0];
  return { reply, feedback };
}

export type SpokenAudioContext =
  | { mode: 'scenario'; scenario: RoleplayScenario }
  | { mode: 'lesson'; lesson: SupernovaClass };

export type SpokenAudioResult =
  | { ok: true; transcript: string; reply: string; feedback: GrammarCorrection }
  | { ok: false; reason: 'no_key' | 'unintelligible' | 'network'; detail?: string };

/**
 * Evaluates a real recorded user voice turn via Gemini Flash multimodal audio:
 * transcribes speech, coaches pronunciation & grammar (EN + Tamil), and generates Nila's reply.
 */
export async function analyzeAndReplySpokenAudio(
  base64Audio: string,
  mimeType: string,
  history: ChatMessage[],
  context: SpokenAudioContext
): Promise<SpokenAudioResult> {
  const activeKey = resolveGeminiKey();
  if (!activeKey) {
    return { ok: false, reason: 'no_key' };
  }

  const recentLines = history
    .slice(-4)
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'Learner'}: ${m.content}`)
    .join('\n');

  const roleContext =
    context.mode === 'scenario'
      ? `Persona: ${context.scenario.persona}\nScenario: ${context.scenario.description}\nRoleplay style: ${context.scenario.systemPrompt}`
      : `Lesson: ${context.lesson.title} | Goal: ${context.lesson.speakingChallenge.prompt} | Target: ${context.lesson.grammarTopic}`;

  const prompt = `Listen to this Tamil learner's spoken English and continue the conversation as the roleplay character.\n${roleContext}
Recent:
${recentLines || '(First turn)'}

This is relaxed conversation, not an oral exam. Respond to what the learner means and the details they gave. Speak in natural everyday English with contractions. Avoid generic praise, repeated sentence starters, and repeating the learner's words. Keep the spoken reply brief (usually one sentence, at most about 25 words). Ask one relevant follow-up only if it feels natural; sometimes just respond and let the learner take the next turn. Do not put corrections in the spoken reply. Never ask again for information already given. Keep grammar and Tamil coaching notes to one short sentence each.
Return JSON only:
{
  "transcript": "exact spoken words or \"\" if silent",
  "fluencyScore": number,
  "pronunciationTip": "short clarity/stress tip",
  "hasErrors": boolean,
  "correctedSentence": "string",
  "explanation": "short English grammar note",
  "tamilExplanation": "short Tamil grammar note",
  "reply": "natural reply"
}`;

  const json = await callGeminiWithTimeout(
    activeKey,
    {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Audio } },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'LOW' },
      },
    },
    25000
  );

  const rawText = extractCandidateText(json);
  if (!rawText) {
    return { ok: false, reason: 'network', detail: lastGeminiError || undefined };
  }

  try {
    const parsed = parseModelJson(rawText);
    const transcript = typeof parsed.transcript === 'string' ? parsed.transcript.trim() : '';
    if (!transcript) {
      return { ok: false, reason: 'unintelligible' };
    }

    const corrected =
      typeof parsed.correctedSentence === 'string' && parsed.correctedSentence.trim()
        ? parsed.correctedSentence.trim()
        : transcript;

    const feedback: GrammarCorrection = {
      originalSentence: transcript,
      correctedSentence: corrected,
      hasErrors: Boolean(parsed.hasErrors),
      explanation:
        typeof parsed.explanation === 'string' && parsed.explanation.trim()
          ? parsed.explanation.trim()
          : 'Clear spoken response!',
      tamilExplanation:
        typeof parsed.tamilExplanation === 'string' && parsed.tamilExplanation.trim()
          ? parsed.tamilExplanation.trim()
          : 'நன்றாக பேசினீர்கள்! தொடர்ந்து பயிற்சி செய்யுங்கள்.',
      pronunciationTip:
        typeof parsed.pronunciationTip === 'string' && parsed.pronunciationTip.trim()
          ? parsed.pronunciationTip.trim()
          : undefined,
      formalVersion: corrected,
      casualVersion: corrected,
      nativeIdiomaticVersion: corrected,
      fluencyScore: Math.max(40, Math.min(100, Number(parsed.fluencyScore) || 82)),
    };

    const fallbackReply = context.mode === 'scenario'
      ? generateLocalScenarioReply(
          transcript,
          context.scenario,
          history.filter((message) => message.role === 'user').length + 1
        )
      : 'I see. What happened next?';
    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : fallbackReply;

    return { ok: true, transcript, reply, feedback };
  } catch (e) {
    console.warn('Gemini audio JSON parse error:', e);
    return { ok: false, reason: 'network', detail: 'Could not parse Gemini response cleanly.' };
  }
}

function extractInlineAudio(data: any): { base64: string; mimeType: string } | null {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data;
    const rawData = inline?.data;
    if (typeof rawData === 'string' && rawData.length > 100) {
      const mimeType =
        typeof inline?.mimeType === 'string'
          ? inline.mimeType
          : typeof inline?.mime_type === 'string'
            ? inline.mime_type
            : 'audio/L16;rate=24000';
      return { base64: rawData, mimeType };
    }
  }
  return null;
}

/**
 * Generates expressive spoken audio using Gemini 3.8 TTS models (returns base64 PCM/WAV).
 * Used for natural Chennai-Tamil coach lectures and crisp English accent playback.
 */
export async function synthesizeGeminiSpeech(
  text: string,
  mode: 'tamil-coach' | 'english-native',
  accent: 'en-US' | 'en-GB' | 'en-AU' = 'en-US'
): Promise<{ base64: string; mimeType: string } | null> {
  const clean = text.trim();
  const activeKey = resolveGeminiKey();
  if (!clean || !activeKey) return null;

  const accentName = accent === 'en-GB' ? 'British English' : accent === 'en-AU' ? 'Australian English' : 'American English';
  const speechDirection = mode === 'english-native'
    ? `Say the following in ${accentName} as a friendly conversation partner. Sound warm, relaxed, and natural, with human pacing and light emphasis. Do not sound like a narrator or announcer. Speak only the words after "Text to say:".\nText to say: ${clean}`
    : `Say the following in clear, friendly spoken Tamil, like a patient teacher explaining something to one learner. Use a natural pace and warm tone. Speak only the words after "Text to say:".\nText to say: ${clean}`;

  const json = await callGeminiWithTimeout(
    activeKey,
    {
      contents: [{ role: 'user', parts: [{ text: speechDirection }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            },
          },
        },
      },
    },
    11000,
    {
      models: GEMINI_TTS_MODELS,
      isValidResponse: (data) => Boolean(extractInlineAudio(data)),
    }
  );

  return extractInlineAudio(json);
}
