<?php

require_once __DIR__ . '/ApiTestCase.php';

class NewBallotTest extends ApiTestCase
{
    private function validBallotData(array $overrides = []): array
    {
        return array_merge([
            'name'              => 'Test Election',
            'key'               => 'test-' . uniqid(),
            'positions'         => '1',
            'createdBy'         => 'testuser',
            'sqlVoteCutoff'     => '2099-12-31 23:59:59',
            'sqlResultsRelease' => '2099-12-31 23:59:59',
        ], $overrides);
    }

    public function testCreatesNewBallotAndReturnsId(): void
    {
        $result = $this->callApi('new-ballot.php', $this->validBallotData());

        $this->assertIsNumeric($result['raw']);
        $ballotId = (int) $result['raw'];
        $this->assertGreaterThan(0, $ballotId);

        // Verify in database
        $sth = $this->db->prepare("SELECT name FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals('Test Election', $row['name']);
    }

    public function testMissingNameReturnsError(): void
    {
        $result = $this->callApi('new-ballot.php', $this->validBallotData([
            'name' => '',
        ]));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('name', $result['body']['errors']);
    }

    public function testMissingKeyReturnsError(): void
    {
        $result = $this->callApi('new-ballot.php', $this->validBallotData([
            'key' => '',
        ]));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('key', $result['body']['errors']);
    }

    public function testMissingPositionsReturnsError(): void
    {
        $result = $this->callApi('new-ballot.php', $this->validBallotData([
            'positions' => '',
        ]));

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('positions', $result['body']['errors']);
    }

    public function testSetsOptionalFields(): void
    {
        $data = $this->validBallotData([
            'tieBreak'        => 'weighted',
            'register'        => 2,
            'allowCustom'     => 1,
            'hideNames'       => 1,
            'oneDeviceOneVote' => 1,
        ]);

        $result = $this->callApi('new-ballot.php', $data);

        $ballotId = (int) $result['raw'];
        $sth = $this->db->prepare("SELECT tieBreak, register, allowCustom, hideNames, oneDeviceOneVote FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals('weighted', $row['tieBreak']);
        $this->assertEquals(2, (int) $row['register']);
        $this->assertEquals(1, (int) $row['allowCustom']);
        $this->assertEquals(1, (int) $row['hideNames']);
        $this->assertEquals(1, (int) $row['oneDeviceOneVote']);
    }

    public function testMissingMultipleFieldsReturnsAllErrors(): void
    {
        $result = $this->callApi('new-ballot.php', []);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $errors = $result['body']['errors'];
        $this->assertArrayHasKey('name', $errors);
        $this->assertArrayHasKey('key', $errors);
        $this->assertArrayHasKey('createdBy', $errors);
    }
}
