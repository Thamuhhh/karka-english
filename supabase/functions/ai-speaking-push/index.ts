import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const cronSecret = Deno.env.get('PUSH_CRON_SECRET') || '';
const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || '';
const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN') || '';
const REMINDER_HOUR = 20;
const PUSH_WINDOW_MINUTES = 5;
const AI_BATCH_SIZE = 25;
const EXPO_BATCH_SIZE = 100;

type PushDevice = {
  id: string;
  user_id: string;
  expo_push_token: string;
  timezone: string;
  last_reminder_local_date: string | null;
};

type Progress = {
  user_id: string;
  streak_days: number;
  today_xp: number;
  today_date: string;
  daily_goal_xp: number;
};

type AiCopy = { title: string; body: string };

const admin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!admin) return json({ error: 'Push worker is not configured' }, 500);

  const { data: devices, error: devicesError } = await admin
    .from('push_devices')
    .select('id,user_id,expo_push_token,timezone,last_reminder_local_date');
  if (devicesError) return json({ error: devicesError.message }, 500);
  if (!devices?.length) return json({ sent: 0, skipped: 0 });

  const now = new Date();
  const localDates = new Map<string, string>();
  const due = (devices as PushDevice[]).filter((device) => {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: device.timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(now);
      const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
      const localDate = `${value('year')}-${value('month')}-${value('day')}`;
      if (Number(value('hour')) !== REMINDER_HOUR || Number(value('minute')) >= PUSH_WINDOW_MINUTES) return false;
      if (device.last_reminder_local_date === localDate) return false;
      localDates.set(device.id, localDate);
      return true;
    } catch {
      return false;
    }
  });
  if (!due.length) return json({ sent: 0, skipped: devices.length });

  const userIds = [...new Set(due.map((device) => device.user_id))];
  const [progressResult, profileResult] = await Promise.all([
    admin.from('user_progress').select('user_id,streak_days,today_xp,today_date,daily_goal_xp').in('user_id', userIds),
    admin.from('profiles').select('id,display_name').in('id', userIds),
  ]);
  if (progressResult.error || profileResult.error) {
    return json({ error: progressResult.error?.message || profileResult.error?.message }, 500);
  }
  const progressRows = progressResult.data;
  const profileRows = profileResult.data;
  const progressByUser = new Map<string, Progress>(
    (progressRows || []).map((row: Progress) => [row.user_id, row] as const),
  );
  const nameByUser = new Map<string, string>(
    (profileRows || []).map((row: { id: string; display_name: string }) => [row.id, row.display_name] as const),
  );

  const claimed: Array<PushDevice & { localDate: string; progress: Progress; displayName: string }> = [];
  for (const device of due) {
    const localDate = localDates.get(device.id);
    if (!localDate) continue;
    const { data: didClaim, error: claimError } = await admin.rpc('claim_push_reminder', {
      p_device_id: device.id,
      p_local_date: localDate,
    });
    if (claimError || didClaim !== true) continue;
    const progress = progressByUser.get(device.user_id) as Progress | undefined;
    if (!progress) continue;
    const todayXp = progress.today_date === localDate ? progress.today_xp : 0;
    const normalizedProgress = { ...progress, today_xp: todayXp };
    if (todayXp >= progress.daily_goal_xp) continue;
    claimed.push({
      ...device,
      localDate,
      progress: normalizedProgress,
      displayName: String(nameByUser.get(device.user_id) || 'Learner').split(/\s+/)[0].slice(0, 24),
    });
  }
  if (!claimed.length) return json({ sent: 0, skipped: due.length });

  const messages: Array<{ to: string; title: string; body: string; sound: 'default'; priority: 'high'; channelId: string; data: Record<string, string> }> = [];
  for (let index = 0; index < claimed.length; index += AI_BATCH_SIZE) {
    const batch = claimed.slice(index, index + AI_BATCH_SIZE);
    const copies = await generateAiCopies(batch);
    batch.forEach((device, batchIndex) => {
      const copy = copies[batchIndex] || fallbackCopy(device.displayName, device.progress);
      messages.push({
        to: device.expo_push_token,
        title: copy.title,
        body: copy.body,
        sound: 'default',
        priority: 'high',
        channelId: 'daily-practice',
        data: { screen: 'call', kind: 'ai-speaking-reminder' },
      });
    });
  }

  let sent = 0;
  for (let index = 0; index < messages.length; index += EXPO_BATCH_SIZE) {
    const batchMessages = messages.slice(index, index + EXPO_BATCH_SIZE);
    const batchDevices = claimed.slice(index, index + EXPO_BATCH_SIZE);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
        },
        body: JSON.stringify(batchMessages),
      });
      if (!response.ok) throw new Error(`Expo Push API returned ${response.status}`);
      const result = await response.json();
      const tickets = Array.isArray(result.data) ? result.data : [];
      for (let ticketIndex = 0; ticketIndex < batchDevices.length; ticketIndex += 1) {
        const ticket = tickets[ticketIndex];
        const device = batchDevices[ticketIndex];
        if (ticket?.status === 'ok') {
          sent += 1;
        } else if (ticket?.details?.error === 'DeviceNotRegistered') {
          await admin.from('push_devices').delete().eq('id', device.id);
        } else {
          await releaseClaim(device.id);
        }
      }
    } catch (error) {
      console.error('Expo push batch failed:', error);
      await Promise.all(batchDevices.map((device) => releaseClaim(device.id)));
    }
  }

  return json({ sent, skipped: devices.length - sent });
});

