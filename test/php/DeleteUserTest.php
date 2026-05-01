<?php

require_once __DIR__ . '/ApiTestCase.php';

class DeleteUserTest extends ApiTestCase
{
    private function createUserWithData(string $password = 'hashed123'): array
    {
        $userId = $this->seedUser([
            'username' => 'deleteuser',
            'password' => $password,
        ]);

        $ballotId = $this->seedBallot([
            'createdBy' => $userId,
        ]);

        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $this->seedVote($ballotId, 'Alice>Bob', implode('>', $entryIds));
        $this->seedVoterCode($ballotId, 'abcdef');

        return ['userId' => $userId, 'ballotId' => $ballotId, 'entryIds' => $entryIds];
    }

    public function testSuccessfulDeletionWithPassword(): void
    {
        $info = $this->createUserWithData('hashed123');

        $result = $this->callApi('delete-users.php', [
            'userId'       => $info['userId'],
            'username'     => 'deleteuser',
            'confirmation' => 'hashed123',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);
        $this->assertEmpty($result['body']['errors']);

        // User gone
        $sth = $this->db->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
        $sth->execute([$info['userId']]);
        $this->assertEquals(0, $sth->fetchColumn());

        // Ballots orphaned to 'guest', not deleted
        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$info['ballotId']]);
        $this->assertEquals('guest', $sth->fetchColumn());

        // Entries, votes, ballot_codes all preserved
        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$info['ballotId']]);
        $this->assertEquals(2, $sth->fetchColumn());

        $sth = $this->db->prepare("SELECT COUNT(*) FROM votes WHERE ballotId = ?");
        $sth->execute([$info['ballotId']]);
        $this->assertEquals(1, $sth->fetchColumn());

        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballot_codes WHERE ballot_id = ?");
        $sth->execute([$info['ballotId']]);
        $this->assertEquals(1, $sth->fetchColumn());
    }

    public function testWrongPasswordFails(): void
    {
        $info = $this->createUserWithData('hashed123');

        $result = $this->callApi('delete-users.php', [
            'userId'       => $info['userId'],
            'username'     => 'deleteuser',
            'confirmation' => 'wrongpassword',
        ]);

        $this->assertNotEmpty($result['body']['errors']);
        $this->assertArrayHasKey('confirmation', $result['body']['errors']);

        // User still exists
        $sth = $this->db->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
        $sth->execute([$info['userId']]);
        $this->assertEquals(1, $sth->fetchColumn());
    }

    public function testOAuthUserDeletionWithUsername(): void
    {
        $userId = $this->seedUser([
            'username' => 'oauthuser',
            'password' => '',
        ]);

        $ballotId = $this->seedBallot(['createdBy' => $userId]);

        $result = $this->callApi('delete-users.php', [
            'userId'       => $userId,
            'username'     => 'oauthuser',
            'confirmation' => 'oauthuser',
        ]);

        $this->assertTrue($result['body']['data']['success']);

        // User gone
        $sth = $this->db->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
        $sth->execute([$userId]);
        $this->assertEquals(0, $sth->fetchColumn());

        // Ballot orphaned
        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals('guest', $sth->fetchColumn());
    }

    public function testOAuthUserWrongConfirmationFails(): void
    {
        $userId = $this->seedUser([
            'username' => 'oauthuser',
            'password' => '',
        ]);

        $result = $this->callApi('delete-users.php', [
            'userId'       => $userId,
            'username'     => 'oauthuser',
            'confirmation' => 'wrongname',
        ]);

        $this->assertNotEmpty($result['body']['errors']);
        $this->assertArrayHasKey('confirmation', $result['body']['errors']);
    }

    public function testNonexistentUserFails(): void
    {
        $result = $this->callApi('delete-users.php', [
            'userId'       => 999999,
            'username'     => 'nouser',
            'confirmation' => 'anything',
        ]);

        $this->assertNotEmpty($result['body']['errors']);
        $this->assertArrayHasKey('user', $result['body']['errors']);
    }

    public function testMissingFieldsReturnErrors(): void
    {
        $result = $this->callApi('delete-users.php', []);

        $this->assertNotEmpty($result['body']['errors']);
        $this->assertArrayHasKey('userId', $result['body']['errors']);
        $this->assertArrayHasKey('username', $result['body']['errors']);
        $this->assertArrayHasKey('confirmation', $result['body']['errors']);
    }

    public function testBallotsOrphanedNotDeleted(): void
    {
        $info = $this->createUserWithData('hashed123');

        $result = $this->callApi('delete-users.php', [
            'userId'       => $info['userId'],
            'username'     => 'deleteuser',
            'confirmation' => 'hashed123',
        ]);

        $this->assertTrue($result['body']['data']['success']);

        // Ballot still exists, owned by 'guest'
        $sth = $this->db->prepare("SELECT COUNT(*) FROM ballots WHERE id = ?");
        $sth->execute([$info['ballotId']]);
        $this->assertEquals(1, $sth->fetchColumn());

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$info['ballotId']]);
        $this->assertEquals('guest', $sth->fetchColumn());
    }

    public function testOtherUsersDataUnaffected(): void
    {
        // Create user to delete
        $info = $this->createUserWithData('hashed123');

        // Create another user with their own ballot and data
        $otherUserId = $this->seedUser([
            'username' => 'otheruser',
            'password' => 'otherpass',
        ]);
        $otherBallotId = $this->seedBallot(['createdBy' => $otherUserId]);
        $this->seedEntries($otherBallotId, ['Candidate X']);
        $this->seedVote($otherBallotId, 'Candidate X');

        // Delete the first user
        $this->callApi('delete-users.php', [
            'userId'       => $info['userId'],
            'username'     => 'deleteuser',
            'confirmation' => 'hashed123',
        ]);

        // Other user's data intact
        $sth = $this->db->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
        $sth->execute([$otherUserId]);
        $this->assertEquals(1, $sth->fetchColumn());

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$otherBallotId]);
        $this->assertEquals((string) $otherUserId, $sth->fetchColumn());
    }
}
