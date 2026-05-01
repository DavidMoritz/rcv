<?php

require_once __DIR__ . '/ApiTestCase.php';

class AddEntriesTest extends ApiTestCase
{
    public function testAddsEntriesSuccessfully(): void
    {
        $ballotId = $this->seedBallot();

        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['Alice', 'Bob', 'Charlie'],
            'images'     => ['', '', ''],
            'hyperlinks' => ['', '', ''],
        ]);

        $this->assertEquals('Success', $result['raw']);

        // Verify entries in database
        $sth = $this->db->prepare("SELECT name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$ballotId]);
        $names = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['Alice', 'Bob', 'Charlie'], $names);
    }

    public function testRejectsFewerThanTwoEntries(): void
    {
        $ballotId = $this->seedBallot();

        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['Only One'],
            'images'     => [''],
            'hyperlinks' => [''],
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('entryInput', $result['body']['errors']);
    }

    public function testRejectsEmptyEntries(): void
    {
        $result = $this->callApi('add-entries.php', [
            'ballotId' => 1,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('entryInput', $result['body']['errors']);
    }

    public function testStripsQuotesFromNames(): void
    {
        $ballotId = $this->seedBallot();

        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['"Alice"', "Bob's", 'Charlie'],
            'images'     => ['', '', ''],
            'hyperlinks' => ['', '', ''],
        ]);

        $this->assertEquals('Success', $result['raw']);

        $sth = $this->db->prepare("SELECT name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$ballotId]);
        $names = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['Alice', 'Bobs', 'Charlie'], $names);
    }

    public function testRejectsMissingBallotId(): void
    {
        $result = $this->callApi('add-entries.php', [
            'entries'    => ['Alice', 'Bob'],
            'images'     => ['', ''],
            'hyperlinks' => ['', ''],
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }
}
