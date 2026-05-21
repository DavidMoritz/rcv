<?php

require_once __DIR__ . '/ApiTestCase.php';

class ValidateVoterCodeTest extends ApiTestCase
{
    public function testValidCodeReturnsTrue(): void
    {
        $ballotId = $this->seedBallot(['key' => 'secure-ballot']);
        $this->seedVoterCode($ballotId, 'abcdef');

        $result = $this->callApi('validate-voter-code.php', [], [
            'code'     => 'abcdef',
            'ballotId' => $ballotId,
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['valid']);
    }

    public function testUnknownCodeReturnsFalse(): void
    {
        $ballotId = $this->seedBallot(['key' => 'secure-ballot2']);

        $result = $this->callApi('validate-voter-code.php', [], [
            'code'     => 'notreal',
            'ballotId' => $ballotId,
        ]);

        $this->assertFalse($result['body']['valid']);
    }

    public function testCodeNotAssignedToBallotReturnsFalse(): void
    {
        $ballot1 = $this->seedBallot(['key' => 'ballot-one']);
        $ballot2 = $this->seedBallot(['key' => 'ballot-two']);
        $this->seedVoterCode($ballot1, 'mycode');

        $result = $this->callApi('validate-voter-code.php', [], [
            'code'     => 'mycode',
            'ballotId' => $ballot2,
        ]);

        $this->assertFalse($result['body']['valid'], 'Code assigned to another ballot should be invalid');
    }

    public function testUsedCodeReturnsFalse(): void
    {
        $ballotId = $this->seedBallot(['key' => 'secure-used']);
        $this->seedVoterCode($ballotId, 'usedcode');
        // Simulate the code having been used: votes stores the code in `name`
        $this->seedVote($ballotId, '1,2', '', 'usedcode');

        $result = $this->callApi('validate-voter-code.php', [], [
            'code'     => 'usedcode',
            'ballotId' => $ballotId,
        ]);

        $this->assertFalse($result['body']['valid'], 'Already-used code should be invalid');
    }

    public function testMissingParamsReturnsFalse(): void
    {
        $result = $this->callApi('validate-voter-code.php', [], []);

        $this->assertIsArray($result['body']);
        $this->assertFalse($result['body']['valid']);
    }

    public function testCodeNormalizationReplacesZeroWithO(): void
    {
        $ballotId = $this->seedBallot(['key' => 'norm-ballot']);
        // Store code with 'o' but user types '0'
        $this->seedVoterCode($ballotId, 'abc0oi');

        $result = $this->callApi('validate-voter-code.php', [], [
            'code'     => 'abc0oi',
            'ballotId' => $ballotId,
        ]);

        // strtr('abc0oi', '01', 'oi') → 'abcooi', but code stored as 'abc0oi' (not normalized)
        // The endpoint normalizes the *input*, so we must store normalized codes
        // Reseed with normalized code to match what the endpoint stores
        $this->db->exec("DELETE FROM ballot_codes"); // clear for reseed
        $this->db->exec("DELETE FROM random_codes");
        $this->seedVoterCode($ballotId, 'abcooi');

        $result = $this->callApi('validate-voter-code.php', [], [
            'code'     => 'abc0oi',
            'ballotId' => $ballotId,
        ]);

        $this->assertTrue($result['body']['valid'], "Input '0' should be normalized to 'o' before lookup");
    }
}
