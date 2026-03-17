# CaseScriptAI - Android Setup Guide

This guide covers the complete setup process for running the app with native modules (FFmpeg and encryption) on Android.

## Prerequisites

- Node.js 18+ and Yarn
- Android Studio with SDK Platform 34+ installed
- JDK 17 (compatible with Android Gradle Plugin)
- Android Emulator or physical device

## Initial Setup (First Time Only)

### 1. Install Dependencies

```bash
# From repository root
cd apps/CaseScriptAI
yarn install
```

This automatically runs the FFmpeg setup script (`postinstall` hook) which:
- Copies FFmpeg binaries to `android/libs/` and `ios/libs/`
- Generates required iOS podspecs
- Patches Android Gradle files

### 2. Verify FFmpeg Binaries

Ensure these files exist from the initial clone:
- `/ffmpeg-kit-full-gpl.aar` (Android)
- `/ffmpeg-kit-ios-full-gpl-latest.zip` (iOS)

If missing, they should be in the repository root as per `.gitattributes`.

### 3. Generate Native Android Project

```bash
# From apps/CaseScriptAI/
yarn prebuild
```

**What this does:**
- Creates `android/` folder with full native project
- Applies FFmpeg patches via `manage-ffmpeg.js`
- Generates native code for all Expo modules
- **Only needed once** or when adding new native modules

### 4. Build and Run

```bash
# From apps/CaseScriptAI/
yarn android
```

This will:
- Verify FFmpeg setup
- Build debug APK with all native modules compiled
- Install on connected emulator/device
- Start Metro bundler

## Troubleshooting

### "FFmpeg native module not initialized" Error

**Cause:** Running on Expo Go or missing prebuild

**Fix:** Run `yarn prebuild` then `yarn android`

### Build Fails with minSdkVersion Error

**Cause:** API level mismatch (should be fixed in current branch)

**Fix:** Ensure `app.json` has:
```json
{
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "minSdkVersion": 26
        }
      }
    ]
  ]
}
```

### FFmpeg Binaries Missing

**Cause:** Binaries not found in repository root

**Fix:**
```bash
# Check if files exist
ls -lh /ffmpeg-kit-full-gpl.aar
ls -lh /ffmpeg-kit-ios-full-gpl-latest.zip

# If missing, they need to be downloaded from the source
# and placed in repository root
```

### Android Emulator Issues

**adb: device offline**

```bash
# Check connected devices
~/Library/Android/sdk/platform-tools/adb devices

# Start emulator manually
~/Library/Android/sdk/emulator/emulator -list-avds
~/Library/Android/sdk/emulator/emulator -avd Pixel_7_Pro_API_34
```

## Development Workflow

### Normal Development (After Initial Setup)

```bash
# Just build and run - no prebuild needed
yarn android

# For iOS (if on Mac)
yarn ios
```

### When to Run Prebuild Again

Only run `yarn prebuild` when:
- Adding new native modules
- The `android/` or `ios/` folders were deleted
- After running `expo clean`
- When native code changes aren't being applied

### Clean Build (If Having Issues)

```bash
cd apps/CaseScriptAI

# Clean everything
rm -rf android/ ios/ node_modules/
yarn install
yarn prebuild --clean
yarn android
```

## Key Files

- **FFmpeg setup**: [`scripts/manage-ffmpeg.js`](scripts/manage-ffmpeg.js)
- **Audio processing**: [`src/services/audio/audio-processor.ts`](src/services/audio/audio-processor.ts)
- **Build config**: [`app.json`](app.json)

## Summary Checklist

- [ ] Clone repository
- [ ] `cd apps/CaseScriptAI && yarn install`
- [ ] Verify FFmpeg binaries exist in root
- [ ] `yarn prebuild` (first time only)
- [ ] Start Android emulator
- [ ] `yarn android`
- [ ] Test audio import functionality

The app should now work with FFmpeg and encryption native modules properly compiled.