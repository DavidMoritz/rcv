<?php

require_once __DIR__ . '/ApiTestCase.php';

class DeleteVotesTest extends ApiTestCase
{
    public function testDeletesAllVotesForBallot(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVote($ballotId, '1,2,3');
        $this->seedVote($ballotId, '3,2,1');

        $this->callApi('delete-votes.php', [
            'id'        => $ballotId,
            'createdBy' => 'alice',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('delete-votes.php', [
            'id'        => '',
            'createdBy' => 'alice',
        ]);

        $this->assertStringContainsString('failed to supply ballotId', $result['raw']);
    }

    public function testDoesNotDeleteVotesFromOtherUsersBallot(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVote($ballotId, '1,2,3');

        $this->callApi('delete-votes.php', [
            'id'        => $ballotId,
            'createdBy' => 'bob',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "Votes should not be deleted when owner check fails");
    }

    public function testDoesNotDeleteVotesFromOtherBallots(): void
    {
        $ballot1 = $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-del-1']);
        $ballot2 = $this->seedBallot(['createdBy' => 'alice', 'key' => 'ballot-del-2']);
        $this->seedVote($ballot1, '1,2');
        $this->seedVote($ballot2, '2,1');

        $this->callApi('delete-votes.php', [
            'id'        => $ballot1,
            'createdBy' => 'alice',
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE ballotId = ?");
        $sth->execute([$ballot2]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "Votes from other ballots should not be deleted");
    }

    /**
     * BUG: delete-votes.php line 29 references `votes.id` but the primary key
     * column is named `vote_id`. The voteId filter fails — the endpoint crashes
     * and no votes are deleted instead of just the targeted one.
     *
     * Fix: change `votes.id` to `votes.vote_id` on line 29 of delete-votes.php.
     *
     * @see src/api/delete-votes.php:29
     */
    public function testDeleteSingleVoteById(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $voteId1  = $this->seedVote($ballotId, '1,2');
        $voteId2  = $this->seedVote($ballotId, '2,1');

        $this->callApi('delete-votes.php', [
            'id'        => $ballotId,
            'createdBy' => 'alice',
            'voteId'    => $voteId1,
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "Only the specified vote should be deleted, not all votes");

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE vote_id = ?");
        $sth->execute([$voteId2]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), "The other vote should remain");
    }
}
