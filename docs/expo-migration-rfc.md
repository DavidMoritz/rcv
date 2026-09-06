# Expo Migration RFC

- Status: Accepted; Phases 0 and 1 implemented; Phase 2 in progress
- Date: 2026-08-08
- Last updated: 2026-09-06
- Proposer: Emmanuel Jones
- Decision horizon: architecture and first product milestone
- Maintainer guidance received: 2026-08-30 and 2026-09-05

## Summary

Build a new Expo/React Native client alongside the existing AngularJS app. The
native client supplements the website rather than replacing it and initially
reuses the PHP/MySQL backend. Native users may create a basic ballot with a
name and candidates; RankedChoices.com remains the home for advanced creation
and management. Migration will proceed through vertical product slices,
starting with the core voter experience: ballot lookup, voting, and results.

Do not begin with account management or owner-only ballot mutations. The
current browser client persists a user ID and name in cookies, while many PHP
endpoints trust caller-supplied user or `createdBy` fields. A native client must
not carry that implicit trust forward. Authenticated features will be added
only after the backend can issue and verify tokens and hash passwords on the
server.

## Why now

The AngularJS application is usable and has meaningful regression coverage,
but most UI behavior remains concentrated in `MainCtrl`, `ballot.js`, and
inline page fragments. Additional broad tests would primarily preserve an
interface intended for retirement. The migration should instead use the
existing tests as a characterization harness and invest new coverage at the
boundaries reused by Expo.

The product's defining constraint remains the 15-second ballot: a person must
be able to create or open a ballot and vote without first learning an account
or setup workflow.

## Goals

- Ship one codebase for iOS and Android, with a credible path to web.
- Keep the PHP/MySQL backend during the initial migration.
- Preserve existing ballot shortcodes and shareable links.
- Preserve anonymous voting and the fast default experience.
- Move reusable election and formatting logic into framework-neutral
  TypeScript.
- Replace implicit client identity with explicit server-verified authorization
  before porting account and ballot-management features.
- Migrate incrementally without interrupting the production AngularJS site.
- Keep advanced ballot creation and management on RankedChoices.com while the
  native app supports the fast basic create-and-vote experience.

## Non-goals

- Rewriting the PHP backend and database at the same time as the client.
- Reaching complete feature parity in the first release.
- Supporting offline vote submission.
- Porting Bootstrap/jQuery components or reproducing the existing DOM exactly.
- Adding speculative session-authentication tests to the current endpoints.
- Making Expo web the production website before dynamic-route, SEO, and hosting
  behavior have been proven.

## Current-system inventory

### User-facing areas

| Area | Current implementation | Migration priority |
|---|---|---|
| Home and shortcode entry | `home.html`, path-as-shortcode routing | Milestone 1 |
| Vote | `vote.html`, sortable candidate list | Milestone 1 |
| Results and round detail | `results.html`, `results-detail.html`, `VoteFactory` | Milestone 1 |
| Create ballot | `create.html`, multi-step state in `ballot.js` | Milestone 2 |
| Secure voter codes | `code.html`, validation and management endpoints | Milestone 2 |
| Registration and login | `register.html`, `auth.js` | Milestone 3 |
| Profile and ballot management | `profile.html`, `manage.html` | Milestone 3 |
| Group-question collection while voting | vote flow | Milestone 2 |
| Grouping configuration, analysis, and export | create, results, CSV export | Milestone 4 |
| RCVis integration | browser iframe plus cURL PHP endpoints | Milestone 4 |
| Custom HTML/iframe content | browser-specific rendering and editing | Permanently web-only |
| Admin and wrapping-paper calculator | separate browser-only surfaces | Permanently web-only |
| Hall of fame and other static content | existing website pages | Open the website from native |

### Backend and data

The existing PHP API contains roughly 45 endpoint scripts over nine production
tables: ballots, entries, votes, users, random codes, ballot-code assignments,
group fields/options, and contributions. It already supports the core
anonymous flow:

1. `get-candidates.php` returns a ballot, candidates, and group fields.
2. `vote.php` accepts the ordered names/IDs plus voter metadata.
3. `get-votes.php` returns ballot metadata, entries, and vote rows.

