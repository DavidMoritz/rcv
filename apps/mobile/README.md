# Ranked Choices mobile

Isolated Expo SDK 57 and TypeScript scaffold for the Ranked Choices migration.
The app currently proves routing, responsive layout, and local development
tooling. PHP connectivity and ballot rendering are layered in the next stacked
PR.

## Get started

```bash
npm install
npm start
```

The terminal provides shortcuts for iOS, Android, and web.

## Checks

```bash
npm test
npm run typecheck
npm run lint
```

## Current scope

- Expo Router and TypeScript scaffold
- shortcode lookup and dynamic ballot route
- responsive native/web layout
- unit-test, typecheck, lint, and static-export commands

Voting, API integration, authentication, production deployment, and domain
association files are intentionally deferred.
