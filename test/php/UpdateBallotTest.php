<?php

require_once __DIR__ . '/ApiTestCase.php';

class UpdateBallotTest extends ApiTestCase
{
    private function validUpdateData(int $ballotId, array $overrides = []): array
    {
        return array_merge([
            'id'                => $ballotId,
            'key'               => 'updated-key-' . $ballotId,
            'name'              => 'Updated Name',
            'positions'         => '2',
            'createdBy'         => 'alice',
            'sqlVoteCutoff'     => '2099-12-31 23:59:59',
            'sqlResultsRelease' => '2099-12-31 23:59:59',
        ], $overrides);
    }

    public function testUpdatesBallotFields(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice', 'name' => 'Old Name', 'positions' => '1']);

        $this->callApi('update-ballot.php', $this->validUpdateData($ballotId));

        $sth = $this->db->prepare("SELECT name, positions FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals('Updated Name', $row['name']);
        $this->assertEquals('2', $row['positions']);
    }

    public function testSuccessReturnsJson(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('update-ballot.php', $this->validUpdateData($ballotId));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('data', $result['body']);
        $this->assertTrue($result['body']['data']['success']);
    }

    public function testMissingNameReturnsError(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('update-ballot.php', $this->validUpdateData($ballotId, ['name' => '']));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('name', $result['body']['errors']);
    }

    public function testMissingPositionsReturnsError(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('update-ballot.php', $this->validUpdateData($ballotId, ['positions' => '']));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('positions', $result['body']['errors']);
    }

    public function testPositionsBelowOneReturnsError(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('update-ballot.php', $this->validUpdateData($ballotId, ['positions' => '0']));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('positions', $result['body']['errors']);
    }

    public function testMissingCreatedByReturnsError(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('update-ballot.php', $this->validUpdateData($ballotId, ['createdBy' => '']));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }

    public function testDoesNotUpdateBallotBelongingToOtherUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice', 'name' => 'Original Name']);

        $this->callApi('update-ballot.php', $this->validUpdateData($ballotId, ['createdBy' => 'bob']));

        $sth = $this->db->prepare("SELECT name FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals('Original Name', $row['name'], "Ballot should not be updated by a non-owner");
    }

    public function testUpdatesOptionalBooleanFields(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $this->callApi('update-ballot.php', $this->validUpdateData($ballotId, [
            'hideNames'        => 1,
            'oneDeviceOneVote' => 1,
            'isSecure'         => 1,
            'allowCustom'      => 1,
        ]));

        $sth = $this->db->prepare("SELECT hideNames, oneDeviceOneVote, isSecure, allowCustom FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals(1, (int) $row['hideNames']);
        $this->assertEquals(1, (int) $row['oneDeviceOneVote']);
        $this->assertEquals(1, (int) $row['isSecure']);
        $this->assertEquals(1, (int) $row['allowCustom']);
    }
}
