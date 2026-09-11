<?php

require_once __DIR__ . '/ApiTestCase.php';

class V2BallotTest extends ApiTestCase
{
    public function testCreatesABasicGuestBallotAndReturnsManagementToken(): void
    {
        $result = $this->callApi('v2/ballots.php', [
            'name' => '  Lunch choice  ',
            'candidates' => ['  Tacos  ', 'Curry', 'Pizza'],
            'createdBy' => 'attacker-supplied-owner',
            'isSecure' => true,
            'positions' => 12,
        ]);

        $this->assertSame('created', $result['body']['data']['status']);
        $this->assertNull($result['body']['error']);
        $this->assertSame('Lunch choice', $result['body']['data']['ballot']['name']);
        $this->assertSame(1, $result['body']['data']['ballot']['positions']);
        $this->assertMatchesRegularExpression('/^[a-z0-9]{4,}$/', $result['body']['data']['ballot']['key']);
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $result['body']['data']['managementToken']);

        $ballot = $this->db->query('SELECT * FROM ballots')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame('native:anonymous', $ballot['createdBy']);
        $this->assertSame(1, (int) $ballot['positions']);
        $this->assertSame('weighted', $ballot['tieBreak']);
        $this->assertSame(1, (int) $ballot['maxVotes']);
        foreach (['requireSignIn', 'register', 'allowCustom', 'hideNames', 'hideDetails', 'showGraph', 'oneDeviceOneVote', 'isSecure', 'orderedEntries', 'allowGrouping', 'bordaActive'] as $field) {
            $this->assertSame(0, (int) $ballot[$field], $field . ' must keep the basic-ballot default');
        }

        $entryNames = $this->db->query('SELECT name FROM entries ORDER BY entry_id')->fetchAll(PDO::FETCH_COLUMN);
        $this->assertSame(['Tacos', 'Curry', 'Pizza'], $entryNames);

        $tokenRow = $this->db->query('SELECT * FROM ballot_management_tokens')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame((int) $ballot['id'], (int) $tokenRow['ballot_id']);
        $this->assertSame(64, strlen($tokenRow['token_digest']));
        $this->assertSame(
            hash('sha256', $result['body']['data']['managementToken']),
            $tokenRow['token_digest']
        );
        $this->assertNotSame($result['body']['data']['managementToken'], $tokenRow['token_digest']);

        $publicBallot = $this->callApi('get-candidates.php', [], ['key' => $ballot['key']]);
        $this->assertSame('guest', $publicBallot['body']['ballot']['createdBy']);
        $this->assertStringNotContainsString($ballot['createdBy'], $publicBallot['raw']);
    }

    public function testReturnsUniqueTokensAndShortcodes(): void
    {
        $first = $this->callApi('v2/ballots.php', [
            'name' => 'First',
            'candidates' => ['A', 'B'],
        ]);
        $second = $this->callApi('v2/ballots.php', [
            'name' => 'Second',
            'candidates' => ['A', 'B'],
        ]);

        $this->assertNotSame($first['body']['data']['ballot']['key'], $second['body']['data']['ballot']['key']);
        $this->assertNotSame($first['body']['data']['managementToken'], $second['body']['data']['managementToken']);
        $this->assertSame(2, (int) $this->db->query('SELECT COUNT(*) FROM ballots')->fetchColumn());
        $this->assertSame(2, (int) $this->db->query('SELECT COUNT(*) FROM ballot_management_tokens')->fetchColumn());
    }

    public function testStoresInstallationIdAsOwnerMarker(): void
    {
        $result = $this->callApi('v2/ballots.php', [
            'name' => 'Owned ballot',
            'candidates' => ['A', 'B'],
            'installationId' => 'abc12345-device-uuid',
        ]);

        $this->assertSame('created', $result['body']['data']['status']);
        $ballot = $this->db->query('SELECT createdBy FROM ballots')->fetchColumn();
        $this->assertSame('native:abc12345-device-uuid', $ballot);
    }

    public function testRejectsInvalidBallotDetailsWithoutWritingData(): void
    {
        $result = $this->callApi('v2/ballots.php', [
            'name' => ' ',
            'candidates' => ['Same', ' same '],
        ]);

        $this->assertSame('validation_failed', $result['body']['error']['code']);
        $this->assertArrayHasKey('name', $result['body']['error']['fields']);
        $this->assertArrayHasKey('candidates.1', $result['body']['error']['fields']);
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM ballots')->fetchColumn());
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM entries')->fetchColumn());
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM ballot_management_tokens')->fetchColumn());
    }

    public function testRejectsCandidateCountsOutsideTheBasicFlowLimit(): void
    {
        $tooFew = $this->callApi('v2/ballots.php', [
            'name' => 'Too few',
            'candidates' => ['Only one'],
        ]);
        $tooMany = $this->callApi('v2/ballots.php', [
            'name' => 'Too many',
            'candidates' => array_fill(0, 101, 'Candidate'),
        ]);

        $this->assertSame('validation_failed', $tooFew['body']['error']['code']);
        $this->assertArrayHasKey('candidates', $tooFew['body']['error']['fields']);
        $this->assertSame('validation_failed', $tooMany['body']['error']['code']);
        $this->assertArrayHasKey('candidates', $tooMany['body']['error']['fields']);
    }

    public function testRejectsTextTheLegacyDatabaseCannotStore(): void
    {
        $result = $this->callApi('v2/ballots.php', [
            'name' => 'Emoji ballot 😀',
            'candidates' => ['A', 'B'],
        ]);

        $this->assertSame('validation_failed', $result['body']['error']['code']);
        $this->assertArrayHasKey('name', $result['body']['error']['fields']);
    }

    public function testLegacyEntryAndGraphMutationsCannotBypassTheManagementToken(): void
    {
        $created = $this->callApi('v2/ballots.php', [
            'name' => 'Protected',
            'candidates' => ['Original A', 'Original B'],
        ]);
        $ballotId = $created['body']['data']['ballot']['id'];
        $key = $created['body']['data']['ballot']['key'];

        $entries = $this->callApi('add-entries.php', [
            'ballotId' => $ballotId,
            'entries' => ['Injected A', 'Injected B'],
            'images' => ['', ''],
            'hyperlinks' => ['', ''],
        ]);
        $this->callApi('create-graph.php', [], ['key' => $key]);

        $this->assertSame(
            'This ballot requires a management token.',
            $entries['body']['errors']['authorization']
        );
        $storedEntries = $this->db->query('SELECT name FROM entries ORDER BY entry_id')->fetchAll(PDO::FETCH_COLUMN);
        $this->assertSame(['Original A', 'Original B'], $storedEntries);
        $ballot = $this->db->query('SELECT showGraph, voteCutoff FROM ballots')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame(0, (int) $ballot['showGraph']);
        $this->assertNull($ballot['voteCutoff']);
    }
}
