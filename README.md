# moviebox-firebase-backend

Starter structure for a Firebase-backed MovieBox admin panel with Cloud Functions scaffold.

## Structure

- Firebase root config files
- `admin-panel/` static frontend pages
- `functions/` backend services scaffold for future secure upgrades

## Admin login flow

The admin panel now supports:

- Email + password login
- Google sign-in (for Gmail accounts)

After authentication, access is granted only when **any one** of these checks passes:

1. Firebase custom claim `admin: true`
2. Firestore document exists at `admins/{uid}`
3. Any document in `admins` collection has `email` matching the signed-in user email

### To allow another Gmail/admin account

1. Open Firestore.
2. Create collection: `admins` (if missing).
3. Add one of the following:
   - Document ID = user's UID (data can be empty), or
   - Any document with field: `email: "another-admin@gmail.com"`
4. Ensure Google provider is enabled in Firebase Authentication.

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
