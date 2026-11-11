import { Linking, Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { AuthUser } from '../types';
import {
  getAuthRedirectUrl,
  isSupabaseConfigured,
  supabase,
  supabasePublishableKey,
  supabaseUrl,
} from '../lib/supabase';

export interface AuthActionResult {
  user?: AuthUser;
  error?: string;
  needsEmailVerification?: boolean;
  isLocalFallback?: boolean;
}

export function extractNameFromEmail(identifier: string): string {
  const cleaned = identifier.trim();
  if (!cleaned) return 'Karka Learner';
  const base = cleaned.includes('@') ? cleaned.split('@')[0] : cleaned;
  const formatted = base
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return formatted || 'Karka Learner';
}

export function mapSupabaseUserToAuthUser(user: User): AuthUser {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const rawFullName =
    typeof meta?.full_name === 'string' && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta?.name === 'string' && meta.name.trim()
        ? meta.name.trim()
        : '';

  const providerName = user.is_anonymous
    ? 'guest'
    : user.app_metadata?.provider === 'google'
      ? 'google'
      : 'email';

  const resolvedName =
    rawFullName ||
    (user.is_anonymous
      ? 'Guest Learner'
      : user.email
        ? extractNameFromEmail(user.email)
        : 'Karka Learner');

  return {
    id: user.id,
    name: resolvedName,
    email: user.email || '',
    provider: providerName,
    createdAt: user.created_at || new Date().toISOString(),
    isCloudSession: true,
    isAnonymous: Boolean(user.is_anonymous),
  };
}

function isNetworkOrOfflineError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; message?: string; status?: number };
  if (e.name === 'AuthRetryableFetchError') return true;
  if (e.status === 0) return true;
  const msg = (e.message || '').toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('offline')
  );
}

export async function getVerifiedAuthUser(
  localFallbackUser: AuthUser | null
): Promise<AuthUser | null> {
  if (!supabase || !isSupabaseConfigured) {
    return localFallbackUser;
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      if (isNetworkOrOfflineError(sessionError) && localFallbackUser) {
        return localFallbackUser;
      }
      return null;
    }

    const session = sessionData?.session;
    if (!session) {
      // Allow local-only guest fallback if user signed in while anonymous cloud auth was disabled
      if (localFallbackUser && localFallbackUser.provider === 'guest' && !localFallbackUser.isCloudSession) {
        return localFallbackUser;
      }
      return null;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userData?.user) {
      return mapSupabaseUserToAuthUser(userData.user);
    }

    if (userError && isNetworkOrOfflineError(userError) && session.user) {
      return mapSupabaseUserToAuthUser(session.user);
    }

    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    return null;
  } catch (err) {
    if (isNetworkOrOfflineError(err) && localFallbackUser) {
      return localFallbackUser;
    }
    return null;
  }
}

export async function signInWithEmail(
  identifier: string,
  password: string
): Promise<AuthActionResult> {
  if (!supabase) {
    return { error: 'Supabase is not configured. Add your Supabase URL and publishable key.' };
  }

  const email = identifier.trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) {
    return { error: 'Please enter the email address you registered with.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('email not confirmed')) {
      return {
        error: 'Please verify your email address from your inbox before signing in.',
        needsEmailVerification: true,
      };
    }
    if (lower.includes('invalid login credentials')) {
      return { error: 'Incorrect email or password. Please try again.' };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Could not retrieve user session. Please try again.' };
  }

  return { user: mapSupabaseUserToAuthUser(data.user) };
}

export async function signUpWithEmail(
  name: string,
  emailInput: string,
  password: string
): Promise<AuthActionResult> {
  if (!supabase) {
    return { error: 'Supabase is not configured. Add your Supabase URL and publishable key.' };
  }

  const email = emailInput.trim().toLowerCase();
  const cleanName = name.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: cleanName,
      },
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes('already registered') || lower.includes('user already exists')) {
      return { error: 'An account with this email already exists. Please sign in instead.' };
    }
    return { error: error.message };
  }

  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: 'An account with this email already exists. Please sign in instead.' };
  }

  if (data.session && data.user) {
    return {
      user: mapSupabaseUserToAuthUser(data.user),
      needsEmailVerification: false,
    };
  }

  if (data.user) {
    return {
      needsEmailVerification: true,
    };
  }

  return { error: 'Signup did not return a user record. Please try again.' };
}

export async function resendVerificationEmail(emailInput: string): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }
  const email = emailInput.trim().toLowerCase();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });
  return error ? { error: error.message } : {};
}

export async function signInAsGuest(preferredName?: string): Promise<AuthActionResult> {
  const fallbackName = preferredName?.trim() || 'Guest Learner';
  const localGuest: AuthUser = {
    name: fallbackName,
    email: '',
    provider: 'guest',
    createdAt: new Date().toISOString(),
    isCloudSession: false,
    isAnonymous: true,
  };

  if (!supabase) {
    return { user: localGuest, isLocalFallback: true };
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: {
        full_name: fallbackName,
      },
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const code = (error as { code?: string }).code || '';
    if (
      code === 'anonymous_provider_disabled' ||
      (lower.includes('anonymous') && lower.includes('disabled'))
    ) {
      return { user: localGuest, isLocalFallback: true };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { user: localGuest, isLocalFallback: true };
  }

  return {
    user: mapSupabaseUserToAuthUser(data.user),
    isLocalFallback: false,
  };
}

async function isGoogleProviderEnabled(): Promise<boolean> {
  if (!supabaseUrl || !supabasePublishableKey) return false;
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
    });
    if (!res.ok) return true;
    const json = (await res.json()) as { external?: { google?: boolean } };
    return Boolean(json?.external?.google);
  } catch {
    return true;
  }
}

export async function signInWithGoogleOAuth(): Promise<AuthActionResult> {
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const enabled = await isGoogleProviderEnabled();
  if (!enabled) {
    return {
      error:
        'Google Sign-In is not enabled in Supabase Dashboard yet (Authentication -> Providers -> Google). Use Email or Guest for now.',
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getAuthRedirectUrl(),
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (Platform.OS !== 'web' && data?.url) {
    await Linking.openURL(data.url);
  }

  return {};
}

export async function sendPasswordReset(emailInput: string): Promise<{ error?: string }> {
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }
  const email = emailInput.trim().toLowerCase();
  if (!/\S+@\S+\.\S+/.test(email)) {
    return { error: 'Enter your registered email address above, then tap Forgot Password.' };
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  });
  return error ? { error: error.message } : {};
}

export async function signOutSupabase(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.warn('Supabase signOut warning:', e);
  }
}

export function subscribeToSupabaseAuth(
  onSessionChange: (event: string, user: AuthUser | null, session: Session | null) => void
): () => void {
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    const mapped = session?.user ? mapSupabaseUserToAuthUser(session.user) : null;
    onSessionChange(event, mapped, session);
  });
  return () => {
    subscription.unsubscribe();
  };
}
