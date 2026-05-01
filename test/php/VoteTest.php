<?php

require_once __DIR__ . '/ApiTestCase.php';

class VoteTest extends ApiTestCase
{
    public function testRecordsVoteSuccessfully(): void
    {
        $key = 'vote-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('vote.php', [
            'key'     => $key,
            'id'      => $ballotId,
            'vote'    => 'Alice,Bob',
            'voteIds' => implode(',', $entryIds),
        ]);

        // vote.php doesn't echo anything on success
        $this->assertEquals(0, $result['status']);

        // Verify vote in database
        $sth = $this->db->prepare("SELECT vote FROM votes WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals('Alice,Bob', $row['vote']);
    }

    public function testRejectsMissingKey(): void
    {
        $result = $this->callApi('vote.php', [
            'vote' => 'Alice,Bob',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('key', $result['body']['errors']);
    }

    public function testRejectsMissingVote(): void
    {
        $result = $this->callApi('vote.php', [
            'key' => 'some-key',
            'id'  => 1,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('vote', $result['body']['errors']);
    }

    public function testRejectsClosedBallot(): void
    {
        $key = 'closed-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'        => $key,
            'voteCutoff' => '2000-01-01 00:00:00', // In the past
        ]);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('vote.php', [
            'key'     => $key,
            'id'      => $ballotId,
            'vote'    => 'Alice,Bob',
            'voteIds' => '1,2',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('closed', $result['body']['errors']);
    }

    public function testRejectsDuplicateDevice(): void
    {
        $key = 'dup-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'              => $key,
            'oneDeviceOneVote' => 1,
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $fingerprint = 'device-fingerprint-123';

        // First vote
        $this->callApi('vote.php', [
            'key'         => $key,
            'id'          => $ballotId,
            'vote'        => 'Alice,Bob',
            'voteIds'     => implode(',', $entryIds),
            'fingerprint' => $fingerprint,
        ]);

        // Second vote with same fingerprint
        $result = $this->callApi('vote.php', [
            'key'         => $key,
            'id'          => $ballotId,
            'vote'        => 'Bob,Alice',
            'voteIds'     => implode(',', $entryIds),
            'fingerprint' => $fingerprint,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('duplicate', $result['body']['errors']);
    }

    public function testSecureBallotValidCode(): void
    {
        $key = 'secure-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'      => $key,
            'isSecure' => 1,
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $code = $this->seedVoterCode($ballotId, 'abcdef');

        $result = $this->callApi('vote.php', [
            'key'     => $key,
            'id'      => $ballotId,
            'vote'    => 'Alice,Bob',
            'voteIds' => implode(',', $entryIds),
            'name'    => 'abcdef',
        ]);

        $this->assertEquals(0, $result['status']);

        // Verify vote recorded with the code as name
        $sth = $this->db->prepare("SELECT name FROM votes WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals('abcdef', $row['name']);
    }

    public function testSecureBallotInvalidCode(): void
    {
        $key = 'secure-bad-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'      => $key,
            'isSecure' => 1,
        ]);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('vote.php', [
            'key'     => $key,
            'id'      => $ballotId,
            'vote'    => 'Alice,Bob',
            'voteIds' => '1,2',
            'name'    => 'badcod',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('code', $result['body']['errors']);
    }

    public function testSecureBallotUsedCode(): void
    {
        $key = 'secure-used-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'      => $key,
            'isSecure' => 1,
        ]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $this->seedVoterCode($ballotId, 'ghijkl');

        // First vote with the code
        $this->callApi('vote.php', [
            'key'     => $key,
            'id'      => $ballotId,
            'vote'    => 'Alice,Bob',
            'voteIds' => implode(',', $entryIds),
            'name'    => 'ghijkl',
        ]);

        // Try using the same code again
        $result = $this->callApi('vote.php', [
            'key'     => $key,
            'id'      => $ballotId,
            'vote'    => 'Bob,Alice',
            'voteIds' => implode(',', $entryIds),
            'name'    => 'ghijkl',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('code', $result['body']['errors']);
    }
}
