# Build Android APK via EAS CLI

## Status
Configuration verified and ready for local build.

> EAS build cannot be executed from within Replit because the platform blocks
> the destructive git operations required by EAS CLI to create the project archive.
> The build must be performed from a local machine.

## EAS Project Info

| Field        | Value                                  |
|--------------|----------------------------------------|
| Owner        | pendi55                                |
| Project ID   | af11294c-dbb9-470b-b105-89d298481d2b  |
| Package      | com.xpogo.streaming                    |
| Version      | 1.1.0 (versionCode: 2)                |
| Build Profile| preview                                |
| Build Type   | APK (assembleRelease)                  |

## Steps to Build Locally

```bash
# 1. Install EAS CLI (requires Node.js)
npm install -g eas-cli

# 2. Login to Expo account
eas login
# Account: pendi55

# 3. Clone project from Replit and navigate to repo root
#    then install dependencies from root (required for workspace references)
pnpm install

# 4. Navigate to mobile app directory
cd artifacts/xpogo-mobile

# 5. Run EAS build for Android APK
#    (EAS cloud build handles its own dependency install — local pnpm install
#     above is only needed if you want to verify the project builds locally first)
eas build --platform android --profile preview --non-interactive
```

After the build completes, a download URL will be available at:
https://expo.dev/accounts/pendi55/projects/xpogo-mobile/builds

## Build Profile Configuration (eas.json)

```json
"preview": {
  "android": {
    "buildType": "apk",
    "gradleCommand": ":app:assembleRelease"
  },
  "env": {
    "EXPO_PUBLIC_DOMAIN": "b30fc0f2-ea8a-424a-88ee-fa02e53bd00a-00-1n14z61p3qun8.pike.replit.dev"
  }
}
```

## Installing the APK

1. Download the APK from the expo.dev build URL
2. Transfer to Android device (USB or download directly on device)
3. Enable "Install from unknown sources" in Android settings
4. Open the APK file to install

## Notes

- EAS CLI version required: >= 12.0.0
- The `preview` profile builds an APK (not AAB), suitable for direct installation
- The `production` profile builds an AAB for Play Store submission