The live MySQL contract suite exercises a high-signal create -> entries -> vote
-> results sequence. PHPUnit provides broader endpoint characterization using
SQLite.

### Reusable JavaScript

- `src/js/factories/vote-factory.js`: election rounds, transfers, tie breaks,
  and RCVis payload construction. Its algorithm coverage is the strongest
  candidate for extraction.
- `src/js/utils/borda.js`: framework-neutral Borda calculation.
- `src/js/utils/rcvis-helpers.js`: framework-neutral visibility/update rules.
- Parts of `src/js/ballot.js`: date, title, slug, and group-field helpers.

`VoteFactory` still depends on Angular scope, Lodash globals, and network side
effects. Extraction should separate pure election calculation from display and
RCVis synchronization; it should not be copied wholesale into Expo.

### Current authentication boundary

- Login compares a client-generated legacy hash directly with the `users`
  table.
- The browser stores user ID, name, and clearance in readable cookies.
- The backend does not issue an ordinary-user session or access token.
- Multiple reads and mutations accept user identity or `createdBy` from the
  request.
- `PASSWORD_MIGRATION_PLAN.md` already identifies the need for server-side
  password hashing.

This is known security debt. It is also the reason authenticated native
features are deferred until Milestone 3.

## Decisions

### 1. Add Expo alongside the existing app

Create `apps/mobile/` and leave the current root Vite build intact. The first
scaffold should have its own commands and must not alter production deployment.
Repository workspace consolidation can follow after both toolchains run
reliably in CI.

### 2. Use TypeScript and Expo Router

Use file-based routes for native and future web navigation. Expo recommends
Expo Router for new universal applications and provides automatic deep-link
handling and typed-route support:

- <https://docs.expo.dev/router/introduction/>
- <https://docs.expo.dev/linking/overview/>

Proposed initial routes:

```text
src/app/
  _layout.tsx
  index.tsx                  # shortcode lookup
  ballot/[key]/index.tsx     # ballot details and ranking
  ballot/[key]/thanks.tsx
  ballot/[key]/results.tsx
```

Do not mirror every Angular navigation item. Routes should follow user tasks.

### 3. Preserve links through a compatibility layer

The canonical future route is `https://rankedchoices.com/ballot/<key>`. Use it
for newly generated links. Existing `https://rankedchoices.com/<key>` links
must continue to work permanently as compatibility redirects to the canonical
route. There is no need to rewrite already-shared links. Going forward, never
recycle a previously valid shortcode as an ordinary site route or rename a
ballot merely to reserve a root-level route.

Use iOS Universal Links and Android App Links once a development build exists.
The domain association files remain a deployment task, not part of the initial
scaffold. Expo's documentation notes that domain verification is required and
that an HTTP(S) link falls back to the website if the app is absent:
<https://docs.expo.dev/linking/overview/>.

### 4. Keep the backend, add a versioned contract incrementally

The Expo spike may read the existing endpoints through a typed adapter. New or
changed contracts should be introduced under `/api/v2/` and should provide:

- consistent JSON envelopes;
- meaningful HTTP status codes;
- stable field names and JSON-native booleans/numbers;
- request IDs and safe error codes;
- explicit CORS policy for development and approved production origins;
- authorization middleware for protected routes;
- compatibility tests against MySQL.

Do not rewrite every PHP endpoint first. Add v2 endpoints as a migrated product
slice needs them, delegating to shared PHP services where practical.

### 5. Use API-issued tokens for native authentication

Target a short-lived bearer access token plus a revocable, rotating refresh
token. Store native secrets with Expo SecureStore, which provides encrypted
device key-value storage: <https://docs.expo.dev/versions/latest/sdk/securestore/>.

Before authenticated Expo features ship:

- hash new passwords server-side with PHP's password APIs;
- migrate legacy passwords on successful login, then require a reset for any
  accounts that remain after a defined migration window;
- add token/session tables with hashed refresh-token material;
- authorize every protected resource from the verified principal, never from
  a request-supplied user ID;
- add owner/non-owner/anonymous contract tests;
- define revocation, expiry, device loss, and account-deletion behavior;
- separately decide browser credential handling before replacing authenticated
  web screens.

