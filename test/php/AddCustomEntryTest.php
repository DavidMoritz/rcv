<?php

require_once __DIR__ . '/ApiTestCase.php';

class AddCustomEntryTest extends ApiTestCase
{
    public function testAddsEntryWhenAllowCustomEnabled(): void
    {
        $this->seedBallot(['key' => 'open-ballot', 'allowCustom' => 1]);

        $result = $this->callApi('add-custom-entry.php', [], ['key' => 'open-ballot', 'entry' => 'Write-In Candidate']);

        $this->assertIsArray($result['body']);
        $this->assertCount(1, $result['body']);
        $this->assertEquals('Write-In Candidate', $result['body'][0]['name']);
    }

    public function testRejectsWhenAllowCustomDisabled(): void
    {
        $this->seedBallot(['key' => 'closed-ballot']);

        $result = $this->callApi('add-custom-entry.php', [], ['key' => 'closed-ballot', 'entry' => 'Sneaky Entry']);

        $this->assertEquals('None found', $result['raw']);
    }

    public function testRejectsBlankEntry(): void
    {
        $this->seedBallot(['key' => 'open-ballot2', 'allowCustom' => 1]);

        $result = $this->callApi('add-custom-entry.php', [], ['key' => 'open-ballot2', 'entry' => '']);

        $this->assertEquals('None found', $result['raw']);
    }

    public function testMissingKeyReturnsError(): void
    {
        $result = $this->callApi('add-custom-entry.php', [], ['entry' => 'Some Entry']);

        $this->assertEquals('Please provide id and key', $result['raw']);
    }

    public function testDoesNotInsertEntryForDisabledBallot(): void
    {
        $ballotId = $this->seedBallot(['key' => 'no-custom']);

        $this->callApi('add-custom-entry.php', [], ['key' => 'no-custom', 'entry' => 'Sneaky']);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM entries WHERE ballotId = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }
}
