<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetCandidatesTest extends ApiTestCase
{
    public function testReturnsBallotAndCandidates(): void
    {
        $ballotId = $this->seedBallot(['key' => 'test-key', 'voteCutoff' => null]);
        $this->seedEntries($ballotId, ['Alice', 'Bob', 'Carol']);

        $result = $this->callApi('get-candidates.php', [], ['key' => 'test-key']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('ballot', $result['body']);
        $this->assertArrayHasKey('candidates', $result['body']);
        $this->assertCount(3, $result['body']['candidates']);
        $this->assertEquals('test-key', $result['body']['ballot']['key']);
    }

    public function testRequiresKey(): void
    {
        $result = $this->callApi('get-candidates.php', [], []);

        $this->assertStringContainsString('Failed to supply Shortcode', $result['raw']);
    }

    public function testUnknownKeyReturnsError(): void
    {
        $result = $this->callApi('get-candidates.php', [], ['key' => 'no-such-key']);

        $this->assertStringContainsString('Shortcode not found', $result['raw']);
    }

    public function testClosedBallotReturnsClosedStatus(): void
    {
        $ballotId = $this->seedBallot(['key' => 'closed-key', 'voteCutoff' => '2000-01-01 00:00:00']);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('get-candidates.php', [], ['key' => 'closed-key']);

        $this->assertIsArray($result['body']);
        $this->assertEquals('closed', $result['body']['status']);
        $this->assertArrayHasKey('resultsRelease', $result['body']);
    }

    public function testEditModeSkipsCutoffCheck(): void
    {
        $ballotId = $this->seedBallot(['key' => 'edit-key', 'voteCutoff' => '2000-01-01 00:00:00']);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('get-candidates.php', [], ['key' => 'edit-key', 'edit' => 'true']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('candidates', $result['body'], 'Edit mode should bypass the cutoff check');
    }

    public function testNoCandidatesReturnsError(): void
    {
        $this->seedBallot(['key' => 'empty-key', 'voteCutoff' => null]);

        $result = $this->callApi('get-candidates.php', [], ['key' => 'empty-key']);

        $this->assertStringContainsString('no candidates', $result['raw']);
    }

    public function testEditModeAllowsNoCandidates(): void
    {
        $this->seedBallot(['key' => 'edit-empty', 'voteCutoff' => null]);

        $result = $this->callApi('get-candidates.php', [], ['key' => 'edit-empty', 'edit' => 'true']);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('candidates', $result['body']);
        $this->assertEmpty($result['body']['candidates']);
    }

    public function testIncludesGroupFieldsWhenGroupingEnabled(): void
    {
        $ballotId  = $this->seedBallot(['key' => 'group-key', 'allowGrouping' => 1, 'voteCutoff' => null]);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $fieldId = $this->seedGroupField($ballotId, ['title' => 'Age Range']);
        $this->seedGroupOption($fieldId, 'Under 30');
        $this->seedGroupOption($fieldId, '30 and over');

        $result = $this->callApi('get-candidates.php', [], ['key' => 'group-key']);

        $this->assertIsArray($result['body']);
        $this->assertNotEmpty($result['body']['groupFields']);
        $this->assertEquals('Age Range', $result['body']['groupFields'][0]['title']);
        $this->assertCount(2, $result['body']['groupFields'][0]['options']);
    }

    public function testGroupFieldsEmptyWhenGroupingDisabled(): void
    {
        $ballotId = $this->seedBallot(['key' => 'nogroup-key', 'allowGrouping' => 0, 'voteCutoff' => null]);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('get-candidates.php', [], ['key' => 'nogroup-key']);

        $this->assertEmpty($result['body']['groupFields']);
    }
}
