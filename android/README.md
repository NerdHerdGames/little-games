# Android packaging

Little Games runs in an Android WebView using the same framework-free game code
as the website. The APK and AAB contain the complete production JavaScript,
including lazy-loaded Three.js chunks, CSS, icons, images, game data, and asset
credits. First launch works offline; there is no hosted URL, runtime CDN, download,
or service-worker installation step. The app requests no Internet permission.

The application ID is `com.nerdherdgames.littlegames`. Android 8.0 (API 26) or newer
and an up-to-date Android System WebView are required. The responsive layout works
in either orientation and handles system bars and display cutouts. WebGL is
optional; games retain their existing picture-view fallbacks.

## Build locally

Install Node.js 20.19+ (24 recommended), JDK 17+, and the Android SDK with platform
36 and Build Tools 35.0.0. Set `ANDROID_HOME` to the SDK directory, or create an
untracked `android/local.properties` containing `sdk.dir=/absolute/path/to/sdk`.
Android Studio can install these SDK packages and open this `android` directory.

From the repository root:

```sh
npm ci
npm run android:apk
```

The installable, development-signed APK is
`android/app/build/outputs/apk/debug/app-debug.apk`.

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
npm run android:bundle
```

The unsigned release bundle is
`android/app/build/outputs/bundle/release/app-release.aab`.
On Windows, use `android\gradlew.bat -p android assembleDebug` or
`android\gradlew.bat -p android bundleRelease` from the root instead of the npm
Android package commands.

Every Gradle build runs `npm run build:android:web` before merging assets, including
builds started from Android Studio. Install npm dependencies first. This dedicated
Vite mode forces `/assets/` as its base, ignores any website `VITE_BASE_PATH`, writes
to `dist-android`, and disables PWA generation/registration. The regular web build
and public-subpath PWA hosting remain available.

## Verify packages

```sh
npm run validate
npm run build:android:web
cd android
./gradlew lintDebug assembleDebug bundleRelease
cd ..
npm run verify:android -- android/app/build/outputs/apk/debug/app-debug.apk
npm run verify:android -- android/app/build/outputs/bundle/release/app-release.aab
```

The verifier checks every public asset byte for byte and, when passed an APK or
AAB, verifies every generated file inside the archive, including all code chunks.
Archive verification requires `unzip` on the path. The Android workflow runs these
checks and publishes both packages as the `little-games-android` Actions artifact
on pushes to `feat/android`/`main`, pull requests to `main`, and manual runs.

Before a release, install the APK on a tablet, enable airplane mode **before first
launch**, and open every game, especially both 3D explorers, alphabet tracing, and
piano. Check touch/drag/pinch, rotation, background/resume, saved settings/progress,
and relaunch. Text-to-speech remains optional and depends on installed device
voices and WebView support; the package does not download voices. All instructions
and facts remain readable without speech.

## Release signing

Increase `versionCode` and `versionName` in `app/build.gradle` for each release.
Use Android Studio's **Build → Generate Signed App Bundle or APK** to sign with
the application's release key. Keep keystores and passwords outside version
control. The CI debug APK is suitable for testing; the unsigned release AAB must
be signed before Play Console upload. This workflow does not publish to an app
store or embed a signing key.

`MainActivity.java`, `app/build.gradle`, and the Android workflow are the main
files to review when changing packaging or native host behavior.
