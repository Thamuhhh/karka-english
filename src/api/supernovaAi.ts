import { GrammarCorrection, ChatMessage, RoleplayScenario } from '../types';

let userGeminiApiKey: string | null = null;

export function setGeminiApiKey(key: string | null) {
  userGeminiApiKey = key ? key.trim() : null;
}

export function getGeminiApiKey(): string | null {
  return userGeminiApiKey;
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

  // If Gemini API Key is configured, use live Gemini Flash
  if (userGeminiApiKey) {
    try {
      const prompt = `You are "Supernova English AI", a specialized English linguistics tutor for Indian learners (especially Tamil speakers).
Analyze the following sentence:
"${trimmed}"

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "hasErrors": boolean,
  "correctedSentence": "string",
  "explanation": "clear explanation in simple English of what was improved",
  "tamilExplanation": "explanation in conversational Tamil explaining the grammatical nuance clearly (e.g. why tenses or prepositions change)",
  "formalVersion": "professional office/email phrasing",
  "casualVersion": "natural friendly phrasing",
  "nativeIdiomaticVersion": "how a native American or British speaker would naturally express this",
  "fluencyScore": number between 40 and 100
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userGeminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return {
            originalSentence: trimmed,
            correctedSentence: parsed.correctedSentence || trimmed,
            hasErrors: parsed.hasErrors ?? false,
            explanation: parsed.explanation || 'Sentence analyzed successfully.',
            tamilExplanation: parsed.tamilExplanation || 'வாக்கியம் வெற்றிகரமாக பகுப்பாய்வு செய்யப்பட்டது.',
            formalVersion: parsed.formalVersion || trimmed,
            casualVersion: parsed.casualVersion || trimmed,
            nativeIdiomaticVersion: parsed.nativeIdiomaticVersion || trimmed,
            fluencyScore: parsed.fluencyScore || 85,
          };
        }
      }
    } catch (e) {
      console.warn('Gemini API call failed, falling back to Supernova Offline Engine:', e);
    }
  }

  // -----------------------------------------------------------
  // Supernova Built-in Offline Diagnostic Engine (Zero Setup!)
  // -----------------------------------------------------------
  return localGrammarDiagnosis(trimmed);
}

function localGrammarDiagnosis(sentence: string): GrammarCorrection {
  const lower = sentence.toLowerCase();
  let corrected = sentence;
  let hasErrors = false;
  const explanations: string[] = [];
  const tamilNotes: string[] = [];
  let score = 95;

  // Rule 1: "I didn't went" -> "I didn't go"
  if (/didn't\s+went|did\s+not\s+went/i.test(sentence)) {
    hasErrors = true;
    score -= 25;
    corrected = corrected.replace(/didn't\s+went/gi, "didn't go").replace(/did\s+not\s+went/gi, "did not go");
    explanations.push("After 'did' or 'didn't', always use base verb form ('go'), not past tense ('went').");
    tamilNotes.push("'Did' அல்லது 'didn't' வந்தவுடன் கடந்த கால சொல் (went) வரக்கூடாது, முதல் நிலை சொல் (go) தான் வர வேண்டும்.");
  }

  // Rule 2: "He don't know" -> "He doesn't know"
  if (/\b(he|she|it|everyone|someone)\s+don't\b/i.test(sentence)) {
    hasErrors = true;
    score -= 20;
    corrected = corrected.replace(/\b(he|she|it|everyone|someone)\s+don't\b/gi, '$1 doesn\'t');
    explanations.push("Third-person singular subjects (he, she, it) take 'doesn't', not 'don't'.");
    tamilNotes.push("He, She, It போன்ற படர்க்கை ஒருமைக்கு 'doesn't' பயன்படுத்த வேண்டும், 'don't' அல்ல.");
  }

  // Rule 3: "I am having doubt" -> "I have a question / doubt"
  if (/i\s+am\s+having\s+(a\s+)?doubt/i.test(sentence)) {
    hasErrors = true;
    score -= 15;
    corrected = corrected.replace(/i\s+am\s+having\s+(a\s+)?doubt/gi, 'I have a question');
    explanations.push("Native speakers say 'I have a question' rather than 'I am having a doubt'.");
    tamilNotes.push("ஆங்கிலத்தில் 'having a doubt' என்பதை விட 'I have a question' என்று சொல்வது தான் இயல்பானது.");
  }

  // Rule 4: "Yesterday I have seen" -> "Yesterday I saw"
  if (/yesterday.*have\s+(seen|done|gone|met)/i.test(sentence)) {
    hasErrors = true;
    score -= 20;
    corrected = corrected.replace(/have\s+seen/gi, 'saw').replace(/have\s+done/gi, 'did').replace(/have\s+gone/gi, 'went');
    explanations.push("With specific past time markers like 'yesterday', use Simple Past (saw), not Present Perfect.");
    tamilNotes.push("'Yesterday' போன்ற குறிப்பிட்ட கடந்தகால நேரத்தை குறிப்பிடும்போது Simple Past (saw) பயன்படுத்த வேண்டும்.");
  }

  // Rule 5: Capitalization & punctuation
  if (!/^[A-Z]/.test(corrected)) {
    corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
  }
  if (!/[.?!]$/.test(corrected)) {
    corrected += '.';
  }

  const formal = `I would like to state that ${corrected.toLowerCase()}`;
  const casual = `Basically, ${corrected.toLowerCase().replace(/\.$/, '')}, you know?`;
  const native = `${corrected}`;

  return {
    originalSentence: sentence,
    correctedSentence: hasErrors ? corrected : sentence,
    hasErrors,
    explanation: explanations.length > 0 ? explanations.join(' ') : 'Good sentence structure! Fluent and clear.',
    tamilExplanation: tamilNotes.length > 0 ? tamilNotes.join(' ') : 'வாக்கிய அமைப்பு சரியாக உள்ளது! இயல்பாக பேசப்பட்டுள்ளது.',
    formalVersion: formal,
    casualVersion: casual,
    nativeIdiomaticVersion: native,
    fluencyScore: Math.max(score, 50),
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
  // First evaluate user sentence grammar
  const feedback = await analyzeSentenceGrammar(userMessage);

  // If Gemini API is available, generate smart contextual conversation
  if (userGeminiApiKey) {
    try {
      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: `Roleplay Setup:
Role: ${scenario.persona}
Scenario: ${scenario.description}
System Prompt: ${scenario.systemPrompt}
Keep replies conversational, encouraging, short (1-3 sentences), and naturally prompt the user to reply.`,
            },
          ],
        },
        ...history.slice(-6).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        {
          role: 'user',
          parts: [{ text: userMessage }],
        },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${userGeminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          return { reply: reply.trim(), feedback };
        }
      }
    } catch (e) {
      console.warn('Gemini chat error, using offline response:', e);
    }
  }

  // Supernova Local Interactive Reply Engine
  const reply = generateLocalScenarioReply(userMessage, scenario);
  return { reply, feedback };
}

function generateLocalScenarioReply(userMsg: string, scenario: RoleplayScenario): string {
  const lower = userMsg.toLowerCase();

  if (scenario.id === 'interview-tech') {
    if (lower.includes('project') || lower.includes('built') || lower.includes('developed')) {
      return "That sounds impressive! What was the biggest technical challenge you faced while building it, and how did you resolve it?";
    }
    if (lower.includes('challenge') || lower.includes('problem') || lower.includes('bug')) {
      return "Good problem-solving approach. How do you handle code reviews and tight project deadlines?";
    }
    return "Great point. Could you walk me through your experience with frontend and backend architectures?";
  }

  if (scenario.id === 'cafe-order') {
    if (lower.includes('coffee') || lower.includes('latte') || lower.includes('cappuccino') || lower.includes('tea')) {
      return "Brilliant choice! What size would you prefer—regular or large? And would you like whole milk, oat milk, or almond milk?";
    }
    if (lower.includes('large') || lower.includes('regular') || lower.includes('oat') || lower.includes('milk')) {
      return "Sorted! Would you fancy any warm pastries with that today, like a butter croissant or chocolate muffin?";
    }
    return "That'll be £4.50. Will you be paying by card or contactless?";
  }

  if (scenario.id === 'airport-travel') {
    if (lower.includes('vacation') || lower.includes('tourism') || lower.includes('work') || lower.includes('conference')) {
      return "Understood. How long do you plan to stay in the country, and where will you be staying?";
    }
    if (lower.includes('hotel') || lower.includes('days') || lower.includes('weeks')) {
      return "Thank you. Do you have a return ticket booked? Everything looks in order—welcome and enjoy your stay!";
    }
    return "Please step forward and look directly into the camera for the digital biometric scan.";
  }

  return `I hear you! That's really interesting. What else would you like to share about that?`;
}

