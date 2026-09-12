# Mobile release checklist

This checklist governs the first public iOS and Android releases. Complete the
staging and TestFlight/internal-testing gates before App Store or Play Store
review. Do not place passwords, signing keys, management tokens, voter codes,
or store API credentials in the repository.

## 1. Ownership and access

- [x] David Moritz confirmed on September 9, 2026 that he will own and retain
  control of the App Store Connect and Google Play Console listings.
- [ ] The selected accounts, rather than a temporary contributor account, own
  the production identifiers and signing identities.
- [ ] Release contributors have least-privilege App Manager/Developer access;
  the Account Holder retains agreements, renewal, and recovery responsibility.
- [ ] The support email, privacy-request contact, copyright holder, and public
  seller/developer names have been approved.

Safety check: verify the account/team name in each store before registering
`com.rankedchoices.app` or uploading any build. Moving an app later is possible
only under store-specific eligibility rules and should not be the launch plan.

## 2. Backend deployment

- [ ] Back up the production database and record a restore point.
- [ ] Apply every migration in `src/api/migrations/` in filename order. For the
  guest-creation slice, apply `2026-09-06-ballot-management-tokens.sql` before
  deploying `src/api/v2/ballots.php`.
- [ ] Run the preflight and post-deploy queries in `src/api/SETUP.md`; confirm
  the management-token table, unique digest index, and ballot lookup index.
- [ ] Deploy the v2 ballot, vote, and results endpoints plus their guarded
  legacy dependencies.
- [ ] Deploy the additive results `resultMethod` contract before uploading a
  mobile build that requires it; verify ordinary ballots return `rcv` and a
  maintainer-approved Borda ballot returns `borda`.
- [ ] Verify GET requests receive the documented method/error envelope and run
  a disposable production smoke ballot approved by the maintainer. Remove all
  smoke data after verification.
- [ ] Confirm the existing AngularJS create, vote, results, and management
  smoke flows still pass.

Safety check: the schema migration is additive and idempotent. Keep the new
endpoint code unavailable until its table exists. If an endpoint fails, roll
back the code first; retaining an unused additive table is safer than dropping
it during an incident.

## 3. Staging and build configuration

- [ ] Provision `https://staging.rankedchoices.com` with a non-production
  database and the same migration level as production.
- [ ] Change the staging EAS API target from production to staging.
- [ ] Create EAS projects/environments under the durable project owner.
- [ ] Store signing material and any Sentry source-map token in store/EAS
  credential systems, never source control.
- [ ] Confirm development, staging, and production builds have distinct names,
  identifiers, API targets, icons, and update channels.
- [ ] Decide whether Sentry will be enabled. If yes, approve the privacy-policy
  language, set a retention period, configure the privacy-minimized project,
  and verify one symbolicated test error without ballot or voter data.

Safety check: print the resolved Expo configuration for each build variant and
inspect its identifier, associated domain, and telemetry flags; separately
inspect the matching EAS profile's API URL before building. A staging binary
must never be submitted as production.

## 4. Verified links

- [ ] Fill the templates in `docs/mobile-association-files/` only after the
  Apple Team ID and Google Play app-signing SHA-256 fingerprint are final.
- [ ] Publish the production files beneath
  `https://rankedchoices.com/.well-known/` with HTTPS, JSON content types, and
  no redirect.
- [ ] Publish separate staging files on `staging.rankedchoices.com`.
- [ ] Verify an ordinary browser still opens every ballot URL as a fallback.
- [ ] On clean physical-device installs, verify a production-domain ballot
  link opens the production app and a staging-domain link opens only staging.

Safety check: inspect the served files from an external network and compare the
Team ID, package, and certificate fingerprint with the store consoles. Test
universal/app links after reinstalling, because failed association checks can
be cached by the device.

## 5. Privacy, support, and store metadata

- [ ] The maintainer reviews the draft store copy, screenshot plan, privacy
  matrix, and review notes in `docs/mobile-store-submission.md`; copyable
  metadata remains versioned in `apps/mobile/store/metadata/en-US.json`.
- [ ] The maintainer reviews `src/privacy-policy.html` against actual hosting,
  log, backup, analytics, Sentry, and deletion practices and obtains legal
  review if appropriate.
- [ ] The privacy policy and terms pages are live before any store build points
  to them; the mobile Privacy & support screen opens both.
