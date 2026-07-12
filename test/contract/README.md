# Live API Contract Tests

These tests hit a real PHP dev server and real MySQL-backed API to catch
contract drift between the isolated PHPUnit SQLite coverage and the live local
stack.

## Run

1. Start the PHP backend:

   ```bash
   cd src
   php -S localhost:2461
   ```

2. In another terminal, run:

   ```bash
   npm run test:api-contract
   ```

If your server is on a different URL, set `RCV_API_BASE_URL`, for example:

```bash
RCV_API_BASE_URL=http://127.0.0.1:3001/api npm run test:api-contract
```

## Scope

The suite currently verifies a small but high-signal flow:

- `new-ballot.php` success and validation errors
- `add-entries.php` success
- `get-candidates.php` success and missing-key plain-text error
- `vote.php` success and validation error envelope
- `get-votes.php` success after casting a real vote

Each test run creates a unique ballot through the public API and then attempts
to delete its votes and ballot during cleanup.
