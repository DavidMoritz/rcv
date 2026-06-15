# Playwright E2E Tests

These tests run against the real Vite app and real PHP API, but use an isolated
MySQL database named `rcv_e2e` by default.

## Commands

```bash
npm run test:e2e
npm run test:e2e:setup-db
npm run test:e2e:teardown-db
```

`npm run test:e2e` drops and recreates the E2E database during global setup and
drops it again during global teardown. Set `E2E_KEEP_DB=1` to leave the database
behind for debugging.

## MySQL Configuration

The setup script connects as a MySQL admin user to create the database and grant
the app user access. Defaults match the local setup docs:

```bash
E2E_DB_ADMIN_USER=root
E2E_DB_ADMIN_PASSWORD=
E2E_DB_ADMIN_HOST=localhost
E2E_DB_ADMIN_PORT=3306
E2E_DB_NAME=rcv_e2e
E2E_DB_USER=rcv_e2e_user
E2E_DB_PASSWORD=rcv_e2e_password
E2E_DB_HOST=localhost
E2E_DB_PORT=3306
```

The PHP server uses an ignored temporary copy of `src/` at `.cache/e2e-php`
with an E2E-only `api/config.php`, so your normal `src/api/config.php` is not
read or modified.
