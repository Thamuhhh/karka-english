const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const TTS_MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'];
const VOICE = 'Zephyr';
const AUDIO_KINDS = new Set(['tamil', 'why', 'right']);

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function pcmToWav(pcm: Uint8Array, sampleRate: number): Uint8Array {
  const wav = new Uint8Array(44 + pcm.length);
  const view = new DataView(wav.buffer);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) wav[offset + i] = value.charCodeAt(i);
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.length, true);
  wav.set(pcm, 44);
  return wav;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !geminiKey) {
    return respond({ error: 'Audio generation is not configured. Add GEMINI_API_KEY to Supabase Function secrets.' }, 503);
  }

  try {
    const authHeader = request.headers.get('Authorization') || '';
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    });
    if (!userResponse.ok) return respond({ error: 'Sign in again to continue.' }, 401);
    const user = await userResponse.json();
    if (user?.app_metadata?.role !== 'admin') return respond({ error: 'Admin access required.' }, 403);

    const body = await request.json();
    const courseId = String(body.courseId || '').trim();
    const lessonId = String(body.lessonId || '').trim();
    const clips = body.clips;
    if (!/^[a-zA-Z0-9_-]{3,100}$/.test(courseId) || !/^[a-zA-Z0-9_-]{3,120}$/.test(lessonId)) {
      return respond({ error: 'Invalid course or class ID.' }, 400);
    }
    if (!Array.isArray(clips) || clips.length < 1 || clips.length > 3
      || clips.some((clip) => !AUDIO_KINDS.has(clip?.kind) || typeof clip?.text !== 'string' || !clip.text.trim() || clip.text.length > 6000)) {
      return respond({ error: 'Provide one to three valid lecture clips.' }, 400);
    }

    const audioClips: Record<string, { url: string; text: string; contentType: string }> = {};
    for (let index = 0; index < clips.length; index += 1) {
      const clip = clips[index];
      const text = clip.text.trim();
      let generated: { bytes: Uint8Array; contentType: string } | null = null;
      const errors: string[] = [];

      for (const model of TTS_MODELS) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
            },
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          errors.push(`${model}: HTTP ${response.status} ${detail.slice(0, 100)}`);
          continue;
        }

        const result = await response.json();
        const parts = result?.candidates?.[0]?.content?.parts;
        const inline = Array.isArray(parts)
          ? parts.find((part) => typeof (part?.inlineData?.data || part?.inline_data?.data) === 'string')
          : null;
        const data = inline?.inlineData || inline?.inline_data;
        if (!data?.data) {
          errors.push(`${model}: empty audio response`);
          continue;
        }

        const mimeType = String(data.mimeType || data.mime_type || 'audio/L16;rate=24000');
        const raw = decodeBase64(data.data);
        if (/mpeg|mp3/i.test(mimeType)) {
          generated = { bytes: raw, contentType: 'audio/mpeg' };
        } else if (/wav/i.test(mimeType)) {
          generated = { bytes: raw, contentType: 'audio/wav' };
        } else {
          const sampleRate = Number(/rate=(\d+)/i.exec(mimeType)?.[1] || 24000);
          generated = { bytes: pcmToWav(raw, sampleRate), contentType: 'audio/wav' };
        }
        break;
      }

      if (!generated) return respond({ error: `Gemini could not generate the ${clip.kind} audio. ${errors.join(' | ').slice(0, 220)}` }, 502);

      const extension = generated.contentType === 'audio/mpeg' ? 'mp3' : 'wav';
      const textHash = await sha256(text);
      const objectPath = `${courseId}/${lessonId}/${clip.kind}-${textHash}.${extension}`;
      const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/course-audio/${objectPath}`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': generated.contentType,
          'Cache-Control': '31536000',
          'x-upsert': 'true',
        },
        body: generated.bytes,
      });
      if (!uploadResponse.ok) {
        const detail = await uploadResponse.text().catch(() => '');
        console.error('Audio storage upload failed', uploadResponse.status, detail.slice(0, 300));
        return respond({ error: 'Generated audio could not be saved. Apply the latest Supabase schema and retry.' }, 502);
      }

      const url = `${supabaseUrl}/storage/v1/object/public/course-audio/${objectPath}`;
      audioClips[clip.kind] = { url, text, contentType: generated.contentType };
      if (index < clips.length - 1) await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    return respond({ audioClips });
  } catch (error) {
    console.error('admin-generate-course-audio failed', error);
    return respond({ error: error instanceof Error ? error.message : 'Audio generation failed.' }, 500);
  }
});
