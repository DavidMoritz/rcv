<?php

require_once __DIR__ . '/ApiTestCase.php';

class WithdrawCandidateTest extends ApiTestCase
{
    public function testWithdrawCandidateSuccess(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => 'Won another office',
        ]);

        $this->assertTrue($result['body']['data']['success']);

        // Verify in DB
        $entry = $this->db->query("SELECT withdrawnAt, withdrawnReason FROM entries WHERE entry_id = {$entryIds[0]}")->fetch(PDO::FETCH_ASSOC);
        $this->assertNotNull($entry['withdrawnAt']);
        $this->assertSame('Won another office', $entry['withdrawnReason']);
    }

    public function testUnwithdrawCandidateSuccess(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $entryIds = $this->seedEntries($ballotId, ['Alice', 'Bob']);

        // Withdraw first
        $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => 'Testing',
        ]);

        // Un-withdraw
        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => false,
            'reason' => '',
        ]);

        $this->assertTrue($result['body']['data']['success']);

        $entry = $this->db->query("SELECT withdrawnAt, withdrawnReason FROM entries WHERE entry_id = {$entryIds[0]}")->fetch(PDO::FETCH_ASSOC);
        $this->assertNull($entry['withdrawnAt']);
        $this->assertSame('', $entry['withdrawnReason']);
    }

    public function testRejectsNonOwner(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'notowner',
            'withdraw' => true,
            'reason' => 'Hijack attempt',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRejectsAfterResultsReleased(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2000-01-01 00:00:00']);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => 'Too late',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('resultsRelease', $result['body']['errors']);
    }

    public function testRejectsNullResultsRelease(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => null]);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => 'No release date',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('resultsRelease', $result['body']['errors']);
    }

    public function testRejectsEntryNotOnBallot(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $otherBallotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $this->seedEntries($ballotId, ['Alice']);
        $otherEntryIds = $this->seedEntries($otherBallotId, ['Bob']);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $otherEntryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => 'Wrong ballot',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('entryId', $result['body']['errors']);
    }

    public function testTruncatesLongReason(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);
        $longReason = str_repeat('a', 300);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => $longReason,
        ]);

        $this->assertTrue($result['body']['data']['success']);

        $entry = $this->db->query("SELECT withdrawnReason FROM entries WHERE entry_id = {$entryIds[0]}")->fetch(PDO::FETCH_ASSOC);
        $this->assertSame(256, mb_strlen($entry['withdrawnReason']));
    }

    public function testRequiresReasonForWithdraw(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'owner1', 'resultsRelease' => '2099-12-31 23:59:59']);
        $entryIds = $this->seedEntries($ballotId, ['Alice']);

        $result = $this->callApi('withdraw-candidate.php', [
            'entryId' => $entryIds[0],
            'ballotId' => $ballotId,
            'createdBy' => 'owner1',
            'withdraw' => true,
            'reason' => '',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('reason', $result['body']['errors']);
    }
}
