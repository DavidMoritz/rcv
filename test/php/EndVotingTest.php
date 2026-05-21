<?php

require_once __DIR__ . '/ApiTestCase.php';

class EndVotingTest extends ApiTestCase
{
    public function testEndsVotingSuccessfully(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice', 'voteCutoff' => '2099-12-31 23:59:59']);

        $result = $this->callApi('end-voting.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['success']);
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('end-voting.php', ['createdBy' => 'alice']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresCreatedBy(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('end-voting.php', ['ballotId' => $ballotId]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }

    public function testDoesNotEndVotingForOtherUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('end-voting.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'bob',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertFalse($result['body']['success'], 'Non-owner should not be able to end voting');
    }

    public function testSetsVoteCutoffToCurrentTime(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice', 'voteCutoff' => '2099-12-31 23:59:59']);
        $before   = gmdate('Y-m-d H:i:s');

        $this->callApi('end-voting.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
        ]);

        $after = gmdate('Y-m-d H:i:s');

        $sth = $this->db->prepare("SELECT voteCutoff FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $cutoff = $sth->fetchColumn();

        $this->assertGreaterThanOrEqual($before, $cutoff);
        $this->assertLessThanOrEqual($after,  $cutoff);
    }
}
