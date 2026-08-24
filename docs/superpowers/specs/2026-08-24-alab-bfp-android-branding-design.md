# ALAB BFP Android Branding Design

## Goal

Replace the default Flutter-installed app identity on Android with the name **ALAB BFP** and the user-supplied BFP emblem. The resulting home-screen icon must remain crisp on Android devices.

## Scope

- Update only the Flutter project's Android app label.
- Use `mainfile/alab-system/public/images/icon for bfp app.png` as the launcher-icon source.
- Create Android density-specific `ic_launcher.png` files from that square 1254 by 1254 source.
- Do not change iOS, web, desktop, application ID, or Flutter package name.

## Design

The Android manifest label changes from `flutter_application_1` to `ALAB BFP`. The supplied source artwork is preserved and downscaled with a high-quality image resampler into the standard Android launcher sizes: 48, 72, 96, 144, and 192 pixels for mdpi through xxxhdpi. Each density directory receives the matching output, replacing the current incorrectly sized 1233 by 1275 raster file. This keeps the complete white rounded-square background and BFP fire emblem visible while giving Android a sharp asset matched to the device density.

## Verification

- Confirm the manifest contains `android:label="ALAB BFP"`.
- Confirm every launcher density has a square PNG at its standard size.
- Run Flutter static analysis and a debug Android build when the local Android toolchain is available.
