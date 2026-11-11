# Elvate landing page

This is a standalone, responsive download page for the Elvate Android app.

## Preview locally

From the project root, run:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/website/`. The page uses the supplied enhanced fox artwork and the project mascot assets. All Android download links point to the APK published by the `Build Elvate Android APK` GitHub Actions workflow.

## Deploy

Deploy the `website` folder together with the referenced project `assets` folder, preserving their relative paths. Keep the local Poppins fonts, their `OFL.txt` license, and the enhanced mascot images in `website/assets/mascot` in the site bundle. The Android download links target the stable `latest-apk` release asset, which the Android build workflow replaces after each successful build.
