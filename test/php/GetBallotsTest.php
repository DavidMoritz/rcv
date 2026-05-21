<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetBallotsTest extends ApiTestCase
{
    public function testReturnsBallotsForUser(): void
    {
        $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-a1', 'name' => 'Alpha']);
        $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-a2', 'name' => 'Beta']);

        $result = $this->callApi('get-ballots.php', ['id' => 'alice']);

        $this->assertIsArray($result['body']);
        $this->assertCount(2, $result['body']);
    }

    public function testRequiresCreatedBy(): void
    {
        $result = $this->callApi('get-ballots.php', ['id' => '']);

        $this->assertStringContainsString('failed to supply Created By', $result['raw']);
    }

    public function testRejectsGuestUser(): void
    {
        $result = $this->callApi('get-ballots.php', ['id' => 'guest']);

        $this->assertStringContainsString("'guest' is not a valid entry", $result['raw']);
    }

    public function testGuestCheckIsCaseInsensitive(): void
    {
        $result = $this->callApi('get-ballots.php', ['id' => 'GUEST']);

        $this->assertStringContainsString("'guest' is not a valid entry", $result['raw']);
    }

    public function testDoesNotReturnOtherUsersBallots(): void
    {
        $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-alice']);
        $this->seedBallot(['createdBy' => 'bob',   'key' => 'ballot-bob']);

        $result = $this->callApi('get-ballots.php', ['id' => 'alice']);

        $this->assertCount(1, $result['body']);
        $this->assertEquals('alice', $result['body'][0]['createdBy']);
    }

    public function testIncludesTotalVotesCount(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-votes']);
        $this->seedVote($ballotId, '1,2');
        $this->seedVote($ballotId, '2,1');

        $result = $this->callApi('get-ballots.php', ['id' => 'alice']);

        $this->assertEquals(2, (int) $result['body'][0]['totalVotes']);
    }

    public function testReturnsBallotsOrderedByIdDescending(): void
    {
        $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-first',  'name' => 'First']);
        $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-second', 'name' => 'Second']);

        $result = $this->callApi('get-ballots.php', ['id' => 'alice']);

        $this->assertEquals('Second', $result['body'][0]['name'], 'Most recently created ballot should come first');
    }

    public function testReturnsEmptyArrayForUserWithNoBallots(): void
    {
        $result = $this->callApi('get-ballots.php', ['id' => 'alice']);

        $this->assertIsArray($result['body']);
        $this->assertCount(0, $result['body']);
    }
}
