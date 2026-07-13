<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetVotesTest extends ApiTestCase
{
    public function testReturnsVotesAndEntries(): void
    {
        $key = 'votes-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $this->seedVote($ballotId, 'Alice,Bob', implode(',', $entryIds));

        $result = $this->callApi('get-votes.php', [], ['key' => $key]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('votes', $result['body']);
        $this->assertArrayHasKey('entries', $result['body']);
        $this->assertCount(1, $result['body']['votes']);
        $this->assertCount(2, $result['body']['entries']);
    }

    public function testNoVotesReturnsBallotExistsMessage(): void
    {
        $key = 'empty-' . uniqid();
        $this->seedBallot(['key' => $key]);

        $result = $this->callApi('get-votes.php', [], ['key' => $key]);

        $this->assertIsString($result['body']);
        $this->assertStringContainsString('No one has voted', $result['body']);
    }

    public function testBadKeyReturnsShortcodeNotFound(): void
    {
        $result = $this->callApi('get-votes.php', [], ['key' => 'nonexistent-' . uniqid()]);

        $this->assertIsString($result['body']);
        $this->assertStringContainsString('Shortcode not found', $result['body']);
    }

    public function testMissingKeyReturnsError(): void
    {
        $result = $this->callApi('get-votes.php', [], []);

        $this->assertStringContainsString('Failed to supply key', $result['raw']);
    }

    public function testMultipleVotesAllReturned(): void
    {
        $key = 'multi-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key]);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $this->seedVote($ballotId, 'Alice,Bob', '1,2', 'voter1');
        $this->seedVote($ballotId, 'Bob,Alice', '2,1', 'voter2');

        $result = $this->callApi('get-votes.php', [], ['key' => $key]);

        $this->assertIsArray($result['body']);
        $this->assertCount(2, $result['body']['votes']);
    }

    public function testReturnsBordaActiveInBallot(): void
    {
        $key = 'borda-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key, 'bordaActive' => 1]);
        $this->seedEntries($ballotId, ['Alice']);
        $this->seedVote($ballotId, 'Alice', '1');

        $result = $this->callApi('get-votes.php', [], ['key' => $key]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('ballot', $result['body']);
        $this->assertEquals(1, (int) $result['body']['ballot']['bordaActive']);
    }
}
