# CHG-0039 tasks: Sign-in methods, plugin gallery and plugin sign-in

Check items off as they land. Each task should be independently verifiable.

- [x] 1. Sign-in methods (R7a–R7c): `methods` in `GET /api/me`, `DELETE /api/me/methods`, taken identities refused
      while signed in, SIGN-IN METHODS page; accounts `link-and-remove-methods` (failed first).
- [x] 2. Plugin gallery: the plugin page reaches the public API (CORS for the plugin origin, no cookies); GALLERY tab.
- [x] 3. Plugin keys and the device code flow on the server (ADR; migration; Bearer in `currentUser`, limits).
- [x] 4. Plugin SIGN IN tab: code flow, key storage, OPEN and SAVE with the account; ACCOUNT lists signed-in apps.
- [x] 5. iPad app: Sign in with Apple and passkeys natively (`/api/app/…`, apple-app-site-association,
      plugin/src/ios/NativeSignIn.mm); the AUv3 shares the key. Built in with `BLOKDUST_IOS_NATIVE_SIGN_IN=1` once the
      App ID has Sign in with Apple and Associated Domains (owner: developer portal, or the team's Apple account in
      Xcode); until then the iPad signs in with the code. accounts `ipad-native`, `ipad-app-sign-in`.
- [ ] 6. Gates, deploys (staging, MBP, iPad), push.
