<?php

require_once __DIR__ . '/ApiTestCase.php';

class DuplicateBallotTest extends ApiTestCase
{
    public function testCopiesEntriesFromSourceBallot(): void
    {
        $source = $this->seedBallot(['key' => 'source-ballot']);
        $target = $this->seedBallot(['key' => 'target-ballot']);
        $this->seedEntries($source, ['Alice', 'Bob', 'Carol']);

        $result = $this->callApi('duplicate-ballot.php', [
            'ballotId'          => $target,
            'duplicateBallotId' => $source,
        ]);

        $this->assertStringContainsString('Success', $result['raw']);

        $sth = $this->db->prepare("SELECT name FROM entries WHERE ballotId = ? ORDER BY entry_id");
        $sth->execute([$target]);
        $names = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['Alice', 'Bob', 'Carol'], $names);
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('duplicate-ballot.php', ['duplicateBallotId' => 1]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresDuplicateBallotId(): void
    {
        $result = $this->callApi('duplicate-ballot.php', ['ballotId' => 1]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('duplicateBallotId', $result['body']['errors']);
    }

    public function testDoesNotAffectSourceBallotEntries(): void
    {
        $source = $this->seedBallot(['key' => 'source-intact']);
        $target = $this->seedBallot(['key' => 'target-intact']);
        $this->seedEntries($source, ['Alice', 'Bob']);

        $this->callApi('duplicate-ballot.php', [
            'ballotId'          => $target,
            'duplicateBallotId' => $source,
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$source]);
        $this->assertEquals(2, (int) $sth->fetchColumn(), 'Source ballot entries should be unchanged');
    }

    public function testCopiesVoterGroupFieldsAndOptions(): void
    {
        $source  = $this->seedBallot(['key' => 'source-groups']);
        $target  = $this->seedBallot(['key' => 'target-groups']);
        $fieldId = $this->seedGroupField($source, ['title' => 'Age Range']);
        $this->seedGroupOption($fieldId, 'Under 30', 0);
        $this->seedGroupOption($fieldId, '30 and over', 1);

        $this->callApi('duplicate-ballot.php', [
            'ballotId'          => $target,
            'duplicateBallotId' => $source,
        ]);

        $sth = $this->db->prepare("SELECT id, title FROM voter_group_fields WHERE ballot_id = ?");
        $sth->execute([$target]);
        $fields = $sth->fetchAll(PDO::FETCH_ASSOC);
        $this->assertCount(1, $fields);
        $this->assertEquals('Age Range', $fields[0]['title']);

        $sth = $this->db->prepare("SELECT label FROM voter_group_options WHERE field_id = ? ORDER BY sort_order");
        $sth->execute([$fields[0]['id']]);
        $labels = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['Under 30', '30 and over'], $labels);
    }
}
