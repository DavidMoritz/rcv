# Mobile store submission draft

This is the working source for the first iOS and Android store records. The
copyable English (United States) metadata lives in
apps/mobile/store/metadata/en-US.json and is checked by running
npm run validate:release from apps/mobile.

Nothing in this document authorizes submission or release. David Moritz owns
the store records and retains final production-release control.

## Resolved setup

- Publisher/store owner: David Moritz, per his September 9, 2026 response.
- Public app name: Ranked Choices.
- Production identifier on both platforms: com.rankedchoices.app.
- Initial version: 1.0.0; iOS build 1; Android version code 1.
- Price: free, with no in-app purchases, subscriptions, advertising, or
  product analytics.
- Proposed availability: United States only, matching the current Terms of
  Use. Expanding availability requires Terms and legal review.
- Proposed categories: Utilities primary; Productivity secondary.
- Support URL: https://rankedchoices.com/about.
- Marketing URL: https://rankedchoices.com/.
- Privacy URL: https://rankedchoices.com/privacy-policy.html.

## Copy review

The metadata deliberately avoids claims that the app is suitable for official,
critical, or legally binding elections. It describes only features present in
the first native release: shortcode/link lookup, accessible ranking, vote
submission, voter codes, group questions, local round results, link sharing,
and basic guest ballot creation. Accounts and advanced management remain on
the website.

Before copying it into either console:

1. David approves the categories, United States-only availability, developer
   name, copyright line, support email, and all descriptive copy.
2. The production API and privacy page are live.
3. The exact submitted build is checked against the copy. Remove any feature
   not enabled in that build.
4. Re-run npm run validate:release; do not shorten copy ad hoc in a store
   console without updating the repository source.

The copyright line remains intentionally undecided because it must name the
person or entity that owns the exclusive rights, not merely the account used
to upload the app.

## App Review notes

Use this as the basis for the private review notes, updating URLs and test data
immediately before submission:

> Ranked Choices is a ranked-choice ballot client for RankedChoices.com. No
> account is required. A reviewer can select Create a basic ballot, accept the
> content rules, enter a fictional ballot name and at least two choices, and
> open the resulting ballot. The one-time management credential is stored in
> encrypted device storage and is never displayed.
>
> To test voting, rank the choices with the Move up, Move down, and Remove
> controls, submit the vote, and view the local round-by-round results. The app
> also opens a ballot from its public shortcode or canonical HTTPS link.
>
> Advanced ballot configuration and account-based management remain on the
> website. Name-required ballots are explicitly unsupported in this release.
> Ranked Choices is intended for informal decision-making, not official or
> legally binding elections.
>
> Ballot names and choices are user-generated but are not publicly browsable
> or recommended; a user must receive a link or shortcode. Creators accept the
> content rules before creating a native ballot. Every loaded ballot includes
> a Report this ballot action, and support contact information and Terms of Use
> are available in the app.

If review needs a secure-code or group-question flow, create a disposable
review ballot shortly before submission and place its shortcode and code only
in the private store review fields. Never commit or place them in screenshots.
Delete that ballot after review.

## User-generated content and moderation

Ballot names and candidate/choice names are user-generated content. The first
release reduces exposure by providing no public directory, search, social
feed, messaging, or recommendation system. Access requires a shared link or
shortcode.

The app requires explicit acceptance of the content rules before native ballot
creation and gives every ballot an accessible reporting action. The Terms
prohibit unlawful, abusive, hateful, sexually explicit, exploitative,
deceptive, privacy-violating, and rights-infringing content.

These product controls are not sufficient without an operating process.
Before store submission David must approve and document:

- who monitors davidmoritz@gmail.com for content reports;
- a reasonable target for acknowledging and investigating a report;
- how the responder validates the shortcode and preserves minimal evidence;
- how violating ballots are removed with the existing admin tools;
- when an account, guest credential, device, or network source is restricted;
- how reporters are told the outcome when appropriate; and
- who provides coverage when the primary moderator is unavailable.

The stores make the final policy determination. If an email-composer reporting
flow is not accepted as sufficiently in-app, replace it with a first-party
report API and moderation queue before release.

## Screenshot plan

Capture five truthful portrait screens in the order recorded in the metadata:
home, ranking, secure/group voting, results, and basic creation. Use the
fictional ballot “Community Garden Project” with choices such as “Native flower
beds,” “Shade trees,” “Picnic tables,” and “Compost station.” Do not use real
people, political candidates, private groups, production accounts, voter
codes, or management credentials.

