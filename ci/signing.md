# Unsigned IPA and free Apple ID signing

The device artifact is deliberately unsigned. It contains no provisioning
profile, team ID, application-identifier, or keychain group belonging to a
particular account. It must be signed before installation on a normal iPhone.

`requested-entitlements.plist` is the desired entitlement set, not a signature
and not proof that a Personal Team can obtain it. It requests Background GPU
Access. A signing tool must retain only entitlements authorized by its actual
provisioning profile and generate its own team/app/keychain identifiers.
Do not blindly force a key into a signature if the profile does not authorize it.

The IPA also includes `PreviewRequestedEntitlements.plist` and
`PreviewRuntimeCatalog.json` as reference resources in the app bundle. Merely
including these files does not grant the requested permissions.

Camera, microphone, photos, contacts, motion, speech, calendars, reminders,
Bluetooth, local network, and location usage descriptions are in Info.plist.
Background audio, location, fetch, processing, and Bluetooth modes are declared
there too. Declarations do not request access on launch, install a corresponding
plugin, or guarantee permission/background execution.

The launcher compiles the module catalog in `packager/catalog.json`. No iCloud, App Groups,
APNs, HealthKit, NFC, Sign in with Apple, private entitlements, or managed
capabilities are added automatically. Those would need separate provisioning
and verification. The later plugin milestones expand the executable catalog.

CI has no Apple account credentials and cannot prove successful Personal Team
signing or actual background GPU execution. `checkGPU` reports the system value;
`false` is expected to be possible, including on simulators and restricted profiles.

References:
- https://developer.apple.com/help/account/reference/supported-capabilities-ios
- https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.background-tasks.continued-processing.gpu
- https://developer.apple.com/documentation/xcode/configuring-background-execution-modes
