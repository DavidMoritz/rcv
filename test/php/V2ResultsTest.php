<?php

require_once __DIR__ . '/ApiTestCase.php';

class V2ResultsTest extends ApiTestCase
{
    public function testReturnsReleasedAnonymousElectionData(): void
    {
        $key = 'results-' . uniqid();
        $ballotId = $this->seedBallot([
            'key' => $key,
            'name' => 'Favorite fruit',
            'positions' => 2,
            'tieBreak' => 'weighted',
            'resultsRelease' => '2000-01-01 00:00:00',
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Apple', 'Pear']);
        $this->seedVote($ballotId, '["Pear","Apple"]', implode(',', array_reverse($entryIds)));

        $result = $this->callApi('v2/results.php', [], ['key' => $key]);

        $this->assertNull($result['body']['error']);
        $this->assertSame('Favorite fruit', $result['body']['data']['ballot']['name']);
        $this->assertSame(2, $result['body']['data']['ballot']['positions']);
        $this->assertSame('rcv', $result['body']['data']['ballot']['resultMethod']);
        $this->assertSame('weighted', $result['body']['data']['ballot']['tieBreak']);
        $this->assertSame($entryIds, array_column($result['body']['data']['candidates'], 'id'));
        $this->assertSame([array_reverse($entryIds)], $result['body']['data']['votes']);
    }

    public function testReturnsNormalizedBordaResultMethod(): void
    {
        $key = 'borda-results-' . uniqid();
        $ballotId = $this->seedBallot([
            'key' => $key,
            'bordaActive' => 1,
            'resultsRelease' => '2000-01-01 00:00:00',
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Apple', 'Pear']);
        $this->seedVote($ballotId, '["Apple","Pear"]', implode(',', $entryIds));

        $result = $this->callApi('v2/results.php', [], ['key' => $key]);

        $this->assertNull($result['body']['error']);
        $this->assertSame('borda', $result['body']['data']['ballot']['resultMethod']);
    }

    public function testDoesNotExposeUnreleasedResults(): void
    {
        $key = 'hidden-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key, 'resultsRelease' => '2099-01-01 00:00:00']);
        $entryIds = $this->seedEntries($ballotId, ['Private candidate']);
        $this->seedVote($ballotId, '["Private candidate"]', implode(',', $entryIds));

        $result = $this->callApi('v2/results.php', [], ['key' => $key]);

        $this->assertSame('results_not_released', $result['body']['error']['code']);
        $this->assertNull($result['body']['data']);
    }

    public function testWithdrawnCandidateIncludedInCandidatesButFilteredFromVotes(): void
    {
        $key = 'withdrawn-' . uniqid();
        $ballotId = $this->seedBallot([
            'key' => $key,
            'resultsRelease' => '2000-01-01 00:00:00',
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob', 'Carol']);

        // Withdraw Bob
        $this->db->exec("UPDATE entries SET withdrawnAt = '2024-06-01 00:00:00', withdrawnReason = 'Won president' WHERE entry_id = {$entryIds[1]}");

        // Vote: Alice > Bob > Carol
        $this->seedVote($ballotId, 'Alice,Bob,Carol', implode(',', $entryIds));
        // Vote: Bob > Carol > Alice
        $this->seedVote($ballotId, 'Bob,Carol,Alice', implode(',', [$entryIds[1], $entryIds[2], $entryIds[0]]));

        $result = $this->callApi('v2/results.php', [], ['key' => $key]);

        $this->assertNull($result['body']['error']);
        $data = $result['body']['data'];

        // All 3 candidates should be in the candidates list
        $this->assertCount(3, $data['candidates']);

        // Bob should have withdrawal data
        $bob = $data['candidates'][1];
        $this->assertSame('Bob', $bob['name']);
        $this->assertNotNull($bob['withdrawnAt']);
        $this->assertSame('Won president', $bob['withdrawnReason']);

        // Votes should NOT contain Bob's ID
        foreach ($data['votes'] as $vote) {
            $this->assertNotContains($entryIds[1], $vote, 'Withdrawn candidate ID should be filtered from votes');
        }

        // First vote should be [Alice, Carol], second should be [Carol, Alice]
        $this->assertSame([$entryIds[0], $entryIds[2]], $data['votes'][0]);
        $this->assertSame([$entryIds[2], $entryIds[0]], $data['votes'][1]);
    }

    public function testWithdrawnCandidateFieldsNullWhenNotWithdrawn(): void
    {
        $key = 'not-withdrawn-' . uniqid();
        $ballotId = $this->seedBallot([
            'key' => $key,
            'resultsRelease' => '2000-01-01 00:00:00',
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);
        $this->seedVote($ballotId, 'Alice', implode(',', $entryIds));

        $result = $this->callApi('v2/results.php', [], ['key' => $key]);

        $alice = $result['body']['data']['candidates'][0];
        $this->assertNull($alice['withdrawnAt']);
        $this->assertSame('', $alice['withdrawnReason']);
    }

    public function testReturnsTypedValidationAndNotFoundErrors(): void
    {
        $missingKey = $this->callApi('v2/results.php');
        $unknownBallot = $this->callApi('v2/results.php', [], ['key' => 'missing']);

        $this->assertSame('validation_failed', $missingKey['body']['error']['code']);
        $this->assertSame('ballot_not_found', $unknownBallot['body']['error']['code']);
    }
}
