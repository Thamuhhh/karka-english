# Elvate landing page

This is a standalone, responsive download page for the Elvate Android app.

## Preview locally

From the project root, run:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/website/`. The page uses the supplied enhanced fox artwork and the project mascot assets. All Android download links point to the APK published by the `Build Elvate Android APK` GitHub Actions workflow.

## Deploy

Pushing to `master` or `main` runs `.github/workflows/deploy-web.yml` and publishes this folder to GitHub Pages. The site keeps its local Poppins fonts, logo, and mascot artwork in `website/assets`. Android download links target the stable `latest-apk` release asset, which the Android build workflow replaces after each successful build.

For this repository, the Pages URL is `https://thamuhhh.github.io/karka-english/` once the deployment workflow succeeds.

## Admin panel

The admin dashboard is at `/admin.html`. It includes learner analytics and an AI course studio. The Pages workflow writes the Supabase URL and publishable key into `admin-config.js` from the GitHub Actions secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is safe to expose in a browser; never put a service-role key in this file.

Apply the latest `supabase/schema.sql` in the Supabase SQL Editor. It creates the admin RPC functions and course table. Then deploy the course generator and add the Google AI Studio key as a Supabase Function secret:

```sh
supabase secrets set GEMINI_API_KEY=your-google-ai-studio-key
supabase functions deploy admin-generate-course
```

Keep the Gemini key in Supabase secrets; it is never sent to the browser or app. Then grant admin access only to your trusted account by running this with your own account email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where lower(email) = lower('you@example.com');
```

Sign out and back in at `/admin.html` so Supabase issues a token with the admin role. The database and Edge Function verify that role for admin requests; knowing the page URL does not grant access. Generate a unit, review the five class summaries, save as draft or publish. Published courses appear in the app curriculum; each custom course opens class by class in sequence. Existing learners fetch published content on app startup.
