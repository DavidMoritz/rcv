<?php

require_once __DIR__ . '/ApiTestCase.php';

class CustomHtmlTest extends ApiTestCase
{
    public function testSaveCustomHtmlUpdatesDatabase(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'user1', 'iframeUrl' => 'custom']);

        $result = $this->callApi('save-custom-html.php', [
            'ballotId'   => $ballotId,
            'userId'     => 'user1',
            'customHtml' => '<h1>Hello</h1>',
        ]);

        $this->assertTrue($result['body']['data']['success']);

        $sth = $this->db->prepare("SELECT customHtml FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertEquals('<h1>Hello</h1>', $row['customHtml']);
    }

    public function testSaveCustomHtmlRejectsWrongOwner(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'user1', 'iframeUrl' => 'custom']);

        $result = $this->callApi('save-custom-html.php', [
            'ballotId'   => $ballotId,
            'userId'     => 'attacker',
            'customHtml' => '<script>alert("xss")</script>',
        ]);

        $this->assertArrayHasKey('ballot', $result['body']['errors']);

        // Verify nothing was saved
        $sth = $this->db->prepare("SELECT customHtml FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);
        $this->assertNull($row['customHtml']);
    }

    public function testGetCustomHtmlReturnsContent(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'user1', 'iframeUrl' => 'custom']);
        $this->db->prepare("UPDATE ballots SET customHtml = '<p>Test</p>' WHERE id = ?")
            ->execute([$ballotId]);

        $result = $this->callApi('get-custom-html.php', [], [
            'ballotId' => $ballotId,
            'userId'   => 'user1',
        ]);

        $this->assertEquals('<p>Test</p>', $result['body']['data']['customHtml']);
    }

    public function testGetCustomHtmlRejectsWrongOwner(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'user1', 'iframeUrl' => 'custom']);
        $this->db->prepare("UPDATE ballots SET customHtml = '<p>Secret</p>' WHERE id = ?")
            ->execute([$ballotId]);

        $result = $this->callApi('get-custom-html.php', [], [
            'ballotId' => $ballotId,
            'userId'   => 'attacker',
        ]);

        $this->assertArrayHasKey('ballot', $result['body']['errors']);
        $this->assertEmpty($result['body']['data']);
    }

    public function testSaveRequiresBallotId(): void
    {
        $result = $this->callApi('save-custom-html.php', [
            'userId'     => 'user1',
            'customHtml' => '<p>Hi</p>',
        ]);

        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testSaveRequiresUserId(): void
    {
        $result = $this->callApi('save-custom-html.php', [
            'ballotId'   => 1,
            'customHtml' => '<p>Hi</p>',
        ]);

        $this->assertArrayHasKey('userId', $result['body']['errors']);
    }

    public function testGetCandidatesIncludesCustomHtml(): void
    {
        $key = 'custom-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'       => $key,
            'createdBy' => 'user1',
            'iframeUrl' => 'custom',
        ]);
        $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $this->db->prepare("UPDATE ballots SET customHtml = '<p>Vote info</p>' WHERE id = ?")
            ->execute([$ballotId]);

        $result = $this->callApi('get-candidates.php', [], ['key' => $key]);

        $this->assertIsArray($result['body']);
        $this->assertEquals('custom', $result['body']['ballot']['iframeUrl']);
        $this->assertEquals('<p>Vote info</p>', $result['body']['ballot']['customHtml']);
    }

    public function testGetCandidatesExcludesCustomHtmlForNormalIframe(): void
    {
        $key = 'normal-' . uniqid();
        $ballotId = $this->seedBallot([
            'key'       => $key,
            'createdBy' => 'user1',
            'iframeUrl' => 'https://example.com',
        ]);
        $this->seedEntries($ballotId, ['Alice']);

        $result = $this->callApi('get-candidates.php', [], ['key' => $key]);

        $this->assertIsArray($result['body']);
        $this->assertNull($result['body']['ballot']['customHtml']);
    }
}
