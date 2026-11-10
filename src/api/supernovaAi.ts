import { GrammarCorrection, ChatMessage, RoleplayScenario } from '../types';

let userGeminiApiKey: string | null = null;

export function setGeminiApiKey(key: string | null) {
  userGeminiApiKey = key ? key.trim() : null;
}

export function getGeminiApiKey(): string | null {
  return userGeminiApiKey;
}

export function isGeminiConfigured(): boolean {
  return !!userGeminiApiKey && userGeminiApiKey.length > 10;
}

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash'];

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

  if (userGeminiApiKey) {
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

    const json = await callGeminiWithTimeout(userGeminiApiKey, {
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

  if (userGeminiApiKey) {
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

    const json = await callGeminiWithTimeout(userGeminiApiKey, {
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
