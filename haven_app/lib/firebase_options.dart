// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError('Haven is not configured for iOS.');
      default:
        throw UnsupportedError('Haven is configured for Android only.');
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyBDauSBDCKcdxaCNL9RpzlnIQ7Ph_-VH-8',
    appId: '1:438806851788:android:4040849244643e164c9269',
    messagingSenderId: '438806851788',
    projectId: 'haeven-b8e62',
    storageBucket: 'haeven-b8e62.firebasestorage.app',
  );
}
