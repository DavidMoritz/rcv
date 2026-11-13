# Cryptographic Verifiability — Internal Design Notes

These notes capture the technical reasoning behind the "Cryptographic Verifiability"
paragraph in the Phase 3 section of the Santa Monica proposal. Not for public
distribution — reference material for implementation planning.

## The Core Problem

We need three properties simultaneously:

1. **Individual verifiability** — a voter can confirm their vote was counted
2. **Universal verifiability** — anyone can confirm the tally is correct
3. **Ballot secrecy** — no one can prove how any individual voted

These are in tension. If the voter can cryptographically prove their vote was
counted *and* see its contents, they can prove how they voted (enabling coercion
and vote buying). If they can't verify at all, they're trusting the system blindly.

## Why Simple Hashing Isn't Enough

We explored several hash-based approaches and found they all break down:

- **Hash of rankings**: two identical rankings produce the same hash → privacy leak
- **Hash of rankings + nonce, nonce on receipt**: voter can match their nonce to a
  published vote entry → proves which vote is theirs → breaks secrecy
- **Hash of rankings + nonce, nonce NOT on receipt**: voter can't independently
  verify; auditor can't recompute hashes from published rankings → no verifiability
- **Hash only, verify by recognition**: voter recognizes their rankings in a batch
  but can't prove the link. Works for trust but not for cryptographic verifiability.

## The Breakthrough: Batch-Level Hashing (Phase 2 Model)

Instead of hashing individual votes, hash the **entire batch** of rankings together:

- `batch_hash = SHA-256(all rankings in batch, concatenated in published order)`
- The batch hash (not individual vote hashes) goes into the Merkle tree → blockchain
- No individual vote has its own hash → nothing to link to a specific voter
- Voter verification: recognize your rankings in the batch + recompute batch hash
  → confirms batch is intact
- Auditor verification: download all batches, recompute every batch hash, verify
  against Merkle tree → confirms entire election is intact
- Vote count integrity: total votes across all batches must equal total issued
  code hashes (codes stored as hashes, counted but not reversible)

**This eliminates the per-vote hash problem entirely.** The unit of cryptographic
verification is the batch, not the individual vote. Combined with recognition-based
individual verification, this provides strong integrity guarantees without any
per-voter receipt that could enable coercion.

### Code Storage: Hash-Only Model

Voter codes are never stored in plaintext:

1. Poll worker presses "Issue Code"
2. System generates random 6-character code
3. System stores `SHA-256(code)` in the database — never the plaintext
4. Plaintext prints on the card with QR — the only place it exists
5. Voter submits: system hashes the submitted code, matches against stored hash
6. Even a database administrator cannot see or intercept usable codes

This is standard password hashing applied to voter codes. The plaintext exists only
on the physical card in the voter's hand and briefly in server memory during
generation and validation.

## Phase 3 Enhancement: Verifiable Mixnets

For Phase 3 (binding elections), the established approach is a **verifiable mixnet**:

### How It Works

1. Voter submits an **encrypted ballot** (ElGamal encryption over the ranking)
2. Voter receives a receipt = hash of their encrypted ballot
3. All encrypted ballots are posted to a **public bulletin board**
4. The encrypted ballots pass through **multiple independent mix servers** (e.g., 3-5,
   operated by different parties: city IT, county registrar, civic watchdog, political
   party representatives)
5. Each mix server:
   - Receives the batch of encrypted ballots
   - Randomly permutes (shuffles) the order
   - Re-encrypts each ballot (so the ciphertext changes but the plaintext is preserved)
   - Publishes a **zero-knowledge proof** that it shuffled correctly (i.e., the output
     is a valid permutation of the input, with no additions, deletions, or alterations)
   - Passes the shuffled, re-encrypted batch to the next server
6. After the final mix server, the ballots are **jointly decrypted** using threshold
   decryption (e.g., any 3 of 5 key holders must participate)
7. Output: **plaintext rankings in random order**, with no mapping to voters
8. RCV tabulation runs on the plaintext rankings (standard instant-runoff or STV)
9. Anyone can:
   - Verify every mix server's ZK proof
   - Verify the threshold decryption
   - Recompute the RCV tally from the published plaintext rankings

### Why This Preserves Both Properties

