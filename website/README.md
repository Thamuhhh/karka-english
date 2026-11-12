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

The read-only learner dashboard is at `/admin.html`. The Pages workflow writes the Supabase URL and publishable key into `admin-config.js` from the GitHub Actions secrets `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The publishable key is safe to expose in a browser; never put a service-role key in this file.

Apply the admin RPC functions from `supabase/schema.sql` in the Supabase SQL Editor. Then grant admin access only to your trusted account by running this with your own account email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin')
where lower(email) = lower('you@example.com');
```

Sign out and back in at `/admin.html` so Supabase issues a token with the admin role. The database verifies that role for every dashboard request; knowing the page URL does not grant access. Admin setup is complete once the workflow secrets are present and the schema update has been applied.
