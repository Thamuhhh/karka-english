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