async function generateAiCopies(
  devices: Array<PushDevice & { progress: Progress; displayName: string }>,
): Promise<AiCopy[]> {
  if (!geminiApiKey) return devices.map((device) => fallbackCopy(device.displayName, device.progress));
  const learnerProgress = devices.map((device, index) => ({
    id: index,
    first_name: device.displayName,
    streak_days: device.progress.streak_days,
    xp_earned_today: device.progress.today_xp,
    daily_xp_goal: device.progress.daily_goal_xp,
    xp_left: Math.max(0, device.progress.daily_goal_xp - device.progress.today_xp),
  }));
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `Write one natural, encouraging English push notification per Tamil-speaking Elvate learner. Invite the learner to practise a short Nila AI speaking conversation. Use their streak and remaining XP to make the message personally relevant. Never shame or invent facts. Keep every title under 42 characters and every body under 115 characters. Return only JSON: {"notifications":[{"id":0,"title":"...","body":"..."}]}. Learners: ${JSON.stringify(learnerProgress)}` }],
        }],
        generationConfig: { maxOutputTokens: Math.min(4096, 300 + devices.length * 90), responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => part.text)?.text || '';
    const parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim());
    const byId = new Map<number, AiCopy>((parsed.notifications || []).map((copy: { id: number; title: string; body: string }) => [
      Number(copy.id),
      { title: String(copy.title || '').trim().slice(0, 42), body: String(copy.body || '').trim().slice(0, 115) },
    ] as const));
    return devices.map((device, index) => byId.get(index) || fallbackCopy(device.displayName, device.progress));
  } catch (error) {
    console.warn('AI reminder copy unavailable; using personalized fallback:', error);
    return devices.map((device) => fallbackCopy(device.displayName, device.progress));
  }
}

function fallbackCopy(name: string, progress: Progress): AiCopy {
  const xpLeft = Math.max(0, progress.daily_goal_xp - progress.today_xp);
  const title = progress.streak_days > 0 ? `Keep your ${progress.streak_days}-day streak going` : 'Nila AI is ready to practise';
  const body = xpLeft > 0
    ? `${name}, ${xpLeft} XP to your goal. Try a quick speaking round with Nila AI.`
    : `${name}, start a quick English speaking round with Nila AI today.`;
  return { title: title.slice(0, 42), body: body.slice(0, 115) };
}

async function releaseClaim(deviceId: string) {
  await admin?.from('push_devices').update({ last_reminder_local_date: null }).eq('id', deviceId);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