**Verifiability:**
- Voter checks: "Is my encrypted ballot on the bulletin board?" (yes → it entered the mix)
- Auditor checks: "Did each mix server shuffle correctly?" (ZK proofs → yes)
- Auditor checks: "Was decryption done correctly?" (threshold proof → yes)
- Auditor checks: "Does the tally match the decrypted rankings?" (recompute → yes)

**Secrecy:**
- The mix servers destroy the mapping between encrypted input and decrypted output
- Even if the voter cooperates fully, they can only point to their encrypted ballot
- Tracing it through the mix requires breaking ALL mix servers' ZK proofs
- Collusion of all-but-one mix servers is still not enough if one server is honest

### Why Mixnets (Not Homomorphic) for RCV

Homomorphic encryption (e.g., Paillier, ElGamal) supports addition on ciphertexts:
`Encrypt(a) * Encrypt(b) = Encrypt(a + b)`. This works for simple plurality (sum
votes per candidate) but RCV needs the **full ranking** to perform elimination rounds.
You can't do instant-runoff with just additive homomorphism.

Mixnets decrypt the complete ranking while severing the voter link — exactly what
RCV requires.

## Existing Implementations

- **Verificatum** — open-source mixnet library, used in real elections (Norway, Estonia).
  Java-based. Implements Terelius-Wikström mixnet with Fiat-Shamir ZK proofs.
  https://www.verificatum.org

- **ElectionGuard** (Microsoft) — open-source SDK for E2E verifiable elections. Uses
  exponential ElGamal with homomorphic tallying. Better suited for plurality/approval
  voting than RCV, but the encryption and bulletin board components are reusable.
  https://github.com/microsoft/electionguard

- **Helios** — open-source web-based E2E verifiable voting system. Uses ElGamal
  encryption with mixnet or homomorphic tallying. Used for IACR elections, university
  elections. Python-based. https://heliosvoting.org

- **Belenios** — successor to Helios with stronger coercion resistance. Used in French
  institutional elections. https://www.belenios.org

## Integration with Current Proposal Architecture

The Phase 2 design (batch-based, recognition verification) doesn't need to be thrown
away. It becomes the **user-facing layer**:

- Voters still see batches, still get a receipt hash, still recognize their rankings
- Under the hood, the receipt hash is the hash of their encrypted ballot
- The mix/decrypt/tally pipeline runs after voting closes
- The published batch vote lists come from the mixnet output (already shuffled)
- The "recognition" experience is preserved — it's just now backed by math

### Key Management Ceremony

The threshold decryption keys would be generated in a public ceremony:

1. N trustees (e.g., 5) each generate a key share
2. The public key is combined from all shares
3. Decryption requires K-of-N shares (e.g., 3-of-5)
4. Trustees should be adversarial to each other (different parties, departments, orgs)
5. Key generation ceremony should be public and recorded

### Ballot Challenge Protocol (Optional, from ElectionGuard)

To prove the system is encrypting honestly (not substituting votes):

1. Voter encrypts their ballot
2. Before casting, they can choose to **challenge** (spoil) the ballot
3. The system decrypts and reveals the challenged ballot — voter confirms it matches
4. The challenged ballot is discarded (not counted)
5. Voter encrypts a new ballot and casts it for real
6. A voter who challenges builds confidence that the system encrypts honestly
7. A coercer can't use this to verify — the voter always has the option to challenge
   and re-vote

## Realistic Assessment

**What's proven and available:** The cryptographic primitives, mixnet protocols, and
ZK proof systems are mature. Real elections have used them. Open-source code exists.

**What's hard:** Key management ceremonies, integration with existing election
infrastructure, usability for non-technical voters, performance at scale (ZK proofs
are computationally expensive), and meeting specific California certification
requirements.

**What's unknown:** Whether California's Secretary of State would certify a system
using these techniques. No California municipality has done this yet. The legal
framework may need to catch up with the technology.

**Estimated additional effort for Phase 3:** 200-400 hours beyond current Phase 3
estimate, depending on library selection and certification requirements. This should
be scoped as a sub-phase once Phase 2 is complete and the city signals intent to
proceed with binding elections.

## Design Decisions Still Open

- [ ] Mixnet library selection (Verificatum vs. custom implementation)
- [ ] Number and identity of mix server operators
- [ ] Threshold parameters (K-of-N)
- [ ] Whether to implement ballot challenge protocol
- [ ] Performance testing with realistic ballot sizes (12+ candidates, 90K voters)
- [ ] How to handle mail-in paper ballots in the E2E framework
- [ ] Ceremony logistics and public transparency requirements
