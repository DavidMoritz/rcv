# Ranked Choices mobile

Phase 1 of the Ranked Choices Expo migration. This app currently provides a
shortcode lookup, ballot preview, and local candidate-ranking controls backed
by the existing PHP API. Anonymous ballots can be submitted through the typed,
idempotent v2 vote endpoint. Released votes are loaded through the public v2
results contract and calculated locally by the pure `packages/rcv-core`
TypeScript module. Secure ballots can be submitted with an assigned voter
code. Ballots with voter grouping enabled render and validate their select,
checkbox, and text questions before submission. The app does not authenticate
users yet.

## Get started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the PHP API from the repository root in another terminal:

   ```bash
   cd src
   php -S 0.0.0.0:2461
   ```

3. Configure the API URL when needed:

   - iOS simulator defaults to `http://127.0.0.1:2461/api`.
   - Android Emulator defaults to `http://10.0.2.2:2461/api`.
   - For a physical device, copy `.env.example` to `.env.local`, replace the
     host with the computer's LAN IP, and ensure both devices are on the same
     network.

   API-backed ballot lookup on Expo web is deferred. The web app can render and
   export, but browser requests to the PHP server on port 2461 require either a
   same-origin development proxy or an explicit API CORS policy. Setting
   `EXPO_PUBLIC_API_BASE_URL` to the PHP URL does not bypass that browser rule.

4. Start the app:

   ```bash
   npm start
   ```

The terminal provides shortcuts for iOS, Android, and web. Incoming-link tests
should use a development build; Expo Go has limited linking support.

For a local development build, provide a disposable package identifier without
committing the eventual store identity:

```bash
RCV_ANDROID_PACKAGE=com.rankedchoices.dev npx expo run:android
```

## Checks

```bash
npm test
npm run typecheck
npm run lint
```

With the PHP server, Metro, and an Android emulator running, the Phase 1 device
scenario opens the canonical route as an incoming link, changes the ranking,
submits, and waits for locally calculated results:

```bash
ADB="$ANDROID_HOME/platform-tools/adb" npm run test:android:e2e
```

To exercise a secure ballot, provide its shortcode and six-character code:

```bash
RCV_E2E_BALLOT_KEY=my-secure-ballot \
RCV_E2E_VOTER_CODE=abcxyz \
ADB="$ANDROID_HOME/platform-tools/adb" \
npm run test:android:e2e
```

For a grouped ballot, pass one visible select-option label so the scenario
answers the question before ranking and submission:

```bash
RCV_E2E_BALLOT_KEY=my-grouped-ballot \
RCV_E2E_GROUP_OPTION_LABEL=North \
ADB="$ANDROID_HOME/platform-tools/adb" \
npm run test:android:e2e
```

Expo Go is the default target. A development build can exercise the custom
scheme with:

```bash
RCV_E2E_APP_PACKAGE=com.rankedchoices.dev \
RCV_E2E_INCOMING_URL=rankedchoices:///ballot/pizza \
RCV_E2E_COLD_START=0 \
npm run test:android:e2e
```

Start the JavaScript runtime in the development client before running the
custom-scheme form. Expo Go supports the scenario's default cold start; the
development-client launcher must hand off to the running app before a route
link can be delivered.

## Configuration

`EXPO_PUBLIC_API_BASE_URL` must point to the directory containing the PHP API
scripts and should not end with a slash. Public Expo variables are embedded in
the client bundle, so never put credentials or secrets in them.

Phase 0 supports API connectivity from iOS and Android. Expo-web API
connectivity will be designed alongside the later web deployment decision.

## Current scope

- Expo Router and TypeScript scaffold
- development API base URL selection
- typed normalization of the legacy `get-candidates.php` response
- ballot lookup and accessible local candidate ranking
- move-up, move-down, remove, and reset controls
- idempotent anonymous and secure-code vote submission with loading, retry,
  invalid/reused-code, duplicate-device, cutoff, and accepted states
- accessible select, checkbox, and text grouping questions with client and
  server validation
- local winner and round-by-round result rendering after an accepted vote
- loading, closed, not-found, malformed-response, and network-error handling

Name-required ballots, authentication, production deployment, and domain
association files remain unavailable. Name-required ballots surface an
explicit unsupported state instead of submitting an incomplete vote.

## Expo resources

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
