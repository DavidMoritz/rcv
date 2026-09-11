# Ranked Choices mobile

Phase 2 of the Ranked Choices Expo migration is in progress. This app currently provides a
shortcode lookup, ballot preview, and local candidate-ranking controls backed
by the existing PHP API. Anonymous ballots can be submitted through the typed,
idempotent v2 vote endpoint. Released votes are loaded through the public v2
results contract and calculated locally by the pure `packages/rcv-core`
TypeScript module. Secure ballots can be submitted with an assigned voter
code. Ballots with voter grouping enabled render and validate their select,
checkbox, and text questions before submission. Ballot and results screens can
open the system share sheet with the canonical RankedChoices.com ballot link.
The native app can also create a basic guest ballot from a name and candidate
list. The API generates its shortcode and a one-time management credential;
only the credential digest is stored on the server, while the native client
protects the credential with Expo SecureStore. The app does not authenticate
users yet, and advanced ballot creation remains on RankedChoices.com.

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
APP_VARIANT=development npx expo run:android
```

For iOS, install full Xcode, an iOS simulator runtime, CocoaPods, and CMake.
The ordinary development-build command generates the ignored native workspace,
installs pods, builds, and starts the simulator:

```bash
APP_VARIANT=development npx expo run:ios
```

To build through Xcode or Xcode MCP, generate and open the workspace explicitly:

```bash
APP_VARIANT=development npx expo prebuild --platform ios --no-install
cd ios
APP_VARIANT=development pod install
open RankedChoicesDev.xcworkspace
```

Run the PHP API in a separate terminal. If Expo's development launcher cannot
reach `127.0.0.1` because Metro selected IPv6 localhost, start Metro with IPv4
resolution while keeping it off the LAN:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first \
APP_VARIANT=development \
npx expo start --dev-client --host localhost
```

The first native build compiles the CocoaPods dependency graph and can take
several minutes. Always open the `.xcworkspace`, not the `.xcodeproj`, after
pods are installed.

Basic ballot creation uses a native SecureStore module and is disabled on Expo
web. Rebuild a development client after adding or updating that dependency. If
encrypted storage is unavailable, the client refuses to create a ballot. If
storage fails after the server responds, keep the success screen open and retry
saving access; the app retains the credential only in memory during that
recovery state and never shows it in a URL, share payload, log, or error
message.

The dynamic app config defaults local commands to the development variant.
`RCV_ANDROID_PACKAGE` and `RCV_IOS_BUNDLE_IDENTIFIER` remain available as
explicit local overrides.

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

To verify the native system share sheet without submitting a vote:

```bash
RCV_E2E_BALLOT_KEY=pizza \
RCV_E2E_SHARE_ONLY=1 \
ADB="$ANDROID_HOME/platform-tools/adb" \
npm run test:android:e2e
```

To create a disposable basic ballot, verify that its management credential was
saved, and open the new ballot in a development build:

```bash
RCV_E2E_CREATE_BALLOT=1 \
RCV_E2E_APP_PACKAGE=com.rankedchoices.dev \
RCV_E2E_INCOMING_URL=rankedchoices:///create \
RCV_E2E_COLD_START=0 \
ADB="$ANDROID_HOME/platform-tools/adb" \
npm run test:android:e2e
```

This scenario creates a real local database row. Remove the generated
shortcode from the disposable development database after the test.

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

### Build profiles

`eas.json` defines three separately identifiable builds:

| Profile | App identifier | API target |
|---|---|---|
| `development` | `com.rankedchoices.dev` | local/runtime configuration |
| `staging` | `com.rankedchoices.app.staging` | production temporarily |
| `production` | `com.rankedchoices.app` | production |

The staging package can coexist with production. It intentionally uses the
production API until `https://staging.rankedchoices.com` is provisioned, as
approved for the current migration phase. Change the staging profile's
`EXPO_PUBLIC_API_BASE_URL` when that environment exists.

