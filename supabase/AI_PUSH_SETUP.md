# Account-specific AI speaking reminders

The app registers an Expo push token against the signed-in Supabase user. The scheduled Edge Function checks each device's local time, skips learners who already met their daily XP goal, asks Gemini for short progress-aware copy, and sends the push through Expo. The reminder opens Speak.

## One-time setup

1. Create or link an Expo EAS project with `npx eas-cli@latest init`. Put its UUID in `.env` as `EXPO_PUBLIC_EAS_PROJECT_ID=<uuid>` and add the same variable to the EAS build environment. This project ID is public metadata, not a secret.
2. Install/configure Android FCM and iOS APNs credentials in EAS, then build and install a development or production app. Remote push tokens require a native build and a physical device.
3. Generate one random value for `PUSH_CRON_SECRET`, set it on Supabase, and copy the printed value for the SQL file:

   ```powershell
   $pushCronSecret = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
   npx supabase secrets set "PUSH_CRON_SECRET=$pushCronSecret" --project-ref cvfnqiyxwhicizekomag
   $pushCronSecret
   ```

   `GEMINI_API_KEY` should already be set for the course-generation function. The push function uses that same project-level secret; if it is missing, it sends progress-aware fallback copy.
4. Deploy the worker:

   ```powershell
   npx supabase functions deploy ai-speaking-push --project-ref cvfnqiyxwhicizekomag
   ```

5. In Supabase SQL Editor, run `push-notifications.sql`. Then in `schedule-ai-speaking-push.sql`, replace both occurrences of `REPLACE_WITH_THE_SAME_VALUE_AS_PUSH_CRON_SECRET` with the exact secret from step 3, and replace `REPLACE_WITH_SUPABASE_PUBLISHABLE_KEY` with the app's Supabase publishable key. Run that file. It stores the invocation values in Vault and enables a one-minute Cron job through `pg_cron` and `pg_net`.

The phone's OS still controls notification permission. If a learner denies it, the app links them to system settings; the app cannot override that choice.
