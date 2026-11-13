<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetStatsTest extends ApiTestCase
{
    /** Bulk-insert rows for speed. */
    private function bulkSeedBallots(int $count, ?string $timeCreated = null): void
    {
        $time = $timeCreated ?? date('Y-m-d H:i:s');
        for ($i = 0; $i < $count; $i++) {
            $key = 'bulk-' . uniqid() . $i;
            $this->db->exec("INSERT INTO ballots (name, `key`, timeCreated, createdBy) VALUES ('B', '$key', '$time', 'test')");
        }
    }

    private function bulkSeedUsers(int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $id = random_int(1, 2000000000);
            $un = 'u' . uniqid() . $i;
            $this->db->exec("INSERT INTO users (id, username, password) VALUES ($id, '$un', 'x')");
        }
    }

    private function bulkSeedVotes(int $ballotId, int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            $this->db->exec("INSERT INTO votes (ballotId, vote, voteIds, ipAddress, name, fingerprint) VALUES ($ballotId, 'A>B', '1>2', '127.0.0.1', 'v$i', '')");
        }
    }

    public function testReturnsStatsWithEmptyDatabase(): void
    {
        $result = $this->callApi('get-stats.php');

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('data', $result['body']);

        $data = $result['body']['data'];
        $this->assertEquals('0+', $data['accounts']);
        $this->assertEquals('0+', $data['ballots']);
        $this->assertEquals('0+', $data['votes']);
        $this->assertArrayHasKey('year', $data);
        $this->assertIsInt($data['year']);
    }

    public function testCountsAndRoundsCorrectly(): void
    {
        $this->bulkSeedUsers(150);
        $this->bulkSeedBallots(250);
        $bid = $this->seedBallot();
        $this->bulkSeedVotes($bid, 350);

        $result = $this->callApi('get-stats.php');
        $data = $result['body']['data'];

        // 150 users → floor(150/100)*100 = 100 → "100+"
        $this->assertEquals('100+', $data['accounts']);
        // 251 ballots → floor(251/100)*100 = 200 → "200+"
        $this->assertEquals('200+', $data['ballots']);
        // 350 votes → floor(350/100)*100 = 300 → "300+"
        $this->assertEquals('300+', $data['votes']);
    }

    public function testFloorRoundingThousands(): void
    {
        $bid = $this->seedBallot();
        $this->bulkSeedVotes($bid, 1500);

        $result = $this->callApi('get-stats.php');
        $data = $result['body']['data'];

        // 1500 → floor(1500/1000)*1000 = 1000 → "1,000+"
        $this->assertEquals('1,000+', $data['votes']);
    }

    public function testCacheIsCreated(): void
    {
        $this->seedBallot();
        $this->callApi('get-stats.php');

        $sth = $this->db->prepare("SELECT value, updated FROM cached_info WHERE `key` = 'about_stats'");
        $sth->execute();
        $row = $sth->fetch(PDO::FETCH_ASSOC);

        $this->assertNotFalse($row);
        $this->assertNotEmpty($row['value']);
        $this->assertNotEmpty($row['updated']);

        $cached = json_decode($row['value'], true);
        $this->assertArrayHasKey('accounts', $cached);
        $this->assertArrayHasKey('ballots', $cached);
        $this->assertArrayHasKey('votes', $cached);
    }

    public function testCacheIsUsedOnSecondCall(): void
    {
        // Seed enough to get a non-zero rounded value
        $this->bulkSeedBallots(150);
        $result1 = $this->callApi('get-stats.php');
        $ballotsBefore = $result1['body']['data']['ballots'];

        // Add more data after cache
        $this->bulkSeedBallots(500);

        // Second call should return cached value
        $result2 = $this->callApi('get-stats.php');
        $this->assertEquals($ballotsBefore, $result2['body']['data']['ballots']);
    }

    public function testExpiredCacheIsRefreshed(): void
    {
        $this->bulkSeedBallots(150);
        $result1 = $this->callApi('get-stats.php');
        $this->assertEquals('100+', $result1['body']['data']['ballots']);

        // Expire cache
        $this->db->exec("UPDATE cached_info SET updated = '2020-01-01 00:00:00' WHERE `key` = 'about_stats'");

        // Add more ballots to push past 1,000
        $this->bulkSeedBallots(900);

        $result2 = $this->callApi('get-stats.php');
        // 1050 ballots → floor(1050/1000)*1000 = 1000 → "1,000+"
        $this->assertEquals('1,000+', $result2['body']['data']['ballots']);
    }

    public function testYearIsReasonable(): void
    {
        $result = $this->callApi('get-stats.php');
        $data = $result['body']['data'];

        $currentYear = (int) date('Y');
        $this->assertGreaterThanOrEqual($currentYear - 1, $data['year']);
        $this->assertLessThanOrEqual($currentYear, $data['year']);
    }

    public function testYearStatsCountCorrectly(): void
    {
        $currentYear = (int) gmdate('Y');
        $month = (int) gmdate('n');
        $statsYear = $month >= 10 ? $currentYear : $currentYear - 1;

        // 150 ballots in the stats year
        $this->bulkSeedBallots(150, "$statsYear-06-15 12:00:00");
        // 50 ballots outside the stats year
        $this->bulkSeedBallots(50, ($statsYear - 2) . "-01-01 12:00:00");

        $result = $this->callApi('get-stats.php');
        $data = $result['body']['data'];

        $this->assertEquals($statsYear, $data['year']);
        // 150 in year → "100+"; 200 total → "200+"
        $this->assertEquals('100+', $data['yearBallots']);
        $this->assertEquals('200+', $data['ballots']);
    }

    public function testResponseShape(): void
    {
        $result = $this->callApi('get-stats.php');
        $data = $result['body']['data'];

        $expectedKeys = ['accounts', 'ballots', 'votes', 'year', 'yearBallots', 'yearVotes', 'yearAccounts'];
        foreach ($expectedKeys as $key) {
            $this->assertArrayHasKey($key, $data, "Missing key: $key");
        }

        foreach (['accounts', 'ballots', 'votes', 'yearBallots', 'yearVotes', 'yearAccounts'] as $key) {
            $this->assertStringEndsWith('+', $data[$key], "$key should end with +");
        }
    }
}