Token format is deliberately undecided. Opaque access tokens reduce accidental
data exposure and make immediate revocation straightforward; signed tokens may
be chosen only if stateless verification is a demonstrated requirement.

The migration window, deadline, rate limits, and legacy-endpoint removal plan
are deliberately deferred until Phase 3. They should be decided as part of the
authentication design rather than planned during anonymous or guest flows.

### 6. Do not support offline vote submission

The client may cache previously fetched public ballot data and results for
resilience. A vote requires an online server response because cutoffs, secure
codes, duplicate-vote rules, and current ballot configuration are authoritative
on the backend. Failed submissions remain visibly pending only long enough for
an explicit user retry; they are not silently queued.

### 7. Extract a framework-neutral election package

Create `packages/rcv-core/` only when the results slice begins. Port the tested
algorithm to TypeScript behind explicit inputs and outputs. No DOM, Angular
scope, jQuery, HTTP, RCVis calls, clocks, or global randomness may live in the
core package.

Run the existing election fixtures against both implementations until the old
client is retired. Differences must be either fixed or recorded as an approved
behavior correction.

### 8. Defer the Expo-web cutover decision

The native app and production AngularJS site will coexist initially. Expo
Router supports universal routing and web output, but static web builds require
special handling for dynamic routes such as arbitrary ballot shortcodes. The
official static-rendering guide calls out that dynamic routes are not generated
arbitrarily: <https://docs.expo.dev/router/web/static-rendering/>.

Before web cutover, prove:

- direct loading and refresh of arbitrary ballot URLs;
- search metadata and public-page indexing;
- legacy shortcode redirects;
- custom HTML/iframe behavior;
- printing and downloadable results;
- domain association files and PHP API hosting on the same deployment.

### 9. Use stable native application identifiers

Use `com.rankedchoices.app` as both the Apple bundle ID and Android package
name for production. Reserve `com.rankedchoices.app.staging` for an optional,
separately installable staging build. Development builds may continue using a
development-only identifier until production signing and store setup begin.

### 10. Defer staging infrastructure until store preparation

Use `https://staging.rankedchoices.com` as the eventual device-build staging
origin, with versioned APIs beneath `/api/v2/`. Provisioning it does not block
the current migration work: device builds may test against production for now,
and staging should be established closer to app-store submission.

### 11. Start with crash reporting, not product analytics

Use Sentry for production mobile crash and error reporting. Do not add Aptabase
or another product-analytics service for the initial launch; revisit product
analytics after the app has real users.

Third-party telemetry is acceptable only under these constraints:

- never collect ballot names, shortcodes, candidates, rankings, voter codes,
  email addresses, other vote content, or personally identifying information;
- do not enable session replay or automatic touch capture;
- restrict crash context and any future events to privacy-minimizing technical
  data such as app version, platform, safe error codes, and coarse performance;
- document collection and retention in the privacy policy before enabling it.

The obsolete Universal Analytics integration in the website should be removed
separately; it is not part of the Expo launch scope.

Launch-readiness scaffolding follows this decision without activating data
collection. Development, staging, and production build variants use
`com.rankedchoices.dev`, `com.rankedchoices.app.staging`, and
`com.rankedchoices.app`, respectively. The Sentry SDK is initialized only in a
native build with an explicit enable flag and DSN, and it remains disabled
until privacy-policy language and Sentry project credentials exist. A final
event sanitizer removes application messages, request/user data, breadcrumbs,
routes, interaction data, and stack-frame values while retaining
symbolication fields and coarse technical context.

### 12. Keep browser-oriented features on the web

The native launch scope is the core voter experience: find a ballot, vote, and
view results. Keep these features permanently web-only:

- the admin page;
- the “It’s a Wrap!” wrapping-paper calculator;
- custom HTML authoring and rendering;
- arbitrary third-party iframe content;
- any remaining legacy or experimental HQ voting page.

Keep these web-only initially, but consider native versions later if demand
justifies them:

- print-optimized results and printable secure-voter-code sheets;
- bulk CSV and JSON exports;
- advanced voter-code and grouping administration;
- RCVis API-key configuration and graph synchronization;
- detailed ballot-owner management workflows.

