<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetBallotCodesTest extends ApiTestCase
{
    public function testReturnsCodesForBallot(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'aaa111');
        $this->seedVoterCode($ballotId, 'bbb222');

        $result = $this->callApi('get-ballot-codes.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('codes', $result['body']);
        $this->assertCount(2, $result['body']['codes']);
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('get-ballot-codes.php', ['createdBy' => 'alice']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresCreatedBy(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('get-ballot-codes.php', ['ballotId' => $ballotId]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }

    public function testRejectsUnauthorizedUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'xyz999');

        $result = $this->callApi('get-ballot-codes.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'bob',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }

    public function testShowsNullVotedAtForUnusedCode(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'unused1');

        $result = $this->callApi('get-ballot-codes.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
        ]);

        $this->assertNull($result['body']['codes'][0]['votedAt'], 'Unused code should have null votedAt');
        $this->assertNull($result['body']['codes'][0]['voteId'],  'Unused code should have null voteId');
    }

    public function testShowsVotedAtForUsedCode(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'used001');
        // Simulate usage: vote stored with the code as the voter name
        $this->seedVote($ballotId, '1,2', '', 'used001');

        $result = $this->callApi('get-ballot-codes.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
        ]);

        $this->assertNotNull($result['body']['codes'][0]['votedAt'], 'Used code should have a votedAt timestamp');
        $this->assertNotNull($result['body']['codes'][0]['voteId'],  'Used code should have a voteId');
    }
}
