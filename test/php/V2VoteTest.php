<?php

require_once __DIR__ . '/ApiTestCase.php';

class V2VoteTest extends ApiTestCase
{
    private function validRequest(string $key, array $ranking, array $overrides = []): array
    {
        return array_merge([
            'key' => $key,
            'requestId' => 'request_1234567890',
            'ranking' => $ranking,
        ], $overrides);
    }

    public function testRecordsAnAnonymousVoteWithTypedResponse(): void
    {
        $key = 'v2-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key, 'register' => 2]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('v2/votes.php', $this->validRequest($key, array_reverse($entryIds)));

        $this->assertSame('accepted', $result['body']['data']['status']);
        $this->assertGreaterThan(0, $result['body']['data']['voteId']);
        $this->assertFalse($result['body']['data']['replayed']);
        $this->assertNull($result['body']['error']);

        $vote = $this->db->query('SELECT vote, voteIds, requestKey, requestHash FROM votes')->fetch(PDO::FETCH_ASSOC);
        $this->assertSame(json_encode(['Bob', 'Alice']), $vote['vote']);
        $this->assertSame(implode(',', array_reverse($entryIds)), $vote['voteIds']);
        $this->assertSame('request_1234567890', $vote['requestKey']);
        $this->assertSame(64, strlen($vote['requestHash']));
    }

    public function testReplaysTheFirstResponseForTheSameRequest(): void
    {
        $key = 'replay-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $request = $this->validRequest($key, $entryIds);

        $first = $this->callApi('v2/votes.php', $request);
        $second = $this->callApi('v2/votes.php', $request);

        $this->assertFalse($first['body']['data']['replayed']);
        $this->assertTrue($second['body']['data']['replayed']);
        $this->assertSame($first['body']['data']['voteId'], $second['body']['data']['voteId']);
        $this->assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM votes')->fetchColumn());
    }

    public function testRejectsAReusedRequestIdWithDifferentRanking(): void
    {
        $key = 'conflict-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $this->callApi('v2/votes.php', $this->validRequest($key, $entryIds));
        $result = $this->callApi('v2/votes.php', $this->validRequest($key, array_reverse($entryIds)));

        $this->assertSame('idempotency_conflict', $result['body']['error']['code']);
        $this->assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM votes')->fetchColumn());
    }

    public function testRejectsInvalidRequestFields(): void
    {
        $result = $this->callApi('v2/votes.php', [
            'requestId' => 'short',
            'ranking' => [1, 1],
        ]);

        $this->assertSame('validation_failed', $result['body']['error']['code']);
        $this->assertSame(['key', 'requestId', 'ranking'], array_keys($result['body']['error']['fields']));
    }

    public function testRejectsAnUnknownBallot(): void
    {
        $result = $this->callApi('v2/votes.php', $this->validRequest('missing', [1]));

        $this->assertSame('ballot_not_found', $result['body']['error']['code']);
    }

    public function testRejectsCandidatesFromAnotherBallot(): void
    {
        $key = 'foreign-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key]);
        $this->seedEntries($ballotId, ['Alice']);
        $otherBallotId = $this->seedBallot();
        $foreignIds = $this->seedEntries($otherBallotId, ['Mallory']);

        $result = $this->callApi('v2/votes.php', $this->validRequest($key, $foreignIds));

        $this->assertSame('invalid_ranking', $result['body']['error']['code']);
        $this->assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM votes')->fetchColumn());
    }

    public function testReturnsPhaseSpecificBallotStates(): void
    {
        $cases = [
            [['voteCutoff' => '2000-01-01 00:00:00'], 'voting_closed'],
            [['register' => 1], 'voter_name_required'],
            [['isSecure' => 1], 'secure_code_required'],
            [['allowGrouping' => 1], 'group_answers_required'],
        ];

        foreach ($cases as $index => [$settings, $expectedCode]) {
            $key = "state-$index-" . uniqid();
            $ballotId = $this->seedBallot(array_merge(['key' => $key], $settings));
            $entryIds = $this->seedEntries($ballotId, ['Alice']);

            $result = $this->callApi(
                'v2/votes.php',
                $this->validRequest($key, $entryIds, ['requestId' => "state_request_12345_$index"])
            );

            $this->assertSame($expectedCode, $result['body']['error']['code']);
        }
    }

    public function testEnforcesOneVotePerDevice(): void
    {
        $key = 'device-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key, 'oneDeviceOneVote' => 1]);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);
        $fingerprint = 'installation_1234567890';

        $this->callApi('v2/votes.php', $this->validRequest($key, $entryIds, [
            'fingerprint' => $fingerprint,
        ]));
        $result = $this->callApi('v2/votes.php', $this->validRequest($key, array_reverse($entryIds), [
            'requestId' => 'another_request_12345',
            'fingerprint' => $fingerprint,
        ]));

        $this->assertSame('duplicate_device', $result['body']['error']['code']);
    }

    public function testRequiresADeviceIdentifierWhenConfigured(): void
    {
        $key = 'fingerprint-' . uniqid();
        $ballotId = $this->seedBallot(['key' => $key, 'oneDeviceOneVote' => 1]);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);

        $result = $this->callApi('v2/votes.php', $this->validRequest($key, $entryIds));

        $this->assertSame('fingerprint_required', $result['body']['error']['code']);
    }
}
