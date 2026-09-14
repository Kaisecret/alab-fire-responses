import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Android Firebase configuration initializes FCM and requests notification permission', () {
    final root = Directory.current.path;
    final pubspec = File('$root/pubspec.yaml').readAsStringSync();
    final main = File('$root/lib/main.dart').readAsStringSync();
    final manifest = File('$root/android/app/src/main/AndroidManifest.xml').readAsStringSync();
    final appGradle = File('$root/android/app/build.gradle.kts').readAsStringSync();
    final settingsGradle = File('$root/android/settings.gradle.kts').readAsStringSync();

    expect(File('$root/android/app/google-services.json').existsSync(), isTrue);
    expect(pubspec, contains('firebase_core:'));
    expect(pubspec, contains('firebase_messaging:'));
    expect(main, contains('Firebase.initializeApp'));
    expect(main, contains('FirebaseMessaging.onBackgroundMessage'));
    expect(manifest, contains('android.permission.POST_NOTIFICATIONS'));
    expect(manifest, contains('com.example.flutter_application_1.MainActivity'));
    expect(appGradle, contains('com.google.gms.google-services'));
    expect(settingsGradle, contains('com.google.gms.google-services'));
  });
}
