<?php

require_once __DIR__ . '/ApiTestCase.php';

class ClaimBallotTest extends ApiTestCase
{
    public function testClaimsGuestBallot(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'guest']);
        $userId   = $this->seedUser(['username' => 'alice']);

        $result = $this->callApi('claim-ballot.php', [
            'ballotId' => $ballotId,
            'userId'   => $userId,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals((string) $userId, $sth->fetchColumn());
    }

    public function testFailsWhenBallotAlreadyClaimed(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $userId   = $this->seedUser(['username' => 'bob']);

        $result = $this->callApi('claim-ballot.php', [
            'ballotId' => $ballotId,
            'userId'   => $userId,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('ballot', $result['body']['errors']);

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals('alice', $sth->fetchColumn(), 'Ownership should not change');
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('claim-ballot.php', ['userId' => 1]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresUserId(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'guest']);

        $result = $this->callApi('claim-ballot.php', ['ballotId' => $ballotId]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('userId', $result['body']['errors']);
    }
}
