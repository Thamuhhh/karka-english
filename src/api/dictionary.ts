import { WordDefinition } from '../types';

export const STARTER_VOCABULARY: WordDefinition[] = [
  {
    word: 'Resilient',
    phonetic: '/rɪˈzɪl.jənt/',
    partOfSpeech: 'adjective',
    definition: 'Able to withstand or recover quickly from difficult conditions.',
    example: 'She proved to be remarkably resilient after facing major career setbacks.',
    synonyms: ['adaptable', 'tough', 'tenacious', 'strong'],
    tamilMeaning: 'துன்பங்களை எதிர்கொண்டு மீண்டு வரும் திறன் கொண்ட',
    cefrLevel: 'B2',
  },
  {
    word: 'Articulate',
    phonetic: '/ɑːˈtɪk.jə.lət/',
    partOfSpeech: 'adjective / verb',
    definition: 'Having or showing the ability to speak fluently and coherently.',
    example: 'He gave an articulate explanation of why the software system needed an overhaul.',
    synonyms: ['eloquent', 'fluent', 'clear', 'expressive'],
    tamilMeaning: 'எண்ணங்களை தெளிவாகவும் நேர்த்தியாகவும் பேசக்கூடிய',
    cefrLevel: 'C1',
  },
  {
    word: 'Pragmatic',
    phonetic: '/præɡˈmæt.ɪk/',
    partOfSpeech: 'adjective',
    definition: 'Dealing with things sensibly and realistically in a practical way.',
    example: 'We need to take a pragmatic approach rather than arguing over idealism.',
    synonyms: ['practical', 'sensible', 'rational', 'down-to-earth'],
    tamilMeaning: 'செயல்முறைக்கு சாத்தியமான, நடைமுறை எதார்த்தமான',
    cefrLevel: 'C1',
  },
  {
    word: 'Persuade',
    phonetic: '/pəˈsweɪd/',
    partOfSpeech: 'verb',
    definition: 'Cause someone to do something through reasoning or argument.',
    example: 'The team persuaded the manager to test the new feature with a beta group.',
    synonyms: ['convince', 'influence', 'motivate', 'sway'],
    tamilMeaning: 'ஒருவரை நம்ப வைத்து அல்லது சம்மதிக்க வைத்து ஒரு செயலை செய்ய வைப்பது',
    cefrLevel: 'B1',
  },
  {
    word: 'Meticulous',
    phonetic: '/məˈtɪk.jə.ləs/',
    partOfSpeech: 'adjective',
    definition: 'Showing great attention to detail; very careful and precise.',
    example: 'Her meticulous code reviews caught subtle memory leak bugs.',
    synonyms: ['thorough', 'diligent', 'scrupulous', 'painstaking'],
    tamilMeaning: 'மிகவும் நுணுக்கமான மற்றும் கவனமான',
    cefrLevel: 'B2',
  },
  {
    word: 'Ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    partOfSpeech: 'adjective',
    definition: 'Present, appearing, or found everywhere.',
    example: 'Smartphones have become ubiquitous in modern everyday life.',
    synonyms: ['omnipresent', 'everywhere', 'pervasive', 'universal'],
    tamilMeaning: 'எங்கும் பரவியுள்ள, எல்லா இடங்களிலும் காணப்படுகிற',
    cefrLevel: 'C2',
  },
];

function normalizeAudioUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
}

export async function fetchWordDetails(word: string): Promise<WordDefinition | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord) return null;

  const cached = STARTER_VOCABULARY.find((w) => w.word.toLowerCase() === cleanWord);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 8000) : null;

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
      controller ? { signal: controller.signal } : undefined
    );
    if (!response.ok) {
      return cached || null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return cached || null;
    }

    const entry = data[0];
    const meaning = entry.meanings?.[0];
    const def = meaning?.definitions?.[0];

    let audioUrl: string | undefined;
    let phoneticText: string = entry.phonetic || '';

    if (Array.isArray(entry.phonetics)) {
      for (const p of entry.phonetics) {
        if (!phoneticText && p.text) phoneticText = p.text;
        if (p.audio && p.audio.endsWith('.mp3')) {
          audioUrl = normalizeAudioUrl(p.audio);
          break;
        }
      }
    }

    const collectedSynonyms: string[] = [];
    if (Array.isArray(entry.meanings)) {
      for (const m of entry.meanings) {
        if (Array.isArray(m.synonyms)) {
          collectedSynonyms.push(...m.synonyms);
        }
        if (Array.isArray(m.definitions?.[0]?.synonyms)) {
          collectedSynonyms.push(...m.definitions[0].synonyms);
        }
      }
    }

    const uniqueSynonyms = Array.from(new Set(collectedSynonyms)).slice(0, 5);
    const displayWord =
      entry.word.charAt(0).toUpperCase() + entry.word.slice(1).toLowerCase();

    return {
      word: displayWord,
      phonetic: phoneticText,
      audioUrl: audioUrl || cached?.audioUrl,
      partOfSpeech: meaning?.partOfSpeech || cached?.partOfSpeech || 'noun',
      definition: def?.definition || cached?.definition || 'Definition available offline.',
      example: def?.example || cached?.example || `We used "${displayWord}" clearly in today's meeting.`,
      synonyms: uniqueSynonyms.length > 0 ? uniqueSynonyms : cached?.synonyms || [],
      tamilMeaning:
        cached?.tamilMeaning ||
        `ஆங்கில சொல் (${meaning?.partOfSpeech || 'word'}): "${displayWord}" - மேலே உள்ள ஆங்கில விளக்கத்தைப் பார்க்கவும்.`,
      cefrLevel: cached?.cefrLevel || 'B2',
      memorized: cached?.memorized,
    };
  } catch (error) {
    console.warn('Free Dictionary API fetch failed, returning cached version:', error);
    return cached || null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
