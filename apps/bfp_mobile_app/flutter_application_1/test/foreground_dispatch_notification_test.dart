import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('foreground dispatches configure a high-priority Android notification', () {
    final root = Directory.current.path;
    final pubspec = File('$root/pubspec.yaml').readAsStringSync();
    final main = File('$root/lib/main.dart').readAsStringSync();
    final service = File('$root/lib/services/dispatch_notification_service.dart').readAsStringSync();
    final appGradle = File('$root/android/app/build.gradle.kts').readAsStringSync();

    expect(pubspec, contains('flutter_local_notifications:'));
    expect(main, contains('DispatchNotificationService.initialize'));
    expect(main, contains('DispatchNotificationService.showForegroundMessage'));
    expect(service, contains("'incident_dispatches'"));
    expect(service, contains('Importance.max'));
    expect(appGradle, contains('isCoreLibraryDesugaringEnabled = true'));
    expect(appGradle, contains('coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:'));
  });
}
