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
        $this->assertSame('weighted', $result['body']['data']['ballot']['tieBreak']);
        $this->assertSame($entryIds, array_column($result['body']['data']['candidates'], 'id'));
        $this->assertSame([array_reverse($entryIds)], $result['body']['data']['votes']);
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

    public function testReturnsTypedValidationAndNotFoundErrors(): void
    {
        $missingKey = $this->callApi('v2/results.php');
        $unknownBallot = $this->callApi('v2/results.php', [], ['key' => 'missing']);

        $this->assertSame('validation_failed', $missingKey['body']['error']['code']);
        $this->assertSame('ballot_not_found', $unknownBallot['body']['error']['code']);
    }
}
