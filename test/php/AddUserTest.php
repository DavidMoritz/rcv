<?php

require_once __DIR__ . '/ApiTestCase.php';

class AddUserTest extends ApiTestCase
{
    public function testCreatesUserAndReturnsId(): void
    {
        $result = $this->callApi('add-user.php', [
            'username' => 'alice',
            'email'    => 'alice@example.com',
            'password' => 'secret',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('id', $result['body']);
        $this->assertIsInt($result['body']['id']);

        $sth = $this->db->prepare("SELECT username FROM users WHERE id = ?");
        $sth->execute([$result['body']['id']]);
        $this->assertEquals('alice', $sth->fetchColumn());
    }

    public function testReturnsIdEvenWithNoUserFields(): void
    {
        // add-user.php always inserts at minimum the server-generated id,
        // so the error branch (`failed to supply info`) is unreachable.
        $result = $this->callApi('add-user.php', []);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('id', $result['body'], 'A bare id-only row is always inserted');
    }

    public function testIgnoresNonAcceptableFields(): void
    {
        $result = $this->callApi('add-user.php', [
            'username' => 'bob',
            'role'     => 'admin',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('id', $result['body']);

        $sth = $this->db->prepare("SELECT role FROM users WHERE id = ?");
        $sth->execute([$result['body']['id']]);
        $role = $sth->fetchColumn();
        $this->assertNotEquals('admin', $role, 'Non-acceptable fields should not be written to the database');
    }

    public function testDuplicateUsernameDoesNotError(): void
    {
        $this->callApi('add-user.php', ['username' => 'alice', 'email' => 'alice@example.com']);
        $result = $this->callApi('add-user.php', ['username' => 'alice', 'email' => 'alice2@example.com']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('id', $result['body'], 'Duplicate insert should silently succeed (ON DUPLICATE KEY)');
    }

    public function testGeneratedIdIsInExpectedRange(): void
    {
        $result = $this->callApi('add-user.php', ['username' => 'carol']);

        $id = $result['body']['id'];
        $this->assertGreaterThanOrEqual(1,          $id);
        $this->assertLessThanOrEqual(2000000000, $id);
    }
}
