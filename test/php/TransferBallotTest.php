<?php

require_once __DIR__ . '/ApiTestCase.php';

class TransferBallotTest extends ApiTestCase
{
    public function testTransfersToBallotToExistingUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedUser(['username' => 'bob']);

        $result = $this->callApi('transfer-ballot.php', [
            'ballotId'        => $ballotId,
            'currentOwnerId'  => 'alice',
            'newOwnerUsername' => 'bob',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);
        $this->assertStringContainsString('bob', $result['body']['data']['message']);

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $newOwner = $sth->fetchColumn();
        $this->assertNotEquals('alice', $newOwner, 'Ownership should have changed');
    }

    public function testTransfersToGuestWhenUsernameNotFound(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('transfer-ballot.php', [
            'ballotId'         => $ballotId,
            'currentOwnerId'   => 'alice',
            'newOwnerUsername' => 'nobody',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);
        $this->assertStringContainsString('guest', $result['body']['data']['message']);

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals('guest', $sth->fetchColumn());
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('transfer-ballot.php', [
            'currentOwnerId'   => 'alice',
            'newOwnerUsername' => 'bob',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresCurrentOwnerId(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('transfer-ballot.php', [
            'ballotId'         => $ballotId,
            'newOwnerUsername' => 'bob',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('currentOwnerId', $result['body']['errors']);
    }

    public function testRequiresNewOwnerUsername(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('transfer-ballot.php', [
            'ballotId'        => $ballotId,
            'currentOwnerId'  => 'alice',
            'newOwnerUsername' => '',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('newOwnerUsername', $result['body']['errors']);
    }

    public function testDoesNotTransferWhenNotCurrentOwner(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('transfer-ballot.php', [
            'ballotId'         => $ballotId,
            'currentOwnerId'   => 'bob',
            'newOwnerUsername' => 'carol',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballot', $result['body']['errors']);

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals('alice', $sth->fetchColumn(), 'Ownership should be unchanged');
    }
}
