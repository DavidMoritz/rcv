<?php

require_once __DIR__ . '/ApiTestCase.php';

class CheckGraphStatusTest extends ApiTestCase
{
    public function testReturnsCorrectVotesSinceUpdateCount(): void
    {
        $ballotKey = 'graph-test-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'          => $ballotKey,
            'showGraph'    => 1,
            'graphUpdated' => '2025-01-01 00:00:00',
        ]);

        // Seed votes after graphUpdated
        $this->seedVote($ballotId, '1,2', '[1,2]', 'voter1');
        $this->seedVote($ballotId, '2,1', '[2,1]', 'voter2');

        $result = $this->callApi('check-graph-status.php', [], ['key' => $ballotKey]);

        $this->assertIsArray($result['body']);
        $this->assertEquals(2, $result['body']['data']['votesSinceUpdate']);
        $this->assertTrue($result['body']['data']['isStale']);
    }

    public function testReturnsZeroWhenGraphIsCurrent(): void
    {
        $ballotKey = 'graph-current-' . uniqid();
        // Set graphUpdated to far future so no votes are "since update"
        $ballotId = $this->seedBallot([
            'key'          => $ballotKey,
            'showGraph'    => 1,
            'graphUpdated' => '2099-12-31 23:59:59',
        ]);

        $this->seedVote($ballotId, '1,2', '[1,2]', 'voter1');

        $result = $this->callApi('check-graph-status.php', [], ['key' => $ballotKey]);

        $this->assertIsArray($result['body']);
        $this->assertEquals(0, $result['body']['data']['votesSinceUpdate']);
        $this->assertFalse($result['body']['data']['isStale']);
    }

    public function testHandlesNullGraphUpdated(): void
    {
        $ballotKey = 'graph-null-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'          => $ballotKey,
            'showGraph'    => 1,
            'graphUpdated' => null,
        ]);

        $this->seedVote($ballotId, '1,2', '[1,2]', 'voter1');

        $result = $this->callApi('check-graph-status.php', [], ['key' => $ballotKey]);

        $this->assertIsArray($result['body']);
        // All votes should be counted when graphUpdated is null
        $this->assertEquals(1, $result['body']['data']['votesSinceUpdate']);
        $this->assertTrue($result['body']['data']['isStale']);
        $this->assertNull($result['body']['data']['graphUpdated']);
        $this->assertNull($result['body']['data']['minutesSinceUpdate']);
    }

    public function testRequiresBallotKey(): void
    {
        $result = $this->callApi('check-graph-status.php', [], ['key' => '']);

        $this->assertIsArray($result['body']);
        $this->assertNotEmpty($result['body']['errors']);
    }
}
