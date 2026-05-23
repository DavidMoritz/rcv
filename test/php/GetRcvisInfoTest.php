<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetRcvisInfoTest extends ApiTestCase
{
    public function testReturnsRcvisInfoForUser(): void
    {
        $info   = json_encode(['apiKey' => 'abc123', 'minVotes' => 5]);
        $userId = $this->seedUser(['username' => 'alice', 'rcvisInfo' => $info]);

        $result = $this->callApi('get-rcvis-info.php', [], ['userId' => $userId]);

        $this->assertIsArray($result['body']);
        $this->assertEmpty($result['body']['errors']);
        $decoded = json_decode($result['body']['data']['rcvisInfo'], true);
        $this->assertEquals('abc123', $decoded['apiKey']);
    }

    public function testReturnsNullRcvisInfoWhenNotSet(): void
    {
        $userId = $this->seedUser(['username' => 'alice', 'rcvisInfo' => null]);

        $result = $this->callApi('get-rcvis-info.php', [], ['userId' => $userId]);

        $this->assertIsArray($result['body']);
        $this->assertEmpty($result['body']['errors']);
        $this->assertNull($result['body']['data']['rcvisInfo']);
    }

    public function testRequiresUserId(): void
    {
        $result = $this->callApi('get-rcvis-info.php', [], []);

        $this->assertArrayHasKey('userId', $result['body']['errors']);
    }

    public function testUnknownUserReturnsError(): void
    {
        $result = $this->callApi('get-rcvis-info.php', [], ['userId' => 99999]);

        $this->assertArrayHasKey('userId', $result['body']['errors']);
    }
}
