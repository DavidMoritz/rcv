<?php

require_once __DIR__ . '/ApiTestCase.php';

class CopyBallotCodesTest extends ApiTestCase
{
    public function testCopiesCodesWithLabels(): void
    {
        $source = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);
        $target = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);

        // Seed codes with labels on the source ballot
        $codeId1 = $this->seedRandomCode('aaa111');
        $codeId2 = $this->seedRandomCode('bbb222');
        $this->db->exec("INSERT INTO ballot_codes (ballot_id, random_code_id, label) VALUES ($source, $codeId1, 'Alice')");
        $this->db->exec("INSERT INTO ballot_codes (ballot_id, random_code_id, label) VALUES ($source, $codeId2, 'Bob')");

        $result = $this->callApi('copy-ballot-codes.php', [
            'sourceBallotId' => $source,
            'targetBallotId' => $target,
            'createdBy'      => 'alice',
        ]);

        $this->assertTrue($result['body']['success']);
        $this->assertEquals(2, $result['body']['count']);

        // Verify codes + labels on target
        $sth = $this->db->prepare("SELECT random_code_id, label FROM ballot_codes WHERE ballot_id = ? ORDER BY random_code_id");
        $sth->execute([$target]);
        $rows = $sth->fetchAll(PDO::FETCH_ASSOC);
        $this->assertCount(2, $rows);
        $this->assertEquals('Alice', $rows[0]['label']);
        $this->assertEquals('Bob', $rows[1]['label']);
    }

    public function testRejectsIfSourceNotOwnedByUser(): void
    {
        $source = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);
        $target = $this->seedBallot(['createdBy' => 'bob', 'isSecure' => 1]);

        $result = $this->callApi('copy-ballot-codes.php', [
            'sourceBallotId' => $source,
            'targetBallotId' => $target,
            'createdBy'      => 'bob',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }

    public function testRejectsIfTargetNotOwnedByUser(): void
    {
        $source = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);
        $target = $this->seedBallot(['createdBy' => 'bob', 'isSecure' => 1]);
        $this->seedVoterCode($source, 'aaa111');

        $result = $this->callApi('copy-ballot-codes.php', [
            'sourceBallotId' => $source,
            'targetBallotId' => $target,
            'createdBy'      => 'alice',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }

    public function testRejectsIfSourceNotSecure(): void
    {
        $source = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 0]);
        $target = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);

        $result = $this->callApi('copy-ballot-codes.php', [
            'sourceBallotId' => $source,
            'targetBallotId' => $target,
            'createdBy'      => 'alice',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('source', $result['body']['errors']);
    }

    public function testSucceedsWithZeroCodesOnSource(): void
    {
        $source = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);
        $target = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);

        $result = $this->callApi('copy-ballot-codes.php', [
            'sourceBallotId' => $source,
            'targetBallotId' => $target,
            'createdBy'      => 'alice',
        ]);

        $this->assertTrue($result['body']['success']);
        $this->assertEquals(0, $result['body']['count']);
    }

    public function testSkipsDuplicateCodesOnTarget(): void
    {
        $source = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);
        $target = $this->seedBallot(['createdBy' => 'alice', 'isSecure' => 1]);

        // Seed two codes: assign both to source, pre-assign first to target
        $codeId1 = $this->seedRandomCode('aaa111');
        $codeId2 = $this->seedRandomCode('bbb222');
        $this->db->exec("INSERT INTO ballot_codes (ballot_id, random_code_id) VALUES ($source, $codeId1)");
        $this->db->exec("INSERT INTO ballot_codes (ballot_id, random_code_id) VALUES ($source, $codeId2)");
        $this->db->exec("INSERT INTO ballot_codes (ballot_id, random_code_id) VALUES ($target, $codeId1)");

        $result = $this->callApi('copy-ballot-codes.php', [
            'sourceBallotId' => $source,
            'targetBallotId' => $target,
            'createdBy'      => 'alice',
        ]);

        $this->assertTrue($result['body']['success']);
        // Only 1 new code should have been copied (the other was already there)
        $this->assertEquals(1, $result['body']['count']);

        // Target should have exactly 2 codes total
        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballot_codes WHERE ballot_id = ?");
        $sth->execute([$target]);
        $this->assertEquals(2, (int) $sth->fetchColumn());
    }

    public function testRequiresAllFields(): void
    {
        $result = $this->callApi('copy-ballot-codes.php', []);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('sourceBallotId', $result['body']['errors']);
        $this->assertArrayHasKey('targetBallotId', $result['body']['errors']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }
}