Production and staging builds also declare verified `https` ballot links for
their respective domains. The server-side files must be generated from the
templates in `docs/mobile-association-files/` after the store account owner,
Apple Team ID, and Google Play app-signing certificate are final. Development
builds intentionally rely on the `rankedchoices://` scheme and do not claim a
web domain.

See `docs/mobile-release-checklist.md` for deployment, privacy, TestFlight,
store-submission, and rollback gates.

### Building and submitting

```bash
npm run build:ios        # local production build, output in builds/
npm run build:android    # remote EAS production build
npm run submit:ios       # submit latest .ipa from builds/ to TestFlight
```

iOS builds run locally (`--local`) to preserve the free EAS tier for Android.
The `build:ios` script automatically moves the `.ipa` to `builds/` (gitignored).
`submit:ios` picks the newest `.ipa` from that directory.

### Store preparation

Versioned release material lives under `store/`:

- `metadata/en-US.json` is the source for the initial English store copy and
  screenshot captions; and
- `release-status.json` records decisions that are settled and manual gates
  that still block a signed beta or public release.

### OTA updates (EAS Update)

The app includes `expo-updates` so JavaScript changes can be pushed
over-the-air without a new store review. Each EAS build profile is assigned a
`channel` in `eas.json` (development, staging, production).

**Publish an update:**

```bash
eas update --channel production --message "Fix results rounding bug"
```

**Roll back:** repoint the channel to a prior update branch via the Expo
dashboard or `eas channel:rollback`.

**What can be pushed OTA:** any JavaScript, TypeScript, or asset change.
**What requires a new store build:** native dependency additions/upgrades,
`app.json` config changes that affect the native layer, or Expo SDK upgrades
(the `fingerprint` runtime-version policy prevents incompatible updates from
being served).

Run `npm run validate:release` during ordinary development to check version
numbers, build variants, verified-link declarations, store character limits,
safe association placeholders, and the required content-safety controls. CI
runs the same command. Immediately before a release, run
`npm run validate:release:strict`; it intentionally fails while any recorded
manual blocker remains.

The fuller copy review, screenshot plan, provisional privacy/data-safety
matrix, moderation requirements, and private reviewer-note draft are in
`docs/mobile-store-submission.md`. The app icon and Android adaptive icon assets use the
branded spraycan mascot.

### Crash reporting

The official Sentry React Native SDK and source-map-aware Metro configuration
are present, but event delivery is off by default. Native crash reporting
starts only when both `EXPO_PUBLIC_SENTRY_ENABLED=true` and
`EXPO_PUBLIC_SENTRY_DSN` are embedded in a build. Expo web does not initialize
Sentry.

Before enabling production or staging reporting:

1. Publish privacy-policy language describing Sentry collection and retention.
2. Set `SENTRY_ORG`, `SENTRY_PROJECT`, and the public DSN in the matching EAS
   environment. The organization and project values activate the native Expo
   plugin.
3. Store `SENTRY_AUTH_TOKEN` as a sensitive EAS variable so release source maps
   can be uploaded. Never commit the token.
4. Build a release and verify one intentionally generated test error is
   symbolicated, then remove the test trigger.

The runtime configuration disables product analytics, logs, breadcrumbs,
performance tracing, session tracking/replay, touch tracing, failed-request
capture, screenshots, view hierarchies, and default PII. A tested final
sanitizer retains only stack/symbolication data and coarse app, OS, runtime,
and device fields; it removes error messages and all application values that
could contain ballot, candidate, ranking, shortcode, voter-code, email, route,
request, or user data.

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
- canonical ballot-link sharing through the native system share sheet
- basic guest ballot creation with server-generated shortcodes and encrypted,
  device-local management credentials
- local winner and round-by-round result rendering after an accepted vote
- loading, closed, not-found, malformed-response, and network-error handling

Name-required ballots, authentication, production deployment, and domain
association files remain unavailable. Name-required ballots surface an
explicit unsupported state instead of submitting an incomplete vote.

## Expo resources

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