For Apple, capture a final release candidate at one accepted 6.9-inch portrait
size. App Store Connect currently accepts 1260×2736, 1290×2796, or 1320×2868
pixels and permits one to ten screenshots. For Google Play, prepare at least
four 9:16 phone screenshots at 1080×1920 or higher; Google permits up to eight
per device type and requires at least two overall.

Capture requirements:

- use the actual release UI without Expo development controls or debug labels;
- set a neutral time, full signal/Wi-Fi/battery indicators, and no
  notifications;
- keep the first three images focused on real app UI;
- use no device frames, store badges, rankings, testimonials, pricing claims,
  or time-sensitive copy;
- keep optional captions small and consistent, and localize any overlay text;
- export JPEG or PNG without transparency; and
- enter the repository alt text in Play Console, adjusting it if the final
  frame differs.

Do not produce final screenshots until the branded app icon, production-like
backend, exact release build, and moderation UI are approved. Simulator
captures before that point are useful only for layout rehearsal.

## Draft privacy and data-safety answers

This matrix is conservative and must be reconciled with the exact binary,
backend operations, hosting logs, and store form wording before it is
published.

| Data or behavior | Apple draft | Google Play draft | Handling |
|---|---|---|---|
| Ballot names and choices | Other User Content; app functionality | Other user-generated content; collected; app functionality | Supplied only when a user creates a ballot |
| Rankings and group answers | Other User Content; app functionality | Other user-generated content; collected; app functionality | Submitted to the Ranked Choices API |
| Organizer voter code | Other User Content or User ID; app functionality/fraud prevention | Other user-generated content; collected; app functionality/fraud prevention | Required only for a secure ballot |
| Submitted-vote IP address | Confirm the closest identifier/other-data category; app functionality/security | Device or other IDs; collected; app functionality/fraud prevention | Stored by the vote API; not used for advertising |
| Random installation ID | Device ID; app functionality/fraud prevention; linked to the vote, not tracking | Device or other IDs; collected; optional; app functionality/fraud prevention | Sent only when one-device-one-vote is enabled |
| Idempotency request ID | Usually not user data; confirm in final review | Usually not user data; confirm in final review | Random request-scoped identifier preventing duplicate votes |
| Guest management credential | Not collected from the user | Not collected from the user | Server creates it; encrypted on device; server retains only a digest |
| Support email/content | Contact Info and Other User Content if the store treats mail launched from the app as collection | Email address and Other user-generated content if applicable | User chooses whether to send through their mail provider |
| Sentry crash diagnostics | Omit when disabled; Crash Data/Diagnostics if enabled | Crash logs/Diagnostics if enabled | Disabled unless the exact build opts in |

Provisional global answers:

- Data is encrypted in transit in production.
- No data is used for cross-app tracking or advertising.
- No data is sold.
- The app has no account sign-in in version 1.0.
- Deletion requests are available through the privacy-policy contact; the
  maintainer must verify the actual deletion and backup-retention process.
- Infrastructure processors are service providers, but David must confirm
  contracts and actual practices before answering whether either store treats
  any transfer as sharing.
- Do not declare approximate location unless the service actually infers it
  from IP addresses. Confirm that hosting, security, and analytics systems do
  not do so.
- If Sentry is enabled, redo the matrix against the final SDK configuration
  and a captured sanitized event before submission.

## Graphic assets

The current mobile icon is Expo's default placeholder and must not be
submitted. Existing Ranked Choices website artwork is available, but the
maintainer must approve a square, legible adaptation before it replaces the
placeholder.

Required production assets include:

- a 1024×1024 iOS icon with no unintended transparency;
- a 512×512 Play Store icon, maximum 1024 KB;
- Android adaptive foreground, background, and monochrome layers; and
- a 1024×500 Play feature graphic in JPEG or 24-bit PNG without alpha.

The Play feature graphic should extend the existing brand without duplicating
the icon, device imagery, or store badges. All source and export files should
be reviewed at small display sizes before submission.

## Remaining confirmations

The following are intentionally not guessed:

- Apple account type and signing workflow;
- David-owned Expo organization name and membership;
- exact public developer/seller name and copyright owner;
- final availability and category selections;
- branded icon/feature-graphic approval;
- production moderation owner and response process;
- App Store privacy and Play Data safety interpretations noted above;
- export-compliance answer for the final binary; and
- final manual/phased release settings.

Account invitations, Team ID, Play signing fingerprint, production deployment,
and association-file publication remain governed by
docs/mobile-release-checklist.md.

## Store references

- [Apple metadata fields and limits](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple App Privacy details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play store-listing requirements](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Google Play graphic-asset requirements](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Google Play user-generated-content policy](https://support.google.com/googleplay/android-developer/answer/9876937)
- [Google Play Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469)
