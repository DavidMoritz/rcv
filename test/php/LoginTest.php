<?php

require_once __DIR__ . '/ApiTestCase.php';

class LoginTest extends ApiTestCase
{
    public function testValidCredentialsReturnsUser(): void
    {
        $this->seedUser([
            'id'       => 1001,
            'username' => 'alice',
            'password' => 'secret123',
        ]);

        $result = $this->callApi('login.php', [
            'username' => 'alice',
            'password' => 'secret123',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertEquals('alice', $result['body'][0]['username']);
    }

    public function testWrongPasswordReturnsError(): void
    {
        $this->seedUser([
            'id'       => 1002,
            'username' => 'bob',
            'password' => 'correct',
        ]);

        $result = $this->callApi('login.php', [
            'username' => 'bob',
            'password' => 'wrong',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('error', $result['body']);
        $this->assertStringContainsString('Incorrect', $result['body']['error']);
    }

    public function testMissingFieldsReturnsErrors(): void
    {
        $result = $this->callApi('login.php', []);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('username', $result['body']['errors']);
        $this->assertArrayHasKey('password', $result['body']['errors']);
    }

    public function testMissingPasswordReturnsError(): void
    {
        $result = $this->callApi('login.php', [
            'username' => 'alice',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('password', $result['body']['errors']);
    }

    public function testUnknownUserReturnsError(): void
    {
        $result = $this->callApi('login.php', [
            'username' => 'nonexistent',
            'password' => 'whatever',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('error', $result['body']);
    }
}
