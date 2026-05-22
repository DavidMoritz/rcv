<?php

require_once __DIR__ . '/ApiTestCase.php';

class UpdateRcvisInfoTest extends ApiTestCase
{
    public function testSavesRcvisInfoSuccessfully(): void
    {
        $userId = $this->seedUser(['username' => 'alice', 'password' => 'pass']);

        $rcvisInfo = json_encode(['apiKey' => 'abc123', 'minVotes' => 10, 'minMinutes' => 60]);

        $result = $this->callApi('update-rcvis-info.php', [
            'userId'    => $userId,
            'rcvisInfo' => $rcvisInfo,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);

        // Verify in DB
        $sth = $this->db->prepare("SELECT rcvisInfo FROM users WHERE id = ?");
        $sth->execute([$userId]);
        $stored = $sth->fetchColumn();
        $decoded = json_decode($stored, true);
        $this->assertEquals('abc123', $decoded['apiKey']);
        $this->assertEquals(10, $decoded['minVotes']);
    }

    public function testRequiresUserId(): void
    {
        $result = $this->callApi('update-rcvis-info.php', [
            'rcvisInfo' => '{}',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertNotEmpty($result['body']['errors']['userId']);
    }

    public function testRejectsInvalidJson(): void
    {
        $userId = $this->seedUser(['username' => 'bob', 'password' => 'pass']);

        $result = $this->callApi('update-rcvis-info.php', [
            'userId'    => $userId,
            'rcvisInfo' => 'not-valid-json{{{',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertNotEmpty($result['body']['errors']['rcvisInfo']);
    }
}
