# Mobile link association files

These files are templates, not deployable production configuration. Keeping
them outside `src/` prevents a placeholder Apple Team ID or Android signing
fingerprint from being published accidentally.

Before deploying production verified links:

1. Confirm the durable App Store and Play Console account owners.
2. Register `com.rankedchoices.app` in the selected Apple team and replace
   `APPLE_TEAM_ID` in `apple-app-site-association.template.json` with that
   team's ten-character Team ID.
3. Create or select the final Google Play App Signing identity and replace
   `ANDROID_RELEASE_SHA256_FINGERPRINT` in `assetlinks.template.json` with the
   SHA-256 fingerprint shown by Play Console for the app-signing certificate,
   not an upload or local debug certificate.
4. Remove `.template.json` from the deployed filenames and publish them as:

   ```text
   https://rankedchoices.com/.well-known/apple-app-site-association
   https://rankedchoices.com/.well-known/assetlinks.json
   ```

5. Serve both files directly over HTTPS with no redirect. Serve the Apple file
   as `application/json`; use `application/json` for Android as well.
6. Replace every placeholder and validate the deployed JSON before installing
   a newly signed production build. A build installed before association is
   corrected may retain a failed verification result until reinstall.

The production app configuration claims only `https://rankedchoices.com/ballot/*`.
The staging app claims the equivalent path on `staging.rankedchoices.com` so
the two installed apps do not compete for the production domain. Create
separate staging association files when that host is provisioned.
