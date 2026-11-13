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
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!supabaseUrl || !anonKey || !openRouterKey) return respond({ error: 'Course generation is not configured. Add OPENROUTER_API_KEY to Supabase Function secrets.' }, 503);

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: authHeader },
    });
    if (!userResponse.ok) return respond({ error: 'Sign in again to continue.' }, 401);
    const user = await userResponse.json();
    if (user?.app_metadata?.role !== 'admin') return respond({ error: 'Admin access required.' }, 403);

    const body = await request.json();
    const topic = String(body.topic || '').trim().slice(0, 180);
    const unitTitle = String(body.levelName || '').trim().replace(/^Unit\s+\d+\s*:\s*/i, '').slice(0, 100);
    const cefrTag = String(body.cefrTag || 'CEFR A1').trim().slice(0, 24);
    if (topic.length < 3 || unitTitle.length < 2) return respond({ error: 'Enter a course topic and unit title.' }, 400);

    const coursesResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_list_courses`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    if (!coursesResponse.ok) return respond({ error: 'Could not determine the next unit number. Apply the latest Supabase schema and retry.' }, 503);
    const savedCourses = await coursesResponse.json();
    const publishedCourseCount = Array.isArray(savedCourses)
      ? savedCourses.filter((saved: Record<string, any>) => saved.status === 'published' && !String(saved.id || '').startsWith('builtin-unit-')).length
      : 0;
    const nextUnitNumber = 5 + publishedCourseCount;
    const levelName = `Unit ${nextUnitNumber}: ${unitTitle}`;

    const prompt = `Create one complete Elvate English-learning unit for Tamil-speaking learners. Return only valid JSON matching the exact shape described. Course topic: ${topic}. Unit name: ${levelName}. CEFR: ${cefrTag}. Create 5 progressive classes. Each class must have id, levelNumber, classNumber, title, subtitle, duration, grammarTopic, xpReward (25-50), rule {heading, englishExplanation, tamilMentalModel, doAndDont {wrong,right,whyTamil}}, jumble {tamilSentence,scrambledWords,correctWords,hint}, translation {tamilPrompt,expectedEnglish,options (4 strings),correctOptionIndex (0-3),explanation,tamilExplanation}, speakingChallenge {prompt,missNovaQuestion,suggestedAnswers (3 strings),sampleNativeResponse,tamilCoaching}.

