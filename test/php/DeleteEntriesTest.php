<?php

require_once __DIR__ . '/ApiTestCase.php';

/**
 * Tests for delete-entries.php.
 *
 * Note: delete-entries.php line 27 binds :createdBy as PARAM_INT.
 * In this endpoint createdBy is used as a string user identifier (same column
 * type as in other endpoints), so the PARAM_INT cast is inconsistent — though
 * it happens to work for numeric user IDs. A regression test is included to
 * surface behavior when createdBy is a plain string (e.g. 'alice').
 */
class DeleteEntriesTest extends ApiTestCase
{
    public function testDeletesEntriesForOwner(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedEntries($ballotId, ['Candidate A', 'Candidate B']);

        $this->callApi('delete-entries.php', ['id' => $ballotId, 'createdBy' => 'alice']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }

    public function testDoesNotDeleteEntriesForNonOwner(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedEntries($ballotId, ['Candidate A']);

        $this->callApi('delete-entries.php', ['id' => $ballotId, 'createdBy' => 'bob']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), 'Entries should not be deleted by non-owner');
    }

    public function testDoesNotDeleteEntriesFromOtherBallot(): void
    {
        $ballot1 = $this->seedBallot(['createdBy' => 'alice', 'key' => 'b1']);
        $ballot2 = $this->seedBallot(['createdBy' => 'alice', 'key' => 'b2']);
        $this->seedEntries($ballot2, ['Safe Candidate']);

        $this->callApi('delete-entries.php', ['id' => $ballot1, 'createdBy' => 'alice']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$ballot2]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), 'Other ballot entries should be unaffected');
    }

    public function testMissingBallotIdReturnsError(): void
    {
        $result = $this->callApi('delete-entries.php', ['createdBy' => 'alice']);

        $this->assertEquals('failed to supply ballotId', $result['raw']);
    }
}