Static pages such as About, Terms of Service, secure-election instructions,
Hall of Fame, and donation information should open on RankedChoices.com rather
than being duplicated in the native app.

### 13. Allow basic guest creation with a device management token

The native app may create a basic ballot using only its name and candidate
names. The server generates the shortcode and applies the ordinary single-seat
defaults. Secure codes, grouping configuration, custom HTML, vote cutoffs,
RCVis integration, and other advanced settings remain on the website.

Each guest ballot receives a high-entropy management token generated by the
server and returned only in the successful creation response. The server stores
only a one-way digest; the native client stores the token in Expo SecureStore.
The token is a narrowly scoped ballot-management credential, not a user ID,
account token, or replacement for Phase 3 authentication. It must never appear
in URLs, logs, analytics, crash reports, or share content.

Device loss can therefore mean loss of guest-management access until the ballot
is claimed. Once native accounts are available, an authenticated claim request
must prove both the account identity and possession of the ballot-management
token, then revoke or rotate the guest credential. Advanced owner workflows
remain deferred until their endpoints enforce the same server-verified
authorization boundary.

## Target architecture

```text
AngularJS web (temporary) ----\
                               >---- PHP API /api + /api/v2 ---- MySQL
Expo iOS/Android -------------/
        |
        +---- typed API adapter
        +---- screen/application state
        +---- packages/rcv-core (pure TypeScript)
```

The API is the migration seam. The legacy web app continues using `/api` while
Expo begins with adapters for compatible reads and adopts `/api/v2` as slices
need safer contracts.

## Migration phases

### Phase 0 — scaffold and connectivity

- Add an isolated TypeScript Expo Router app.
- Configure development API base URLs without committing secrets.
- Implement shortcode lookup and read-only ballot detail using
  `get-candidates.php`.
- Normalize the legacy response in one typed adapter.
- Document simulator, device, and local-PHP networking.
- Add adapter unit tests and a CI typecheck/test job.

Exit criteria: iOS and Android development builds can display the same public
ballot from a local or staging PHP backend; the production web build is
unchanged.

### Phase 1 — anonymous vote and results

- Build an accessible ranking interaction with explicit move-up/move-down and
  reset controls; gestures are an enhancement, not the only control.
- Submit votes online with clear loading, retry, duplicate, secure-code, and
  cutoff states.
- Extract `rcv-core` and render local round results.
- Support the canonical `/ballot/[key]` route and test incoming links in a
  development build.
- Cover the flow with API contract tests and one device-level E2E scenario.

Exit criteria: open link -> rank -> submit -> results works anonymously on iOS
and Android, including failure recovery, without regressing the website.

### Phase 2 — ballot creation and secure voting

- Port a name-and-candidates version of the 15-second create flow first.
- Add optional settings progressively, not as an initial wizard.
- Issue a server-generated guest management token, store only its digest on the
  server, and store the credential in native SecureStore.
- Preserve a later authenticated claim path that verifies the management token
  before transferring ownership and revoking or rotating the guest credential.
- Add secure voter-code entry and validation.
- Add grouping questions needed during voting.
- Generate share links and native share-sheet content.

Exit criteria: a guest can create and share a basic ballot; secure ballots can
be voted from native when supplied a valid code.

Secure-code voting can ship as an independent first slice while guest-ballot
creation is implemented separately. The native request carries the normalized
code; the server verifies that it is assigned to the ballot, serializes redemption,
stores the code in the legacy vote-name field, and preserves idempotent replay
for an identical request. Invalid and previously used codes intentionally
share one nonspecific client error.

Grouping-question collection is likewise independent of guest-ballot
ownership. The native client renders the existing select, checkbox, and text
field definitions returned with a ballot. The v2 vote endpoint validates field
and option ownership, required answers, types, and text length, then stores the
normalized answers in the existing `votes.group_answers` column. Grouping
configuration, analysis, and export remain web-only initially.

Canonical sharing also does not depend on ballot ownership. The ballot and
results experience generates `https://rankedchoices.com/ballot/<key>` and
passes it to the native system share sheet. The URL is included in both the
cross-platform message and the iOS URL field so shared links are canonical on
both platforms.

