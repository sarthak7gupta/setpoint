# SetPoint for iOS and Android

The native SetPoint scorer adds device haptics and native integrations to the same singles/doubles scoring and match statistics available in the [web app](https://setpoint-tennis.vercel.app/app). Match records stay on the device; Settings → Export / Import transfers backups explicitly.

There are currently no verified store or binary-release downloads. Build from source with Node.js, npm and the platform tools: Xcode on macOS for iOS, or Android Studio and its SDK for Android.

From the repository root:

```sh
npm ci
npm --prefix native ci
npm --prefix native run ios
# or
npm --prefix native run android
```

Keep Metro running while using a development build. To start Metro independently:

```sh
npm --prefix native run start
```

Expo Go can preview much of the interface. Tap-to-talk recognition, LAN scoreboard hosting and wrist companions require native development builds. Spoken announcements use the platform speech capability; speech recognition availability and network requirements depend on the platform.

The Apple Watch target is in `targets/watch/`. The [Wear OS source](wear/README.md) is a separate Android Studio project. Both require paired devices and compatible signing; no prebuilt watch packages are supplied.

Typecheck with `npm --prefix native run typecheck` from the repository root.

[Product homepage and usage](../README.md)
