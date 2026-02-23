# moviebox-firebase-backend

Starter structure for a Firebase-backed MovieBox admin panel with Cloud Functions scaffold.

## Structure

- Firebase root config files
- `admin-panel/` static frontend pages
- `functions/` backend services scaffold for future secure upgrades

## Next steps

1. Replace Firebase project ID in `.firebaserc`.
2. Add real Firebase SDK config in `admin-panel/js/firebase-config.js`.
3. Install functions dependencies:
   ```bash
   cd functions && npm install
   ```
4. Update security rules and service logic based on your product requirements.

## Android client dependency

If you are calling Firebase Cloud Functions from an Android app, add the Functions KTX SDK to your app module dependencies:

```gradle
implementation 'com.google.firebase:firebase-functions-ktx'
```

For Kotlin DSL (`build.gradle.kts`), use:

```kotlin
implementation("com.google.firebase:firebase-functions-ktx")
```
