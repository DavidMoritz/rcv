<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetKeyBallotTest extends ApiTestCase
{
    public function testValidKeyReturnsBallotData(): void
    {
        $key = 'ballot-' . uniqid();
        $this->seedBallot(['key' => $key]);

        $result = $this->callApi('get-key-ballot.php', [], ['key' => $key]);

        $this->assertIsArray($result['body']);
        $this->assertCount(1, $result['body']);
        $this->assertEquals($key, $result['body'][0]['key']);
    }

    public function testMissingKeyReturnsError(): void
    {
        $result = $this->callApi('get-key-ballot.php', [], []);

        $this->assertStringContainsString('failed to supply', $result['raw']);
    }

    public function testUnknownKeyReturnsEmptyArray(): void
    {
        $result = $this->callApi('get-key-ballot.php', [], ['key' => 'nonexistent-key']);

        $this->assertIsArray($result['body']);
        $this->assertEmpty($result['body']);
    }
}
