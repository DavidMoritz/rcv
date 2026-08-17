# API v2

Version 2 endpoints use one JSON envelope for success and failure:

```json
{
  "data": {},
  "error": null
}
```

```json
{
  "data": null,
  "error": {
    "code": "machine_readable_code",
    "message": "Human-readable message"
  }
}
```

## `POST /api/v2/votes.php`

The Phase 1 anonymous-vote endpoint accepts:

```json
{
  "key": "ballot-shortcode",
  "requestId": "client_generated_16_to_64_chars",
  "ranking": [42, 17, 23],
  "fingerprint": "optional-installation-identifier"
}
```

Candidate names and the ballot ID are derived on the server. A request ID is
scoped to its ballot and can be safely retried with the same ranking. Reusing
it with a different ranking returns `idempotency_conflict`.

This endpoint intentionally stops at the Phase 1 anonymous flow. Ballots that
require a voter name, voter code, or grouping answers return typed states for
the client; collecting those values remains Phase 2 work.

## `GET /api/v2/results.php?key=ballot-shortcode`

Returns the ballot's candidate IDs and anonymous ranked votes for local RCV
calculation. The endpoint enforces `resultsRelease` before returning any vote
data and responds with `results_not_released` while results are private.
