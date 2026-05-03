<?php

require_once __DIR__ . '/ApiTestCase.php';

class DeleteBallotTest extends ApiTestCase
{
    public function testDeletesBallotAndItsEntries(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedEntries($ballotId, ['Option A', 'Option B']);

        $this->callApi('delete-ballot.php', [
            'id'        => $ballotId,
            'createdBy' => 'alice',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('delete-ballot.php', [
            'id'        => '',
            'createdBy' => 'alice',
        ]);

        $this->assertStringContainsString('failed to supply ballotId', $result['raw']);
    }

    public function testDoesNotDeleteBallotBelongingToOtherUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $this->callApi('delete-ballot.php', [
            'id'        => $ballotId,
            'createdBy' => 'bob',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "Ballot owned by alice should not be deleted by bob");
    }

    public function testDoesNotDeleteEntriesFromOtherUsersBallot(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedEntries($ballotId, ['Option A']);

        $this->callApi('delete-ballot.php', [
            'id'        => $ballotId,
            'createdBy' => 'bob',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "Entries should not be deleted when owner check fails");
    }

    public function testDoesNotDeleteOtherBallots(): void
    {
        $ballot1 = $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-keep-1']);
        $ballot2 = $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-keep-2']);

        $this->callApi('delete-ballot.php', [
            'id'        => $ballot1,
            'createdBy' => 'alice',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballots WHERE id = ?");
        $sth->execute([$ballot2]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "Only the targeted ballot should be deleted");
    }
}