- [ ] App Store and Play data-safety answers match the code and policy,
  including ballot/vote content, IP addresses, optional installation IDs,
  group answers, secure codes, diagnostics, and website-only analytics.
- [ ] Support URL/email, description, keywords, category, age rating,
  copyright, review notes, and geographic availability are approved.
- [ ] Screenshots contain only disposable ballots and no personal, voter-code,
  management-token, production-account, or private test information.
- [ ] Export-compliance answers are reviewed for HTTPS and SecureStore usage.
- [ ] The current Expo placeholder icon is replaced with approved production
  icon/adaptive-icon assets, and an approved Play feature graphic is exported.

## 6. User-generated content and moderation

- [x] Native ballot creation requires explicit acceptance of content rules,
  and the Terms prohibit abusive and rights-infringing ballot content.
- [x] Every native ballot exposes an accessible report action that includes
  only its public shortcode and canonical link.
- [ ] The maintainer approves who monitors reports, the response target,
  evidence-minimization rules, enforcement steps, and backup coverage.
- [ ] A release rehearsal confirms a report reaches the monitored channel and
  a moderator can locate and remove a disposable violating ballot.
- [ ] Store review confirms whether the mail-composer flow is sufficient; if
  not, ship a first-party report API and moderation queue before release.

Safety check: have one reviewer trace every privacy disclosure back to code or
an operating practice and a second reviewer compare the final store forms with
the published policy. Moderation testing must use fictional content and must
never place voter codes or management credentials in a report.

## 7. Automated and device verification

- [ ] Root Vitest, PHPUnit, Playwright, live MySQL contracts, and production
  Vite build pass from the release commit.
- [ ] Mobile Vitest, TypeScript, Expo lint, and static export pass.
- [ ] `npm run validate:release` passes and
  `npm run validate:release:strict` reports no unresolved blockers.
- [ ] Xcode builds the production scheme without errors or unresolved signing
  warnings; Android produces a signed release bundle.
- [ ] Android device E2E covers incoming link -> rank -> submit -> results,
  secure code, grouping questions, sharing, and guest creation.
- [ ] iOS simulator and at least one physical iPhone cover lookup, guest
  creation, SecureStore recovery messaging, voting, results, sharing, cold
  launch links, network failure/retry, larger text, and VoiceOver basics.
- [ ] Compare one released Borda ballot's native winners and point totals with
  the website, and confirm the native view does not show RCV rounds.
- [ ] Test current and oldest supported OS versions where practical.

Safety check: use disposable records and record the shortcode or database ID
before each mutation so cleanup targets only test data. Never capture raw
management tokens in screenshots, logs, CI artifacts, or bug reports.

## 8. TestFlight and Play internal testing

- [ ] Upload signed release candidates and resolve all processing, privacy,
  compliance, and symbol warnings.
- [ ] Run internal testing first, then a small external TestFlight/closed Play
  group using the production-like backend and link files.
- [ ] Provide reviewers a live disposable ballot, secure-code instructions,
  and concise notes explaining that accounts and advanced management remain on
  the website.
- [ ] Collect crash-free launch, link-open, vote completion, and support
  feedback without enabling product analytics.
- [ ] Obtain maintainer sign-off on the exact build numbers selected for
  review.

Safety check: upload does not authorize release. Keep manual release control
for version 1.0 so approval cannot publish an unreviewed backend/build pairing.

## 9. Public release and rollback

- [ ] Re-run external API, policy/support URL, and association-file checks
  immediately before submission and release.
- [ ] Publish a small initial availability set or manual/phased release chosen
  by the maintainer.
- [ ] Monitor crashes, support requests, API errors, and vote completion during
  the overlap period while the website remains the fallback.
- [ ] Document who can pause availability, disable mobile endpoints, rotate
  signing/store credentials, and communicate an incident.
- [ ] Keep the website operational; do not begin AngularJS retirement based on
  the first native release.

Rollback order: stop or pause store rollout, disable only the affected new API
surface if necessary, keep canonical web links functional, and preserve data
for diagnosis. Do not drop additive schema during an active rollback.

## References

- [Apple Developer Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
- [App Store Connect accounts and roles](https://developer.apple.com/help/app-store-connect/manage-your-team/overview-of-accounts-and-roles/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play user-generated-content policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Apple app-transfer criteria](https://developer.apple.com/help/app-store-connect/transfer-an-app/app-transfer-criteria)
- [Expo app-store submission](https://docs.expo.dev/submit/ios/)
