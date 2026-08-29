# ALAB BFP Android Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the installed Android Flutter app display as ALAB BFP with a sharp launcher icon generated from the supplied BFP artwork.

**Architecture:** Android reads its installed label from `AndroidManifest.xml` and launcher artwork from five `mipmap-*` folders. A Flutter test will assert the label and parse PNG headers to protect every required icon size.

**Tech Stack:** Flutter, Dart, Android resources, PowerShell System.Drawing.

## Global Constraints

- Android only: no change to iOS, web, desktop, application ID, or Flutter package name.
- Use `mainfile/alab-system/public/images/icon for bfp app.png` as the sole source.
- Exact installed label: `ALAB BFP`.
- Exact icon sizes: mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi 192 pixels.

---

### Task 1: Guard Android branding with a regression test

**Files:**
- Create: `apps/bfp_mobile_app/flutter_application_1/test/android_branding_test.dart`

**Interfaces:**
- Consumes: Android manifest and launcher PNGs.
- Produces: a Flutter regression test for the exact label and launcher dimensions.

- [ ] **Step 1: Write the failing test**

```dart
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

int pngDimension(Uint8List bytes, int start) =>
    (bytes[start] << 24) | (bytes[start + 1] << 16) | (bytes[start + 2] << 8) | bytes[start + 3];

void main() {
  test('Android package uses the ALAB BFP label and density-correct launcher icons', () {
    final manifest = File('android/app/src/main/AndroidManifest.xml').readAsStringSync();
    expect(manifest, contains('android:label="ALAB BFP"'));
    const sizes = <String, int>{
      'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96,
      'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192,
    };
    for (final entry in sizes.entries) {
      final bytes = File('android/app/src/main/res/${entry.key}/ic_launcher.png').readAsBytesSync();
      expect(bytes.sublist(1, 4), equals(<int>[80, 78, 71]));
      expect(pngDimension(bytes, 16), entry.value);
      expect(pngDimension(bytes, 20), entry.value);
    }
  });
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `flutter test test/android_branding_test.dart`

Expected: FAIL because the manifest has the default label and the rasters are incorrectly sized.

### Task 2: Install the label and crisp density-specific icons

**Files:**
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/AndroidManifest.xml`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/res/mipmap-mdpi/ic_launcher.png`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/res/mipmap-hdpi/ic_launcher.png`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png`
- Modify: `apps/bfp_mobile_app/flutter_application_1/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png`

**Interfaces:**
- Consumes: the supplied 1254×1254 BFP PNG.
- Produces: Android's label and density-correct `ic_launcher.png` resources.

- [ ] **Step 1: Replace the manifest label**

```xml
android:label="ALAB BFP"
```

- [ ] **Step 2: Resample the supplied source once per Android density**

Run from the workspace root:

```powershell
$source = 'C:\Users\janna\OneDrive\Documents\Bestcapstone for us\mainfile\alab-system\public\images\icon for bfp app.png'
$res = 'C:\Users\janna\OneDrive\Documents\Bestcapstone for us\apps\bfp_mobile_app\flutter_application_1\android\app\src\main\res'
Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile($source)
@{ 'mipmap-mdpi' = 48; 'mipmap-hdpi' = 72; 'mipmap-xhdpi' = 96; 'mipmap-xxhdpi' = 144; 'mipmap-xxxhdpi' = 192 }.GetEnumerator() | ForEach-Object {
  $bitmap = New-Object System.Drawing.Bitmap($_.Value, $_.Value)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($image, 0, 0, $_.Value, $_.Value)
  $graphics.Dispose()
  $bitmap.Save((Join-Path $res "$($_.Key)\ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
$image.Dispose()
```

- [ ] **Step 3: Run regression test, static analysis, and Android build**

Run: `flutter test test/android_branding_test.dart`, `flutter analyze`, then `flutter build apk --debug`.

Expected: all commands exit successfully and the debug APK appears in `build/app/outputs/flutter-apk/`.

- [ ] **Step 4: Commit the implementation**

Stage the manifest, five launcher files, and the regression test. Create commit message: `feat: brand Android app as ALAB BFP`.
