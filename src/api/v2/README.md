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

The vote endpoint accepts anonymous and secure-code ballots:

```json
{
  "key": "ballot-shortcode",
  "requestId": "client_generated_16_to_64_chars",
  "ranking": [42, 17, 23],
  "fingerprint": "optional-installation-identifier",
  "voterCode": "optional-six-character-code",
  "groupAnswers": {
    "7": "19",
    "8": false,
    "9": "optional text answer"
  }
}
```

Candidate names and the ballot ID are derived on the server. A request ID is
scoped to its ballot and can be safely retried with the same ranking and voter
code. Reusing it with a different ranking or code returns
`idempotency_conflict`.

Secure codes are normalized to lowercase, with `0` treated as `o` and `1`
treated as `i`, matching the legacy voting flow. Each assigned code can record
one vote. Missing codes return `secure_code_required`; unassigned or previously
used codes return the deliberately nonspecific `invalid_voter_code` response.

For ballots with grouping enabled, `groupAnswers` is required and keyed by
group-field ID. Select answers contain an option ID, checkbox answers are JSON
booleans, and text answers are strings of at most 1,000 characters. The server
verifies that every field and selected option belongs to the ballot, supplies
`false`/empty defaults for optional answers, and returns
`invalid_group_answers` with field-specific errors when validation fails.
Grouping answers are included in the idempotency hash.

Ballots that require a voter name still return a typed unsupported state for
the anonymous client.

## `GET /api/v2/results.php?key=ballot-shortcode`

Returns the ballot's candidate IDs and anonymous ranked votes for local RCV
calculation. The endpoint enforces `resultsRelease` before returning any vote
data and responds with `results_not_released` while results are private.
