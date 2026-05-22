<?php

require_once __DIR__ . '/ApiTestCase.php';

class UpdateCodeLabelTest extends ApiTestCase
{
    public function testUpdatesLabel(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'abc123');

        $result = $this->callApi('update-code-label.php', [
            'ballotId'  => $ballotId,
            'code'      => 'abc123',
            'createdBy' => 'alice',
            'label'     => 'Seat 1',
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['success']);

        $sth = $this->db->prepare("
            SELECT bc.label FROM ballot_codes bc
            JOIN random_codes rc ON rc.id = bc.random_code_id
            WHERE bc.ballot_id = ? AND rc.code = ?
        ");
        $sth->execute([$ballotId, 'abc123']);
        $this->assertEquals('Seat 1', $sth->fetchColumn());
    }

    public function testAllowsEmptyLabel(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'abc123');

        // First set a label
        $this->callApi('update-code-label.php', [
            'ballotId'  => $ballotId,
            'code'      => 'abc123',
            'createdBy' => 'alice',
            'label'     => 'Seat 1',
        ]);

        // Then clear it
        $result = $this->callApi('update-code-label.php', [
            'ballotId'  => $ballotId,
            'code'      => 'abc123',
            'createdBy' => 'alice',
            'label'     => '',
        ]);

        $this->assertTrue($result['body']['success']);
    }

    public function testRequiresMissingFields(): void
    {
        $result = $this->callApi('update-code-label.php', ['label' => 'Test']);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('params', $result['body']['errors']);
    }

    public function testRejectsUnauthorizedUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $this->seedVoterCode($ballotId, 'mycode');

        $result = $this->callApi('update-code-label.php', [
            'ballotId'  => $ballotId,
            'code'      => 'mycode',
            'createdBy' => 'bob',
            'label'     => 'Seat 1',
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }
}
