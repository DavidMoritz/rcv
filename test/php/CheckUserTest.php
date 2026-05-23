<?php

require_once __DIR__ . '/ApiTestCase.php';

class CheckUserTest extends ApiTestCase
{
    public function testKnownUserReturnsTrue(): void
    {
        $this->seedUser(['username' => 'alice']);

        $result = $this->callApi('check-user.php', [], ['user' => 'alice']);

        $this->assertIsArray($result['body']);
        $this->assertCount(1, $result['body']);
        $this->assertEquals(1, (int) $result['body'][0]['true']);
    }

    public function testUnknownUserReturnsEmptyArray(): void
    {
        $result = $this->callApi('check-user.php', [], ['user' => 'nobody']);

        $this->assertIsArray($result['body']);
        $this->assertEmpty($result['body']);
    }

    public function testMissingParamReturnsNoOutput(): void
    {
        $result = $this->callApi('check-user.php', [], []);

        $this->assertEmpty($result['raw']);
    }
}
