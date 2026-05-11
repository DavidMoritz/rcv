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

    public function testUpsertUpdatesExistingEntries(): void
    {
        $ballotId = $this->seedBallot();
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob', 'Charlie']);

        // Rename Alice -> Alicia, keep Bob, keep Charlie
        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['Alicia', 'Bob', 'Charlie'],
            'images'     => ['', '', ''],
            'hyperlinks' => ['', '', ''],
            'entryIds'   => $entryIds,
        ]);

        $this->assertEquals('Success', $result['raw']);

        // Verify entry_ids are preserved
        $sth = $this->db->prepare("SELECT entry_id, name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$ballotId]);
        $rows = $sth->fetchAll(PDO::FETCH_ASSOC);

        $this->assertCount(3, $rows);
        $this->assertEquals($entryIds[0], $rows[0]['entry_id']);
        $this->assertEquals('Alicia', $rows[0]['name']);
        $this->assertEquals($entryIds[1], $rows[1]['entry_id']);
        $this->assertEquals('Bob', $rows[1]['name']);
    }

    public function testUpsertDeletesRemovedEntries(): void
    {
        $ballotId = $this->seedBallot();
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob', 'Charlie']);

        // Remove Bob (only send Alice and Charlie)
        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['Alice', 'Charlie'],
            'images'     => ['', ''],
            'hyperlinks' => ['', ''],
            'entryIds'   => [$entryIds[0], $entryIds[2]],
        ]);

        $this->assertEquals('Success', $result['raw']);

        $sth = $this->db->prepare("SELECT entry_id, name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$ballotId]);
        $rows = $sth->fetchAll(PDO::FETCH_ASSOC);

        $this->assertCount(2, $rows);
        $this->assertEquals($entryIds[0], $rows[0]['entry_id']);
        $this->assertEquals($entryIds[2], $rows[1]['entry_id']);
    }

    public function testUpsertInsertsNewEntries(): void
    {
        $ballotId = $this->seedBallot();
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);

        // Keep Alice & Bob, add Dave (null entryId)
        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['Alice', 'Bob', 'Dave'],
            'images'     => ['', '', ''],
            'hyperlinks' => ['', '', ''],
            'entryIds'   => [$entryIds[0], $entryIds[1], null],
        ]);

        $this->assertEquals('Success', $result['raw']);

        $sth = $this->db->prepare("SELECT entry_id, name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$ballotId]);
        $rows = $sth->fetchAll(PDO::FETCH_ASSOC);

        $this->assertCount(3, $rows);
        $this->assertEquals($entryIds[0], $rows[0]['entry_id']);
        $this->assertEquals($entryIds[1], $rows[1]['entry_id']);
        $this->assertEquals('Dave', $rows[2]['name']);
        // New entry gets a new ID
        $this->assertNotContains((int) $rows[2]['entry_id'], $entryIds);
    }

    public function testCreateFlowWithEmptyEntryIds(): void
    {
        $ballotId = $this->seedBallot();

        // entryIds all null = create flow (bulk INSERT)
        $result = $this->callApi('add-entries.php', [
            'ballotId'   => $ballotId,
            'entries'    => ['Alpha', 'Beta'],
            'images'     => ['', ''],
            'hyperlinks' => ['', ''],
            'entryIds'   => [null, null],
        ]);

        $this->assertEquals('Success', $result['raw']);

        $sth = $this->db->prepare("SELECT name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$ballotId]);
        $names = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['Alpha', 'Beta'], $names);
    }
}
