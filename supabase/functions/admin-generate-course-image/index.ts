const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const IMAGE_MODELS = ['gemini-3.1-flash-lite-image', 'gemini-2.5-flash-image'];

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !geminiKey) {
    return respond({ error: 'Image generation is not configured. Add GEMINI_API_KEY to Supabase Function secrets.' }, 503);
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
    const title = String(body.title || '').trim();
    const subtitle = String(body.subtitle || '').trim();
    const grammarTopic = String(body.grammarTopic || '').trim();
    const learnerOutcome = String(body.learnerOutcome || '').trim();
    if (!/^[a-zA-Z0-9_-]{3,100}$/.test(courseId) || !/^[a-zA-Z0-9_-]{3,120}$/.test(lessonId)) {
      return respond({ error: 'Invalid course or class ID.' }, 400);
    }
    if (!title || title.length > 120 || subtitle.length > 240 || grammarTopic.length > 240 || learnerOutcome.length > 300) {
      return respond({ error: 'Provide a valid class title and short learning details.' }, 400);
    }

    const prompt = [
      'Create one polished, friendly editorial illustration for an English-learning app lesson.',
      'Scene: ' + title + '.',
      'Lesson context: ' + [subtitle, grammarTopic, learnerOutcome].filter(Boolean).join('. ') + '.',
      'Show one clear everyday situation that visually explains the lesson. Use a cohesive Elvate brand palette of deep violet, lavender, warm orange, and soft cream. Include a small friendly orange fox learner mascot wearing a simple violet hoodie as a supporting character; keep the scene focused on the learning situation.',
      'Premium, welcoming 3D illustration, soft studio lighting, clean composition, expressive characters, rich but uncluttered background, high visual clarity at phone size.',
      'Landscape 16:9 composition. No words, letters, labels, captions, UI, watermarks, or logos.',
    ].join('\n');

    let image: { bytes: Uint8Array; contentType: string } | null = null;
    const errors: string[] = [];
    for (const model of IMAGE_MODELS) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '16:9', imageSize: '1K' },
          },
        }),
        signal: AbortSignal.timeout(90000),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        errors.push(`${model}: HTTP ${response.status} ${detail.slice(0, 120)}`);
        continue;
      }
      const result = await response.json();
      const parts = result?.candidates?.[0]?.content?.parts;
      const inline = Array.isArray(parts)
        ? parts.find((part) => typeof (part?.inlineData?.data || part?.inline_data?.data) === 'string')
        : null;
      const data = inline?.inlineData || inline?.inline_data;
      if (!data?.data) {
        errors.push(`${model}: empty image response`);
        continue;
      }
      image = {
        bytes: decodeBase64(data.data),
        contentType: String(data.mimeType || data.mime_type || 'image/png'),
      };
      break;
    }

    if (!image) return respond({ error: `Gemini could not generate this class image. ${errors.join(' | ').slice(0, 260)}` }, 502);
    if (!/^image\/(png|jpeg|webp)$/i.test(image.contentType)) {
      return respond({ error: 'Gemini returned an unsupported image format.' }, 502);
    }

    const extension = image.contentType.toLowerCase().includes('jpeg') ? 'jpg'
      : image.contentType.toLowerCase().includes('webp') ? 'webp' : 'png';
    const objectPath = `${courseId}/${lessonId}-${Date.now()}.${extension}`;
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/course-images/${objectPath}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': image.contentType,
        'Cache-Control': '31536000',
        'x-upsert': 'false',
      },
      body: image.bytes,
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text().catch(() => '');
      console.error('Course image upload failed', uploadResponse.status, detail.slice(0, 300));
      return respond({ error: 'Generated image could not be saved. Apply the latest Supabase schema and retry.' }, 502);
    }

    return respond({
      imageUrl: `${supabaseUrl}/storage/v1/object/public/course-images/${objectPath}`,
      contentType: image.contentType,
    });
  } catch (error) {
    console.error('admin-generate-course-image failed', error);
    return respond({ error: error instanceof Error ? error.message : 'Image generation failed.' }, 500);
  }
});
