# Calis

Calis is an Android-first, offline calisthenics coach. It combines a bundled beginner training plan, local nutrition tracking, progress history, and optional on-device camera form feedback in one standalone app.

There is no account, backend, cloud AI service, analytics SDK, or required network connection. The release APK embeds the JavaScript bundle and the MediaPipe models, so it runs without Expo Go, Metro, or a server.

## What is included

- **Offline training plan** — a bundled seven-day beginner program with exercises, sets, rest guidance, and progression rules.
- **Workout tracking** — start a session, record sets locally, use the rest timer, and finish with optional notes.
- **Nutrition** — bundled food catalog, meal logging, custom foods, calorie targets, and macro tracking.
- **Progress** — local workout history, completed sets, training time, exercise progression, and body check-ins.
- **Camera form check** — front-camera self-view, front/side guidance modes, independent front/rear lens selection, and pose landmarks drawn on-device.
- **Optional audio cues** — local Android text-to-speech cues can be enabled or muted globally in Settings and directly from the camera screen.
- **Local backup** — export and import a user-selected backup file without uploading data to a service.

## Privacy and offline behavior

Calis is designed to work without a network:

- Profile, workouts, food logs, custom foods, measurements, and settings live in local SQLite.
- The training plan and food catalog are bundled with the app.
- Camera frames are processed in memory by the native Android frame processor. Calis does not record or upload video frames or pose landmarks.
- Android cloud backup is disabled in `app.json` (`android.allowBackup: false`).
- Backup export is an explicit user action through the Android share sheet; import is an explicit file selection.
- Audio cues use the device's local TTS service. Turning audio off does not disable visual guidance.

The release manifest can still contain standard permissions added by Expo/React Native dependencies. The application source itself contains no runtime `fetch`, cloud SDK, or remote API dependency; `npm run verify:offline` checks this policy.

## Requirements

Recommended local setup:

- Node.js compatible with Expo SDK 57 (Node.js 20+ recommended)
- npm
- JDK 21
- Android Studio with an Android SDK and a connected device or emulator
- A physical Android device for the complete camera/pose experience

The verified release target is an `arm64-v8a` Samsung device. Use the architecture(s) required by your emulator if you are not building for that device.

## Quick start

Install the locked dependencies and generate the native project:

```bash
npm ci
npx expo prebuild
```

Set JDK 21 before launching Android tooling:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH="$JAVA_HOME/bin:$PATH"
```

Run a development build on an Android device or emulator:

```bash
npx expo run:android
```

`npx expo start` starts Metro for JavaScript/UI development. Metro is a development tool only; it is not required by the release APK. The native camera frame processor is not available in Expo Go, so use a development build or the release APK for camera testing.

## Validation

Run the project checks before building:

```bash
npm run typecheck
npm run lint
npm run verify:offline
npx expo-doctor
```

`verify:offline` confirms that the bundled plan, foods, SQLite code, backup service, pose model, and Expo config exist, then scans source and dependencies for accidental cloud/network integrations.

## Build a standalone release APK

The release build embeds JavaScript and does not need Metro at runtime:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH="$JAVA_HOME/bin:$PATH"
export NODE_ENV=production

npx expo prebuild
cd android
./gradlew :app:assembleRelease \
  --no-daemon \
  --no-parallel \
  --max-workers=2 \
  -PreactNativeArchitectures=arm64-v8a \
  --console=plain
cd ..

cp android/app/build/outputs/apk/release/app-release.apk Calis-offline.apk
sha256sum Calis-offline.apk
```

Install the verified artifact on a connected device:

```bash
adb install -r Calis-offline.apk
adb shell monkey -p com.calis.app 1
```

The local convenience alias is:

```text
Calis-offline.apk
```

The Gradle output remains at:

```text
android/app/build/outputs/apk/release/app-release.apk
```

The exact SHA-256 changes whenever the APK is rebuilt. Generate the value for the artifact you distribute rather than copying a hash from an earlier build.

For a clean native regeneration, use `npx expo prebuild --clean` and rerun the release build. The local Expo config plugin reapplies the MediaPipe configuration and VisionCamera frame backpressure correction during prebuild.

## Camera and audio controls

The camera screen keeps guidance mode and physical lens selection independent:

- **Front view / Side view** changes how Calis interprets and presents the movement.
- **Front camera / Rear camera** changes the physical lens.
- **Volume button** mutes or unmutes spoken form cues and persists the preference.
- **Start camera** requests camera permission and begins the on-device preview.

For useful pose feedback, keep the full body inside the preview and use even lighting. If pose detection is unavailable, the app keeps the camera/manual-result path usable rather than pretending that a rep was measured.

## Project structure

```text
src/app/                  Expo Router screens and tab navigation
src/components/           Shared UI primitives and accessibility behavior
src/constants/            Theme and layout tokens
src/data/                 Bundled program and food data
src/db/                   SQLite schema, migrations, and repositories
src/services/             Nutrition, progression, and backup logic
src/ai/pose/              Camera frame contracts, mapping, and geometry
src/ai/exercises/         Exercise-specific movement analyzers
plugins/withCalisPose.js  Expo config plugin for native pose setup
scripts/verify-offline.mjs Offline policy and asset verification
assets/                    Bundled pose model and app icon
```

The `android/` and `ios/` directories are generated by Expo prebuild and are intentionally ignored by default. The source-of-truth native customization is `plugins/withCalisPose.js` plus the Expo configuration.

## Release checklist

1. Run `npm run typecheck`, `npm run lint`, and `npm run verify:offline`.
2. Build with `NODE_ENV=production` and the target ABI.
3. Install the release APK on a clean device.
4. Test onboarding, Home, Train, Fuel, Progress, Settings, backup export/import, and camera fallback.
5. Test the camera with the full body visible, then switch Front/Side view and Front/Rear camera independently.
6. Toggle **Audio cues** in Settings and verify the camera mute control.
7. Test with Wi-Fi/mobile data disabled and Metro stopped.
8. Record the final APK hash before distribution.

## Safety

Calis provides general fitness guidance, not medical advice or a substitute for a qualified coach. Users should progress gradually, use stable equipment, and stop if an exercise causes pain.
