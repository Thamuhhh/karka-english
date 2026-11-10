export interface DatamuseWord {
  word: string;
  score: number;
}

export async function fetchRelatedWords(word: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=6`);
    if (!res.ok) return [];
    const data: DatamuseWord[] = await res.json();
    return data.map(item => item.word);
  } catch (err) {
    console.warn('Datamuse API error:', err);
    return [];
  }
}

export async function fetchRhymingWords(word: string): Promise<string[]> {
  try {
    const res = await fetch(`https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(word)}&max=6`);
    if (!res.ok) return [];
    const data: DatamuseWord[] = await res.json();
    return data.map(item => item.word);
  } catch (err) {
    console.warn('Datamuse API error:', err);
    return [];
  }
}