Keep each class concise enough to finish in about 5 minutes. The English rule/explanation must be at most 60 words and teach one main idea. Tamil teaching is important: write in simple, friendly spoken Tamil in Tamil script, like explaining to a friend. Code-switch familiar English grammar words naturally (do, did, tense, helper verb, countable, etc.) instead of using rare or formal Tamil equivalents. Avoid literary, classical, stiff textbook Tamil and long sentences. tamilMentalModel: 3-4 short sentences, about 35-55 Tamil words. doAndDont.whyTamil: at most 2 short sentences and 30 words. translation.tamilExplanation: at most 2 short sentences and 30 words. jumble.hint and speakingChallenge.tamilCoaching: one short, practical sentence each. Use Tamil script for Tamil; keep English examples and grammar terms in English. Explain why the pattern changes with one clear contrast, without restating the same rule in every field. Jumble scrambledWords must be a real permutation of correctWords; correctWords must form a natural English sentence. Translation correctOptionIndex must point to exactly one correct option. No markdown. JSON top level: {levelNumber:1, levelName:string, cefrTag:string, badge:string, accentColor:"#7F43FE", description:string, classes:[...]}. Use ids exactly course-generated stable IDs prefixed "ai-".`;

    const textSchema = { type: 'string' };
    const textArraySchema = { type: 'array', items: textSchema };
    const lessonSchema = {
      type: 'object', additionalProperties: false,
      required: ['id', 'levelNumber', 'classNumber', 'title', 'subtitle', 'duration', 'grammarTopic', 'xpReward', 'rule', 'jumble', 'translation', 'speakingChallenge'],
      properties: {
        id: textSchema, levelNumber: { type: 'integer' }, classNumber: { type: 'integer' },
        title: textSchema, subtitle: textSchema, duration: textSchema, grammarTopic: textSchema,
        xpReward: { type: 'integer' },
        rule: {
          type: 'object', additionalProperties: false,
          required: ['heading', 'englishExplanation', 'tamilMentalModel', 'doAndDont'],
          properties: {
            heading: textSchema, englishExplanation: textSchema, tamilMentalModel: textSchema,
            doAndDont: {
              type: 'object', additionalProperties: false, required: ['wrong', 'right', 'whyTamil'],
              properties: { wrong: textSchema, right: textSchema, whyTamil: textSchema },
            },
          },
        },
        jumble: {
          type: 'object', additionalProperties: false, required: ['tamilSentence', 'scrambledWords', 'correctWords', 'hint'],
          properties: { tamilSentence: textSchema, scrambledWords: textArraySchema, correctWords: textArraySchema, hint: textSchema },
        },
        translation: {
          type: 'object', additionalProperties: false,
          required: ['tamilPrompt', 'expectedEnglish', 'options', 'correctOptionIndex', 'explanation', 'tamilExplanation'],
          properties: {
            tamilPrompt: textSchema, expectedEnglish: textSchema,
            options: { type: 'array', items: textSchema, minItems: 4, maxItems: 4 },
            correctOptionIndex: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: textSchema, tamilExplanation: textSchema,
          },
        },
        speakingChallenge: {
          type: 'object', additionalProperties: false,
          required: ['prompt', 'missNovaQuestion', 'suggestedAnswers', 'sampleNativeResponse', 'tamilCoaching'],
          properties: {
            prompt: textSchema, missNovaQuestion: textSchema,
            suggestedAnswers: { type: 'array', items: textSchema, minItems: 3, maxItems: 3 },
            sampleNativeResponse: textSchema, tamilCoaching: textSchema,
          },
        },
      },
    };
    const courseSchema = {
      type: 'object', additionalProperties: false,
      required: ['levelNumber', 'levelName', 'cefrTag', 'badge', 'accentColor', 'description', 'classes'],
      properties: {
        levelNumber: { type: 'integer' }, levelName: textSchema, cefrTag: textSchema,
        badge: textSchema, accentColor: textSchema, description: textSchema,
        classes: { type: 'array', items: lessonSchema, minItems: 5, maxItems: 5 },
      },
    };

    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://thamuhhh.github.io/karka-english/',
        'X-OpenRouter-Title': 'Elvate Admin Course Studio',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3.5-super-vl:free',
        messages: [
          { role: 'system', content: 'You are an expert bilingual English curriculum writer. Return valid JSON only and ensure every field is pedagogically usable.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.65,
        max_tokens: 10000,
        reasoning: { enabled: false },
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'elvate_course', strict: true, schema: courseSchema },
        },
      }),
    });
    const aiData = await aiResponse.json();
    if (!aiResponse.ok) {
      const message = aiData.error?.message || 'OpenRouter could not generate this course.';
      if (aiResponse.status === 429) return respond({ error: 'OpenRouter free usage limit reached. Wait and try again later.' }, 429);
      return respond({ error: message }, 502);
    }
    const choice = aiData.choices?.[0];
    const content = choice?.message?.content;
    const output = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.map((part: { text?: string }) => part.text || '').join('')
        : '';
    if (!output.trim()) {
      const finishReason = String(choice?.finish_reason || 'unknown');
      const model = String(aiData.model || 'free model');
      console.error('OpenRouter returned no text', { model, finishReason });
      return respond({ error: `${model} returned no course text (finish: ${finishReason}). Try again.` }, 502);
    }
    const course = JSON.parse(output.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    const missingFields: string[] = [];
    const addMissingText = (value: unknown, field: string) => {
      if (typeof value !== 'string' || !value.trim()) missingFields.push(field);
    };
    if (!Array.isArray(course.classes) || course.classes.length !== 5) {
      missingFields.push('classes (expected exactly 5)');
    } else {
      course.classes.forEach((lesson: Record<string, any>, index: number) => {
        const prefix = `Class ${index + 1}`;
        for (const field of ['title', 'subtitle', 'duration', 'grammarTopic']) addMissingText(lesson[field], `${prefix} ${field}`);
        for (const field of ['heading', 'englishExplanation', 'tamilMentalModel']) addMissingText(lesson.rule?.[field], `${prefix} rule.${field}`);
        for (const field of ['wrong', 'right', 'whyTamil']) addMissingText(lesson.rule?.doAndDont?.[field], `${prefix} rule.doAndDont.${field}`);
        for (const field of ['tamilSentence', 'hint']) addMissingText(lesson.jumble?.[field], `${prefix} jumble.${field}`);
        if (!Array.isArray(lesson.jumble?.scrambledWords) || lesson.jumble.scrambledWords.length < 2) missingFields.push(`${prefix} jumble.scrambledWords`);
        if (!Array.isArray(lesson.jumble?.correctWords) || lesson.jumble.correctWords.length < 2) missingFields.push(`${prefix} jumble.correctWords`);
        for (const field of ['tamilPrompt', 'expectedEnglish', 'explanation', 'tamilExplanation']) addMissingText(lesson.translation?.[field], `${prefix} translation.${field}`);
        if (!Array.isArray(lesson.translation?.options) || lesson.translation.options.length !== 4) missingFields.push(`${prefix} translation.options`);
        if (!Number.isInteger(lesson.translation?.correctOptionIndex) || lesson.translation.correctOptionIndex < 0 || lesson.translation.correctOptionIndex > 3) missingFields.push(`${prefix} translation.correctOptionIndex`);
        for (const field of ['prompt', 'missNovaQuestion', 'sampleNativeResponse']) addMissingText(lesson.speakingChallenge?.[field], `${prefix} speakingChallenge.${field}`);
        if (!Array.isArray(lesson.speakingChallenge?.suggestedAnswers) || lesson.speakingChallenge.suggestedAnswers.length !== 3) missingFields.push(`${prefix} speakingChallenge.suggestedAnswers`);
      });
    }
    if (missingFields.length) {
      console.error('AI course missing required fields', missingFields);
      return respond({ error: `Course is missing required content: ${missingFields.slice(0, 5).join(', ')}. Please generate again.` }, 502);
    }

    const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'course';
    const courseId = `ai-${slug}-${crypto.randomUUID().slice(0, 8)}`;
    course.levelNumber = nextUnitNumber;
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
