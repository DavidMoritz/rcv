<?php

require_once __DIR__ . '/ApiTestCase.php';

class DeleteCodeTest extends ApiTestCase
{
    public function testDeletesUnusedCode(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'abc123');

        $result = $this->callApi('delete-code.php', [
            'ballotId'  => $ballotId,
            'code'      => 'abc123',
            'createdBy' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['success']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballot_codes WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('delete-code.php', ['code' => 'abc123', 'createdBy' => 'alice']);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresCode(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('delete-code.php', ['ballotId' => $ballotId, 'createdBy' => 'alice']);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('code', $result['body']['errors']);
    }

    public function testRequiresCreatedBy(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('delete-code.php', ['ballotId' => $ballotId, 'code' => 'abc123']);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }

    public function testRejectsUnauthorizedUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'mycode');

        $result = $this->callApi('delete-code.php', [
            'ballotId'  => $ballotId,
            'code'      => 'mycode',
            'createdBy' => 'bob',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }

    public function testRefusesToDeleteUsedCode(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'usedcode');
        $this->seedVote($ballotId, '1,2', '', 'usedcode');

        $result = $this->callApi('delete-code.php', [
            'ballotId'  => $ballotId,
            'code'      => 'usedcode',
            'createdBy' => 'alice',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('voted', $result['body']['errors']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballot_codes WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), 'Used code should not be deleted');
    }

    public function testDoesNotDeleteRandomCodeRecord(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'keepme');

        $this->callApi('delete-code.php', [
            'ballotId'  => $ballotId,
            'code'      => 'keepme',
            'createdBy' => 'alice',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM random_codes WHERE code = 'keepme'");
        $sth->execute();
        $this->assertEquals(1, (int) $sth->fetchColumn(), 'random_codes row should be preserved');
    }
}
