# Ranked Choices mobile

Phase 0 of the Ranked Choices Expo migration. This app currently provides a
shortcode lookup and read-only ballot preview backed by the existing PHP API.
It does not submit votes or authenticate users yet.

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

   - iOS simulator and web default to `http://127.0.0.1:2461/api`.
   - Android Emulator defaults to `http://10.0.2.2:2461/api`.
   - For a physical device, copy `.env.example` to `.env.local`, replace the
     host with the computer's LAN IP, and ensure both devices are on the same
     network.

4. Start the app:

   ```bash
   npm start
   ```

The terminal provides shortcuts for iOS, Android, and web. Incoming-link tests
should use a development build; Expo Go has limited linking support.

## Checks

```bash
npm test
npm run typecheck
npm run lint
```

## Configuration

`EXPO_PUBLIC_API_BASE_URL` must point to the directory containing the PHP API
scripts and should not end with a slash. Public Expo variables are embedded in
the client bundle, so never put credentials or secrets in them.

## Current scope

- Expo Router and TypeScript scaffold
- development API base URL selection
- typed normalization of the legacy `get-candidates.php` response
- ballot lookup and read-only candidate display
- loading, closed, not-found, malformed-response, and network-error handling

Voting, authentication, production deployment, and domain association files
are intentionally deferred to later RFC phases.

## Expo resources

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Development builds](https://docs.expo.dev/develop/development-builds/introduction/)
