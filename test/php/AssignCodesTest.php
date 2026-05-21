<?php

require_once __DIR__ . '/ApiTestCase.php';

class AssignCodesTest extends ApiTestCase
{
    public function testAssignsCodesSuccessfully(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedRandomCode('aaa111');
        $this->seedRandomCode('bbb222');
        $this->seedRandomCode('ccc333');

        $result = $this->callApi('assign-codes.php', [
            'ballotId'  => $ballotId,
            'count'     => 2,
            'createdBy' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('codes', $result['body']);
        $this->assertCount(2, $result['body']['codes']);
        $this->assertEquals(2, $result['body']['count']);
    }

    public function testCodesAreInsertedIntoBallotCodes(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedRandomCode('xyz123');

        $this->callApi('assign-codes.php', [
            'ballotId'  => $ballotId,
            'count'     => 1,
            'createdBy' => 'alice',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballot_codes WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn());
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('assign-codes.php', ['count' => 1, 'createdBy' => 'alice']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresCount(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('assign-codes.php', [
            'ballotId'  => $ballotId,
            'count'     => 0,
            'createdBy' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('count', $result['body']['errors']);
    }

    public function testRequiresCreatedBy(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('assign-codes.php', [
            'ballotId' => $ballotId,
            'count'    => 1,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }

    public function testRejectsUnauthorizedUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedRandomCode('abc123');

        $result = $this->callApi('assign-codes.php', [
            'ballotId'  => $ballotId,
            'count'     => 1,
            'createdBy' => 'bob',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }

    public function testNotEnoughCodesReturnsError(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedRandomCode('onlyone');

        $result = $this->callApi('assign-codes.php', [
            'ballotId'  => $ballotId,
            'count'     => 5,
            'createdBy' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('codes', $result['body']['errors']);
    }
}