### Phase 3 — authentication and management

- Implement server-side password hashing, migrate legacy hashes on successful
  login, and force a reset for accounts remaining after the migration window.
- Add token issue, refresh, rotation, and revocation endpoints.
- Store native refresh credentials in SecureStore.
- Port registration, login, profile, claim, edit, transfer, reset, and delete
  flows only after authorization tests pass.
- Add an explicit authorization matrix for every protected endpoint.

Exit criteria: the server derives ownership from verified credentials and a
logged-in user can safely manage only their own ballots.

### Phase 4 — advanced parity and web evaluation

- RCVis display/synchronization.
- Full grouping management and exports.
- Borda views, custom entries, delayed results, and administrative tools.
- Revisit initially web-only owner workflows only where native demand warrants
  them; permanently web-only features remain on RankedChoices.com.
- Run the Expo-web proof and decide whether, when, and how to replace AngularJS.

### Phase 5 — retirement

- Route eligible traffic to the new client.
- Observe errors, vote completion, and link-open success during a defined
  overlap period.
- Retire AngularJS only after parity requirements, rollback steps, and data/API
  compatibility are signed off.

## Testing policy during migration

Continue running the existing suites. Add new tests only where they protect a
migration seam or an active slice:

- retain current Vitest algorithm/helper coverage;
- retain PHPUnit endpoint characterization and schema drift checks;
- retain the live MySQL API contract flow;
- retain the legacy Playwright smoke flows while AngularJS is in production;
- add TypeScript adapter and `rcv-core` unit tests;
- add v2 contract tests for every new endpoint;
- add a small number of device E2E flows at milestone boundaries.

Paused unless a migration slice requires them: mutation testing, broad visual
regression, exhaustive Angular controller tests, `get-settings.php` coverage,
and RCVis cURL seams.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Two clients drift against one backend | Typed adapters, v2 contracts, MySQL contract tests, staged rollout |
| Authentication work expands the rewrite | Keep anonymous milestone first; require a separate auth design review |
| Existing shortcode links stop opening | Compatibility route, universal-link tests, web fallback |
| Election results differ after extraction | Run identical fixtures against legacy and TypeScript implementations |
| Native ranking is inaccessible | Provide buttons and screen-reader actions in addition to gestures |
| Offline retries create duplicate votes | No background queue; server remains authoritative; explicit retries |
| Expo web harms SEO or dynamic routes | Preserve Angular web until a deployment proof meets web exit criteria |
| Advanced browser features block parity | Classify each feature as universal, native-specific, or web-only |

## Initial implementation scope (completed)

The first implementation PR was intentionally limited to:

- `apps/mobile/` scaffold with TypeScript and Expo Router;
- environment-based API base URL configuration with a checked-in example;
- `LegacyApiClient.getBallot(key)` and runtime normalization;
- shortcode lookup and read-only ballot detail screens;
- loading, not-found, malformed-response, and network-error states;
- adapter unit tests and setup documentation;
- CI commands scoped to the Expo app.

It excluded voting, authentication, database changes, production deployment,
universal-link association files, and modifications to legacy API responses.
That kept the first review focused on repository layout, connectivity, and the
compatibility seam.

## Remaining decisions

Maintainer guidance on 2026-08-30 resolved the original open questions about
native/web product direction, application identifiers, staging target,
canonical ballot URLs, the high-level legacy-password approach, launch
telemetry, and web-only features. The following details remain intentionally
deferred:

- Define the account-facing claim UX and device-loss recovery policy before
  Phase 3 owner workflows ship. The Phase 2 authorization mechanism is settled:
  guest creation uses a server-generated, device-stored management token and a
  later claim must prove both that token and an authenticated account.
- Define the legacy-password migration window, reset deadline, rate limits, and
  endpoint-removal plan during the Phase 3 authentication design.
- Decide whether later product usage warrants privacy-minimizing product
  analytics or native versions of the initially web-only owner workflows.

## Review gates

Phase 0 received maintainer approval and the read-only device spike is
complete. Revisit this RFC before production link association, during
app-store preparation, and again before Phase 3 authentication work.
