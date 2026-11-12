const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  const authHeader = request.headers.get('Authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!supabaseUrl || !anonKey || !geminiKey) return respond({ error: 'Course generation is not configured.' }, 503);

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    });
    if (!userResponse.ok) return respond({ error: 'Sign in again to continue.' }, 401);
    const user = await userResponse.json();
    if (user?.app_metadata?.role !== 'admin') return respond({ error: 'Admin access required.' }, 403);

    const body = await request.json();
    const topic = String(body.topic || '').trim().slice(0, 180);
    const levelName = String(body.levelName || '').trim().slice(0, 100);
    const cefrTag = String(body.cefrTag || 'CEFR A1').trim().slice(0, 24);
    if (topic.length < 3 || levelName.length < 2) return respond({ error: 'Enter a course topic and unit name.' }, 400);

    const prompt = `Create one complete Elvate English-learning unit for Tamil-speaking learners. Return only valid JSON matching the exact shape described. Course topic: ${topic}. Unit name: ${levelName}. CEFR: ${cefrTag}. Create 5 progressive classes. Each class must have id, levelNumber, classNumber, title, subtitle, duration, grammarTopic, xpReward (25-50), rule {heading, englishExplanation, tamilMentalModel, doAndDont {wrong,right,whyTamil}}, jumble {tamilSentence,scrambledWords,correctWords,hint}, translation {tamilPrompt,expectedEnglish,options (4 strings),correctOptionIndex (0-3),explanation,tamilExplanation}, speakingChallenge {prompt,missNovaQuestion,suggestedAnswers (3 strings),sampleNativeResponse}. Keep Tamil naturally written in Tamil script. Jumble scrambledWords must be a real permutation of correctWords; correctWords must form a natural English sentence. Translation correctOptionIndex must point to a correct option. No markdown. JSON top level: {levelNumber:1, levelName:string, cefrTag:string, badge:string, accentColor:"#7F43FE", description:string, classes:[...]}. Use ids exactly course-generated stable IDs prefixed "ai-".`;

    const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: 'You are an expert bilingual English curriculum writer. Return valid JSON only and ensure every field is pedagogically usable.' }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.65 },
      }),
    });
    const aiData = await aiResponse.json();
    if (!aiResponse.ok) return respond({ error: aiData.error?.message || 'AI could not generate this course.' }, 502);
    const output = aiData.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || '';
    const course = JSON.parse(output.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    const completeCourse = Array.isArray(course.classes) && course.classes.length === 5 && course.classes.every((lesson: Record<string, any>) =>
      lesson.title && lesson.grammarTopic && lesson.rule?.heading && lesson.rule?.doAndDont?.right &&
      Array.isArray(lesson.jumble?.scrambledWords) && lesson.jumble.scrambledWords.length > 1 &&
      Array.isArray(lesson.jumble?.correctWords) && lesson.translation?.expectedEnglish &&
      Array.isArray(lesson.translation?.options) && lesson.translation.options.length >= 2 &&
      lesson.speakingChallenge?.prompt && Array.isArray(lesson.speakingChallenge?.suggestedAnswers)
    );
    if (!completeCourse) return respond({ error: 'AI returned an incomplete course. Please generate again.' }, 502);

    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'course';
    const courseId = `ai-${slug}-${crypto.randomUUID().slice(0, 8)}`;
    course.levelNumber = 100 + Math.floor(Math.random() * 900000);
    course.levelName = levelName;
    course.cefrTag = cefrTag;
    course.accentColor = '#7F43FE';
    course.classes = course.classes.map((lesson: Record<string, unknown>, index: number) => ({
      ...lesson,
      id: `${courseId}-${index + 1}`,
      levelNumber: course.levelNumber,
      classNumber: index + 1,
    }));
    course.id = courseId;
    return respond({ course });
  } catch (error) {
    console.error('admin-generate-course failed', error);
    return respond({ error: error instanceof Error ? error.message : 'Course generation failed.' }, 500);
  }
});
