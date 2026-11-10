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

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

async function callGeminiWithTimeout(
  apiKey: string,
  payload: object,
  timeoutMs = 9000
): Promise<any | null> {
  for (const model of GEMINI_MODELS) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          ...(controller ? { signal: controller.signal } : {}),
        }
      );

      if (res.ok) {
        return await res.json();
      }
      if (res.status === 400 || res.status === 403 || res.status === 401) {
        return null;
      }
    } catch (e) {
      // Fall through to next model or local engine
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return null;
}

export async function validateGeminiApiKey(key: string): Promise<{ ok: boolean; message: string }> {
  const clean = key.trim();
  if (!clean) {
    return { ok: false, message: 'API key cannot be empty.' };
  }
  if (!clean.startsWith('AIza') || clean.length < 25) {
    return { ok: false, message: 'Key format looks invalid (Google Gemini keys start with AIza).' };
  }

  const res = await callGeminiWithTimeout(
    clean,
    {
      contents: [{ parts: [{ text: 'Reply with OK' }] }],
      generationConfig: { maxOutputTokens: 10, temperature: 0 },
    },
    7000
  );

  if (res?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return { ok: true, message: 'Connected! Live Gemini Flash tutor is active.' };
  }
  return {
    ok: false,
    message: 'Could not verify online (check network or key quota). Key saved for live retry.',
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
    const prompt = `You are "Nila", the NovaBreaker AI English linguistics tutor for Tamil-speaking professionals.
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
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    });

    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      try {
        const parsed = JSON.parse(rawText);
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

// -------------------------------------------------------------
// 2. Supernova Chat Coach (Roleplay & Conversation)
// -------------------------------------------------------------
export async function sendChatMessage(
  history: ChatMessage[],
  userMessage: string,
  scenario: RoleplayScenario
): Promise<{ reply: string; feedback: GrammarCorrection }> {
  const feedback = await analyzeSentenceGrammar(userMessage);

  const activeKey = resolveGeminiKey();
  if (activeKey) {
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `Roleplay Setup:
Role: ${scenario.persona}
Scenario: ${scenario.description}
System Prompt: ${scenario.systemPrompt}
Keep replies natural, encouraging, concise (1-3 sentences), and end with an engaging follow-up question.`,
          },
        ],
      },
      ...history.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const json = await callGeminiWithTimeout(activeKey, {
      contents,
      generationConfig: { maxOutputTokens: 160, temperature: 0.7 },
    });

    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) {
      return { reply: reply.trim(), feedback };
    }
  }

  const reply = generateLocalScenarioReply(userMessage, scenario, history.length);
  return { reply, feedback };
}

export function generateLocalScenarioReply(
  userMsg: string,
  scenario: RoleplayScenario,
  turnCount = 1
): string {
  const lower = userMsg.toLowerCase();

  if (scenario.id === 'interview-tech') {
    if (lower.includes('project') || lower.includes('built') || lower.includes('developed')) {
      return 'That architecture sounds solid! What was the toughest bottleneck you hit while shipping it, and how did you measure the fix?';
    }
    if (lower.includes('challenge') || lower.includes('problem') || lower.includes('bug') || lower.includes('latency')) {
      return 'Great debugging mindset. How do you usually collaborate with QA or product managers when trade-offs are needed before a release?';
    }
    if (lower.includes('developer') || lower.includes('engineer') || lower.includes('react') || lower.includes('api')) {
      return 'Nice background! Walk me through one technical decision you are proud of making recently.';
    }
    const fallbacks = [
      'Good point. Can you give a quick concrete example from your past team experience?',
      'That makes sense. How do you keep learning new tools alongside daily sprint work?',
    ];
    return fallbacks[turnCount % fallbacks.length];
  }

  if (scenario.id === 'cafe-order') {
    if (lower.includes('coffee') || lower.includes('latte') || lower.includes('cappuccino') || lower.includes('tea')) {
      return 'Brilliant choice! Would you like regular or large, and any preference on oat milk, almond milk, or whole milk?';
    }
    if (lower.includes('croissant') || lower.includes('pastry') || lower.includes('muffin') || lower.includes('milk')) {
      return 'Sorted! Should I warm that croissant up for you, and will that be for here or takeaway?';
    }
    return "That'll be £4.50 altogether. Would you like to pay by contactless card or cash today?";
  }

  if (scenario.id === 'airport-travel') {
    if (lower.includes('vacation') || lower.includes('tourism') || lower.includes('visit') || lower.includes('holiday')) {
      return 'Understood. How many days will you be staying in the country, and do you have your hotel confirmation handy?';
    }
    if (lower.includes('work') || lower.includes('conference') || lower.includes('meeting') || lower.includes('business')) {
      return 'Got it—business travel. Which company are you visiting, and when is your return flight scheduled?';
    }
    return 'Thank you. Everything matches your visa details—please collect your boarding pass and enjoy your stay!';
  }

  if (scenario.id === 'workplace-standup') {
    if (lower.includes('blocker') || lower.includes('stuck') || lower.includes('waiting') || lower.includes('delay')) {
      return "Thanks for flagging that early! Let's sync for 10 minutes right after standup so we unblock your PR before noon.";
    }
    if (lower.includes('yesterday') || lower.includes('today') || lower.includes('testing') || lower.includes('completed')) {
      return 'Awesome progress! Anything you need from backend or design today to stay on track for Friday demo?';
    }
    return 'Clear update! Who would you like to hand off to next on the board?';
  }

  if (scenario.id === 'casual-hangout') {
    if (lower.includes('pizza') || lower.includes('food') || lower.includes('dinner') || lower.includes('hungry')) {
      return "Totally down for that! Should we grab extra garlic knots too, or put on a movie while we wait for delivery?";
    }
    if (lower.includes('busy') || lower.includes('tired') || lower.includes('good') || lower.includes('productive')) {
      return 'Sounds like quite a day! Want to unwind a bit and grab some iced coffee later this evening?';
    }
    return "No way, seriously?! Tell me more—how did everyone else react?";
  }

  return "Got it! That sounds well explained. What would you like to practice saying next?";
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
  const feedback = await analyzeSentenceGrammar(userMessage);

  const activeKey = resolveGeminiKey();
  if (activeKey) {
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: `You are Nila, an encouraging English conversation partner for a Tamil speaker finishing "${lesson.title}".
Goal: ${lesson.speakingChallenge.prompt}
Target grammar pattern: ${lesson.grammarTopic}
Respond warmly in natural spoken English (1-2 short sentences) reacting specifically to what the learner said, and ask one simple, engaging follow-up question.`,
          },
        ],
      },
      ...history.slice(-6).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const json = await callGeminiWithTimeout(activeKey, {
      contents,
      generationConfig: { maxOutputTokens: 130, temperature: 0.7 },
    });

    const aiReply = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (aiReply) {
      return { reply: aiReply.trim(), feedback };
    }
  }

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
  | { ok: false; reason: 'no_key' | 'unintelligible' | 'network' };

/**
 * Evaluates a real recorded user voice turn via Gemini 2.5 Flash multimodal audio:
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
    .slice(-6)
    .map((m) => `${m.role === 'assistant' ? 'Coach' : 'Learner'}: ${m.content}`)
    .join('\n');

  const roleContext =
    context.mode === 'scenario'
      ? `Roleplay Persona: ${context.scenario.persona}\nScenario: ${context.scenario.description}\nStyle: ${context.scenario.systemPrompt}`
      : `Lesson: ${context.lesson.title}\nGoal: ${context.lesson.speakingChallenge.prompt}\nGrammar Target: ${context.lesson.grammarTopic}`;

  const prompt = `Listen carefully to the learner's English speech audio (spoken by a Tamil-native learner).
${roleContext}
Recent Conversation:
${recentLines || '(First learner turn)'}

Tasks:
1. Transcribe accurately what the learner actually spoke in the audio (keep empty string "" if audio is silent or unintelligible).
2. Score fluency & pronunciation clarity from 40 to 100.
3. Give a short actionable pronunciationTip (1 concise sentence on clarity, syllable stress, or pacing).
4. Correct grammar/phrasing naturally if needed, and explain briefly in English and Tamil.
5. Write a warm, natural 1-2 sentence reply continuing this conversation with one clear follow-up question.

Respond ONLY with valid JSON without markdown backticks:
{
  "transcript": "string",
  "fluencyScore": number,
  "pronunciationTip": "string",
  "hasErrors": boolean,
  "correctedSentence": "string",
  "explanation": "string",
  "tamilExplanation": "string",
  "reply": "string"
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
      generationConfig: { responseMimeType: 'application/json', temperature: 0.45 },
    },
    15000
  );

  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    return { ok: false, reason: 'network' };
  }

  try {
    const parsed = JSON.parse(rawText);
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

    const reply =
      typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : 'Great job! Tell me a bit more about that.';

    return { ok: true, transcript, reply, feedback };
  } catch (e) {
    console.warn('Gemini audio JSON parse error:', e);
    return { ok: false, reason: 'network' };
  }
}
