# haven

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Firebase

Android is configured for the Firebase app ID `com.heaven.heaven`. Its
`google-services.json` belongs in `android/app/`; `main.dart` initializes
Firebase using `lib/firebase_options.dart`. Firebase Analytics is included
alongside the existing Auth, Firestore, and Storage packages.

iOS is not configured yet. Add the iOS app to the same Firebase project using
the app's `com.haven.haven` bundle ID, then replace the placeholder iOS options
in `lib/firebase_options.dart` and add the generated
`GoogleService-Info.plist` to the Runner target.

### Android release signing

Release builds require a private upload keystore and an ignored
`android/key.properties` file containing `storeFile`, `storePassword`,
`keyAlias`, and `keyPassword`. Keep the keystore and passwords out of source
control; configure them as CI secrets when building releases.

For a keystore stored at `android/upload-keystore.jks`, create
`android/key.properties` with:

```properties
storeFile=upload-keystore.jks
storePassword=<store-password>
keyAlias=upload
keyPassword=<key-password>
```

Generate the upload keystore with:

```sh
keytool -genkey -v -keystore android/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Back up the keystore and passwords securely; losing the keystore can prevent
future app updates.
