<?php

require_once __DIR__ . '/ApiTestCase.php';

/**
 * Tests for delete-vote.php (admin single-vote deletion by ballot shortcode).
 *
 * Note: delete-vote.php line 37 binds :createdBy as PARAM_INT. The subquery
 * JOINs users ON users.id = ballots.createdBy, so createdBy is a numeric user
 * ID here — unlike other endpoints where createdBy is a username string. This
 * means the endpoint requires a numeric user ID, not a username.
 */
class DeleteVoteTest extends ApiTestCase
{
    public function testDeletesVoteByShortcodeAndVoteId(): void
    {
        $userId   = $this->seedUser(['username' => 'alice']);
        $ballotId = $this->seedBallot(['key' => 'myballot', 'createdBy' => $userId]);
        $voteId   = $this->seedVote($ballotId, '1,2');

        $result = $this->callApi('delete-vote.php', [
            'shortcode'  => 'myballot',
            'createdBy'  => $userId,
            'username'   => 'alice',
            'voteId'     => $voteId,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['success']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE vote_id = ?");
        $sth->execute([$voteId]);
        $this->assertEquals(0, (int) $sth->fetchColumn(), 'Vote should have been deleted');
    }

    public function testReturnsErrorWhenShortcodeMissing(): void
    {
        $userId = $this->seedUser(['username' => 'alice']);

        $result = $this->callApi('delete-vote.php', [
            'shortcode'  => '',
            'createdBy'  => $userId,
            'username'   => 'alice',
            'voteId'     => 1,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testReturnsNothingWhenVoteIdMissing(): void
    {
        // Endpoint silently no-ops when voteId is empty (no outer if branch taken)
        $result = $this->callApi('delete-vote.php', [
            'shortcode'  => 'myballot',
            'createdBy'  => '1',
            'username'   => 'alice',
            'voteId'     => '',
        ]);

        $this->assertEmpty($result['raw'], 'No output expected when voteId is absent');
    }

    public function testDoesNotDeleteVoteForWrongOwner(): void
    {
        $userId   = $this->seedUser(['username' => 'alice']);
        $otherId  = $this->seedUser(['username' => 'bob']);
        $ballotId = $this->seedBallot(['key' => 'owned-ballot', 'createdBy' => $userId]);
        $voteId   = $this->seedVote($ballotId, '1,2');

        $this->callApi('delete-vote.php', [
            'shortcode'  => 'owned-ballot',
            'createdBy'  => $otherId,
            'username'   => 'bob',
            'voteId'     => $voteId,
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE vote_id = ?");
        $sth->execute([$voteId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), 'Vote should not be deleted by non-owner');
    }
}
