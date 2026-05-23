<?php

require_once __DIR__ . '/ApiTestCase.php';

/**
 * Tests for delete-users.php (admin self-serve multi-user deletion).
 * Distinct from DeleteUserTest which covers the older delete-user.php endpoint.
 */
class DeleteUsersTest extends ApiTestCase
{
    public function testDeletesUserWithCorrectPassword(): void
    {
        $userId = $this->seedUser(['username' => 'alice', 'password' => 'secret']);

        $result = $this->callApi('delete-users.php', [
            'userId'       => $userId,
            'username'     => 'alice',
            'confirmation' => 'secret',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
        $sth->execute([$userId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }

    public function testRejectsWrongConfirmation(): void
    {
        $userId = $this->seedUser(['username' => 'alice', 'password' => 'secret']);

        $result = $this->callApi('delete-users.php', [
            'userId'       => $userId,
            'username'     => 'alice',
            'confirmation' => 'wrongpassword',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('confirmation', $result['body']['errors']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM users WHERE id = ?");
        $sth->execute([$userId]);
        $this->assertEquals(1, (int) $sth->fetchColumn(), 'User should not be deleted');
    }

    public function testOAuthUserConfirmsWithUsername(): void
    {
        // OAuth users have no password — confirmation must match username
        $userId = $this->seedUser(['username' => 'oauthuser', 'password' => '']);

        $result = $this->callApi('delete-users.php', [
            'userId'       => $userId,
            'username'     => 'oauthuser',
            'confirmation' => 'oauthuser',
        ]);

        $this->assertTrue($result['body']['data']['success']);
    }

    public function testRequiresUserId(): void
    {
        $result = $this->callApi('delete-users.php', [
            'username'     => 'alice',
            'confirmation' => 'secret',
        ]);

        $this->assertArrayHasKey('userId', $result['body']['errors']);
    }

    public function testRequiresUsername(): void
    {
        $result = $this->callApi('delete-users.php', [
            'userId'       => 1,
            'confirmation' => 'secret',
        ]);

        $this->assertArrayHasKey('username', $result['body']['errors']);
    }

    public function testRequiresConfirmation(): void
    {
        $result = $this->callApi('delete-users.php', [
            'userId'   => 1,
            'username' => 'alice',
        ]);

        $this->assertArrayHasKey('confirmation', $result['body']['errors']);
    }

    public function testNonExistentUserReturnsError(): void
    {
        $result = $this->callApi('delete-users.php', [
            'userId'       => 99999,
            'username'     => 'ghost',
            'confirmation' => 'anything',
        ]);

        $this->assertArrayHasKey('user', $result['body']['errors']);
    }

    public function testBallotsOrphanedNotDeleted(): void
    {
        $userId   = $this->seedUser(['username' => 'alice', 'password' => 'pw']);
        $ballotId = $this->seedBallot(['createdBy' => $userId]);

        $this->callApi('delete-users.php', [
            'userId'       => $userId,
            'username'     => 'alice',
            'confirmation' => 'pw',
        ]);

        $sth = $this->db->prepare("SELECT createdBy FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals('guest', $sth->fetchColumn(), 'Ballot should be orphaned to guest');
    }
}
