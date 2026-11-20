import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AuthUser } from '../types';
import { supabase } from '../lib/supabase';

const PUSH_TOKEN_KEY = 'elvate-expo-push-token-v1';
const LEGACY_SCHEDULED_ID_KEY = 'elvate-daily-practice-notification-id-v1';
const CHANNEL_ID = 'daily-practice';

export type PushRegistrationResult = 'registered' | 'permission-denied' | 'unsupported' | 'project-id-missing';

async function configureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Nila AI speaking reminders',
    description: 'Personal daily reminders to practise English with Nila AI.',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180, 100, 180],
    lightColor: '#8B5CF6',
    sound: 'default',
  });
}

async function cancelLegacyLocalReminder() {
  const oldId = await AsyncStorage.getItem(LEGACY_SCHEDULED_ID_KEY);
  if (!oldId) return;
  await Notifications.cancelScheduledNotificationAsync(oldId).catch(() => {});
  await AsyncStorage.removeItem(LEGACY_SCHEDULED_ID_KEY);
}

export async function registerUserPushDevice(
  authUser: AuthUser | null,
  requestPermission = true
): Promise<PushRegistrationResult> {
  if (Platform.OS === 'web' || !supabase) return 'unsupported';
  await cancelLegacyLocalReminder();
  await configureAndroidChannel();

  const projectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return 'project-id-missing';

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return 'permission-denied';

  try {
    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const { error } = await supabase.rpc('register_push_device', {
      p_expo_push_token: expoPushToken,
      p_platform: Platform.OS,
      p_timezone: timezone,
    });
    if (error) {
      console.warn('Could not register device token with cloud:', error.message);
    } else {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, expoPushToken);
    }
    return 'registered';
  } catch (err: any) {
    console.warn('Push token retrieval notice:', err?.message || err);
    return 'unsupported';
  }
}

export async function unregisterUserPushDevice(): Promise<void> {
  if (!supabase) return;
  const expoPushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!expoPushToken) return;
  const { error } = await supabase.rpc('unregister_push_device', {
    p_expo_push_token: expoPushToken,
  });
  if (error) {
    console.warn('Could not unlink push device from account:', error.message);
    return;
  }
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  await cancelLegacyLocalReminder();
}
