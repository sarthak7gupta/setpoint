# SetPoint for Wear OS

A source companion for tapping points on a paired watch. A native SetPoint phone development build is required; this is not a standalone scoring app or a store download.

Open this directory in Android Studio. The project targets Android SDK 35, requires Java 17, and supports Wear OS devices on API 30 or later. Let Android Studio resolve the configured Gradle and Kotlin versions.

Keep the application ID `com.setpoint.app` and sign the phone and watch apps with the same key so their wearable connection can pair. Supply your own release signing configuration; no signing keys are included.

Install both development builds on paired phone/watch devices and open the phone scorer before using wrist scoring. The phone owns the match and saves its records.

[SetPoint native app](../README.md) · [Product homepage](../../README.md)
