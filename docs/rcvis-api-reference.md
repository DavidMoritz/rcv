# RCVis REST API Reference

> Source: [github.com/artoonie/rcvis](https://github.com/artoonie/rcvis) — Django REST Framework application

## Authentication

Two methods supported:
1. **Token Authentication**: `Authorization: Token <40-char-token>`
2. **Session Authentication** (browser-based)

**Obtain a token:**
```
POST /api/auth/get-token
Content-Type: application/json
{"username": "<username>", "password": "<password>"}
```

**Requirements:**
- User must have `canUseApi = True` on their profile
- Rate limits: 10 req/hr anonymous, 1000 req/hr authenticated
- Pagination: page size 10

## Visualization Endpoints

Three endpoints with identical CRUD operations but different serializers:

| Endpoint | Use Case |
|----------|----------|
| `/api/visualizations/` | Simple — minimal fields |
| `/api/verbose/` | Full config — all display options |
| `/api/bp/` | Ballotpedia-specific field naming |

### Operations (all three endpoints)

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/visualizations/` | List all (paginated) |
| `POST` | `/api/visualizations/` | Create new visualization |
| `GET` | `/api/visualizations/{id}/` | Get single visualization |
| `PUT` | `/api/visualizations/{id}/` | Full update |
| `PATCH` | `/api/visualizations/{id}/` | Partial update |
| `DELETE` | `/api/visualizations/{id}/` | Delete visualization |

### Fields

**Simple (`/api/visualizations/`):**
- Writable: `jsonFile`
- Read-only: `slug`, `id`, `numRounds`, `numCandidates`, `title`
- Computed: `visualizeUrl`, `embedUrl`, `embedSankeyUrl`, `embedTableUrl`, `embedPieUrl`, `oembedEndpointUrl`

**Verbose (`/api/verbose/`) additional writable fields:**
`candidateSidecarFile`, `showRoundNumbersOnSankey`, `onlyShowWinnersTabular`, `isPreferentialBlock`, `forceFirstRoundDeterminesPercentages`, `hideSankey`, `hidePie`, `hideTabular`, `doDimPrevRoundColors`, `excludeFinalWinnerAndEliminatedCandidate`, `hideDecimals`, `colorTheme`, `eliminationBarColor`, `dataSourceURL`, `areResultsCertified`, `textForWinner`, `customText`

**Ballotpedia (`/api/bp/`):**
- `resultsSummaryFile` (instead of `jsonFile`)
- `isPrimary` (maps to `textForWinner`)

### Permissions

- **Read**: Owner or admin
- **Write/Delete**: Owner only

## Other Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/users/` | List users (admin only) |
| `GET` | `/api/users/{id}/` | Get user (admin only) |
| `GET/POST` | `/api/auth/login/` | Browsable API login |

## Embed URLs

| URL | Description |
|-----|-------------|
| `/v/{slug}` | Full visualization page |
| `/ve/{slug}` | Embedded iframe view |
| `/ve/{slug}?vistype=barchart-interactive` | Embedded with specific chart type |
| `/raw/{slug}` | Download raw data |

## Example: Delete a Visualization

```bash
curl -X DELETE "https://www.rcvis.com/api/visualizations/{id}/" \
     -H "Authorization: Token <your-api-token>"
# Returns HTTP 204 No Content on success
```
