import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
export const supabasePublishableKey = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl.startsWith('https://') &&
    supabasePublishableKey.length > 10 &&
    !supabasePublishableKey.includes('your_key_here')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;

let appStateListenerRegistered = false;
if (
  Platform.OS !== 'web' &&
  supabase &&
  !appStateListenerRegistered &&
  typeof AppState?.addEventListener === 'function'
) {
  appStateListenerRegistered = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function getAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${window.location.pathname}`;
  }
  return 'https://thamuhhh.github.io/karka-english/';
}
