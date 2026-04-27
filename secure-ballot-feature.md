# Secure Ballot Feature

## Overview

Secure ballots are a distinct ballot classification on RankedChoices.com that provide built-in tools for running verified, anonymous elections. Instead of requiring organizers to manually generate and distribute codes (as described in the current secure-elections-instructions.html), the system handles code generation, validation, and tracking.

## User Discovery

### Profile Page
- The "Current Ballots" header becomes two large tabs: **Standard Ballots** and **Secure Ballots**
- Each tab shows only ballots of that type
- This is the primary way existing users discover the feature
- **Secure Ballots tab** shows a simple list of the user's secure ballots, each linking to the dedicated Secure Ballot management page

### Create Ballot Page (Advanced Options)
- Guest users see a tease: "Want a secure ballot? [Create a free account](/register)"
- Logged-in users get the option to create a secure ballot (exact UI TBD)

## Secure Ballot Management Page (New UX)

A dedicated page/view for managing a single secure ballot. This is a separate experience from the standard ballot management — the owner reaches it by clicking a secure ballot from their profile.

### Features:
- **Code list**: All assigned codes with status (used/unused)
- **Vote timestamps**: When each code was used to vote
- **Labels**: Optional owner-assigned labels per code (for open/blind elections)
- **Current results**: Live results display for the ballot
- **Remove votes**: Owner can delete individual votes (frees the code for re-use automatically, since usage is determined by whether a vote with that code exists in the `votes` table)
- **Request more codes**: Generate and assign additional codes after initial creation
- **Printable code sheet**: Generate a print-ready page (see below)

## Secure Ballot Constraints

Secure ballots are a restricted classification. Certain settings are locked:

| Setting | Requirement |
|---------|------------|
| Tie-breaker | MUST be "random" |
| Custom candidate contributions | NOT allowed |
| Vote cutoff | MUST have one set |
| Voter codes | System-generated, required to vote |

*TODO: Identify other settings that should be locked or forced for secure ballots*

## Voter Code System

### Code Source
- Uses the existing `random_codes` table (30k pre-generated 6-char alphanumeric codes)
- Codes exclude 1, I, O, 0 for readability
- Same code can be assigned to multiple ballots (validated per-ballot)

### Code Assignment
- Ballot owner requests N codes when creating/editing a secure ballot
- System picks N codes from `random_codes` and inserts rows into `ballot_codes` join table
- Owner can request additional codes later from the management page

### Code Labels (Optional)
- Owner can optionally label codes for their own tracking
- Labels are never shown to voters or in results
- Useful for open/blind elections where the owner needs to know who received which code

### Code Lifecycle
- One-time use: each code can only be used to cast one vote
- A code is "used" if a vote exists in `votes` with that code as `name` for that `ballotId`
- If the owner deletes a vote, the code becomes unused again automatically — the original voter can re-enter their code and vote fresh
- No extra columns needed for tracking usage; the `votes` table is the source of truth

## Voting Flow for Secure Ballots

1. Voter navigates to the ballot's voting URL
2. Instead of seeing candidates immediately, voter is prompted to **enter their code**
3. System validates the code:
   - Look up code in `random_codes` table to get `id`
   - Check `ballot_codes` for matching `random_code_id` + `ballot_id`
   - Check `votes` for existing vote with that code as `name` for that `ballotId`
   - Code not assigned to this ballot → "This code is not valid"
   - Code already used (vote exists) → "This code is not valid"
   - Code valid and unused → Show candidates, proceed to vote
4. On vote submission, the code is stored as `name` in the `votes` table
5. Generic error message intentionally does not reveal whether code doesn't exist vs already used

## Printable Code Sheet

- Owner can generate a printable page with codes in a grid layout
- Includes cut lines (dotted borders) for easy separation
- Instructions printed at top: "Cut along the dotted lines, fold, and distribute randomly"
- Each code slip is identical in size/appearance so they can't be identified by position
- Enables double-blind distribution: owner doesn't know who got which code

## Election Types Supported

### Open Election (with codes)
- Owner labels codes with voter names before distributing
- Owner knows which code belongs to which voter
- Can verify votes match assigned voters

### Blind Election
- Owner distributes labeled codes but hides voter names in results
- Owner can verify legitimacy but voters can't see each other's votes

### Double-Blind Election
- Codes are printed and randomly distributed (physical cut-and-draw)
- Owner cannot trace a code back to a voter
- Voter keeps their code secret
- Owner can still verify all votes used legitimate codes

## Database Schema

### `ballots` table
- Add `isSecure` column (tinyint, default 0)
- When `isSecure = 1`, the app enforces secure ballot constraints automatically

### `ballot_codes` table (new)
```sql
CREATE TABLE ballot_codes (
  ballot_id INT NOT NULL,
  random_code_id INT NOT NULL,
  label VARCHAR(256) DEFAULT '',
  PRIMARY KEY (ballot_id, random_code_id),
  KEY random_code_idx (random_code_id)
);
```
- Links ballots to their assigned codes from the existing `random_codes` table
- `label` — optional owner-only label (never shown to voters)
- No `used_at` needed — usage is determined by checking the `votes` table

### `random_codes` table (existing, no changes)
- 30k pre-generated 6-char alphanumeric codes (excludes 1, I, O, 0 for readability)
- Each has a unique `id` used as `random_code_id` in the join table

### `votes` table (no schema changes)
- The voter's code is stored in the existing `name` column
- Usage check: `SELECT ... FROM votes WHERE ballotId = :ballotId AND name = :code`

## Implementation Phases (Suggested)

### Phase 1: Database & API Foundation
- Add `isSecure` column to `ballots` table
- Create `ballot_codes` table
- API: create secure ballot, assign codes, validate code, get codes with status

### Phase 2: Voter Experience
- Code entry gate on the voting page for secure ballots
- Code validation before showing candidates

### Phase 3: Owner Management Page
- Dedicated secure ballot management view
- Code list with used/unused status, labels, timestamps
- Remove votes, request more codes

### Phase 4: Profile Page Tabs
- Standard Ballots / Secure Ballots tabs
- Secure ballot creation flow for logged-in users
- Guest tease in advanced options

### Phase 5: Printable Code Sheet
- Print-ready layout with cut lines
- Instructions for double-blind distribution

## Open Questions

- Can a voter change their vote using the same code? (Currently: no, they'd need the owner to delete the vote first)
- Should there be a maximum number of codes per ballot?
- Should codes expire independently of the vote cutoff?
- What happens if an owner needs to invalidate a specific code (without deleting a vote)?
- Should the secure ballot creation be a separate flow or a toggle within the existing create page?
- How to handle code exhaustion if all 30k codes are eventually assigned?
