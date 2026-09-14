import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

int pngDimension(Uint8List bytes, int start) =>
    (bytes[start] << 24) |
    (bytes[start + 1] << 16) |
    (bytes[start + 2] << 8) |
    bytes[start + 3];

void main() {
  test('Android package uses the ALAB BFP label and density-correct launcher icons', () {
    final manifest = File('android/app/src/main/AndroidManifest.xml').readAsStringSync();
    expect(manifest, contains('android:label="ALAB BFP"'));

    const sizes = <String, int>{
      'mipmap-mdpi': 48,
      'mipmap-hdpi': 72,
      'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144,
      'mipmap-xxxhdpi': 192,
    };

    for (final entry in sizes.entries) {
      final bytes = File('android/app/src/main/res/${entry.key}/ic_launcher.png').readAsBytesSync();
      expect(bytes.sublist(1, 4), equals(<int>[80, 78, 71]));
      expect(pngDimension(bytes, 16), entry.value);
      expect(pngDimension(bytes, 20), entry.value);
    }
  });

  test('native startup background hands directly to the Flutter BFP splash without a logo flash', () {
    for (final path in <String>[
      'android/app/src/main/res/drawable/launch_background.xml',
      'android/app/src/main/res/drawable-v21/launch_background.xml',
    ]) {
      final background = File(path).readAsStringSync();
      expect(background, isNot(contains('@mipmap/launch_image')));
      expect(background, isNot(contains('@drawable/bfp_splash_logo')));
      expect(background, contains('@color/alab_startup_background'));
    }

    final splash = File('lib/screens/splash_screen.dart').readAsStringSync();
    expect(splash, contains("'assets/images/bfp_app_logo.png'"));
  });

  test('Android 8 and newer uses an adaptive launcher icon', () {
    final adaptiveIcon = File('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml')
        .readAsStringSync();
    expect(adaptiveIcon, contains('<adaptive-icon'));
    expect(adaptiveIcon, contains('@drawable/ic_launcher_foreground_inset'));

    final insetForeground = File(
      'android/app/src/main/res/drawable/ic_launcher_foreground_inset.xml',
    ).readAsStringSync();
    expect(insetForeground, contains('@mipmap/ic_launcher_foreground'));
    expect(insetForeground, contains('android:inset="12dp"'));
  });

  test('Android 12 and newer does not show a separate native logo splash', () {
    final styles = File('android/app/src/main/res/values-v31/styles.xml').readAsStringSync();
    expect(styles, contains('android:windowSplashScreenAnimatedIcon'));
    expect(styles, contains('@drawable/transparent_splash_icon'));
  });
}
