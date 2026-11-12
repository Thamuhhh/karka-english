import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export interface DailyPracticeReminderSettings {
  enabled: boolean;
  time: string;
}

const SETTINGS_KEY = 'elvate-daily-practice-reminder-v1';
const SCHEDULED_ID_KEY = 'elvate-daily-practice-notification-id-v1';
const DEFAULT_SETTINGS: DailyPracticeReminderSettings = { enabled: false, time: '19:00' };
const CHANNEL_ID = 'daily-practice';

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Daily practice reminders',
    description: 'A gentle reminder to practice English and keep your streak going.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: '#8B5CF6',
    sound: 'default',
  });
}

export async function loadDailyPracticeReminderSettings(): Promise<DailyPracticeReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DailyPracticeReminderSettings>;
    const time = typeof parsed.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.time)
      ? parsed.time
      : DEFAULT_SETTINGS.time;
    return { enabled: parsed.enabled === true, time };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateDailyPracticeReminder(
  enabled: boolean,
  time: string
): Promise<boolean> {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a valid reminder time.');
  await configureAndroidChannel();

  const currentId = await AsyncStorage.getItem(SCHEDULED_ID_KEY);
  if (currentId) {
    await Notifications.cancelScheduledNotificationAsync(currentId).catch(() => {});
    await AsyncStorage.removeItem(SCHEDULED_ID_KEY);
  }

  if (!enabled) {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled: false, time }));
    return true;
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return false;

  const [hour, minute] = time.split(':').map(Number);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your English practice is waiting ✨',
      body: 'A few minutes today can keep your Elvate streak alive. Ready for one class?',
      sound: 'default',
      data: { screen: 'learn', kind: 'daily-practice-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
  await AsyncStorage.multiSet([
    [SETTINGS_KEY, JSON.stringify({ enabled: true, time })],
    [SCHEDULED_ID_KEY, identifier],
  ]);
  return true;
}

export async function sendPracticeReminderTest(): Promise<boolean> {
  await configureAndroidChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Elvate notifications are working 🎉',
      body: 'Your daily English practice reminder is ready.',
      sound: 'default',
      data: { screen: 'learn', kind: 'test-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
  return true;
}
