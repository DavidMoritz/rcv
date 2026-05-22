<?php

require_once __DIR__ . '/ApiTestCase.php';

class SaveGroupFieldsTest extends ApiTestCase
{
    public function testSavesFieldsAndOptions(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('save-group-fields.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
            'fields'    => [
                [
                    'title'         => 'Age Range',
                    'question_text' => 'How old are you?',
                    'type'          => 'select',
                    'required'      => true,
                    'options'       => [['label' => 'Under 30'], ['label' => '30 and over']],
                ],
            ],
        ]);

        $this->assertIsArray($result['body']);
        $this->assertTrue($result['body']['data']['success']);

        $sth = $this->db->prepare("SELECT * FROM voter_group_fields WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $fields = $sth->fetchAll(PDO::FETCH_ASSOC);
        $this->assertCount(1, $fields);
        $this->assertEquals('Age Range', $fields[0]['title']);

        $sth = $this->db->prepare("SELECT label FROM voter_group_options WHERE field_id = ? ORDER BY sort_order");
        $sth->execute([$fields[0]['id']]);
        $labels = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['Under 30', '30 and over'], $labels);
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('save-group-fields.php', ['createdBy' => 'alice', 'fields' => []]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testRequiresCreatedBy(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('save-group-fields.php', ['ballotId' => $ballotId, 'fields' => []]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('createdBy', $result['body']['errors']);
    }

    public function testRejectsUnauthorizedUser(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $result = $this->callApi('save-group-fields.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'bob',
            'fields'    => [],
        ]);

        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('auth', $result['body']['errors']);
    }

    public function testReplacesExistingFields(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);
        $fieldId  = $this->seedGroupField($ballotId, ['title' => 'Old Field']);
        $this->seedGroupOption($fieldId, 'Old Option');

        $this->callApi('save-group-fields.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
            'fields'    => [
                ['title' => 'New Field', 'question_text' => 'New?', 'type' => 'select', 'options' => []],
            ],
        ]);

        $sth = $this->db->prepare("SELECT title FROM voter_group_fields WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $titles = $sth->fetchAll(PDO::FETCH_COLUMN);
        $this->assertEquals(['New Field'], $titles, 'Old fields should be replaced');

        $sth = $this->db->prepare("SELECT COUNT(*) FROM voter_group_options WHERE field_id = ?");
        $sth->execute([$fieldId]);
        $this->assertEquals(0, (int) $sth->fetchColumn(), 'Old options should be deleted');
    }

    public function testSkipsFieldsWithNoTitleAndNoQuestionText(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $this->callApi('save-group-fields.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
            'fields'    => [
                ['title' => '', 'question_text' => '', 'type' => 'select', 'options' => []],
                ['title' => 'Real Field', 'question_text' => 'Q?', 'type' => 'select', 'options' => []],
            ],
        ]);

        $sth = $this->db->prepare("SELECT COUNT(*) FROM voter_group_fields WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(1, (int) $sth->fetchColumn());
    }

    public function testTextTypeFieldGetsNoOptions(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $this->callApi('save-group-fields.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
            'fields'    => [
                [
                    'title'         => 'Free Text',
                    'question_text' => 'Say something.',
                    'type'          => 'text',
                    'options'       => [['label' => 'Ignored']],
                ],
            ],
        ]);

        $sth = $this->db->prepare("SELECT id FROM voter_group_fields WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $fieldId = $sth->fetchColumn();

        $sth = $this->db->prepare("SELECT COUNT(*) FROM voter_group_options WHERE field_id = ?");
        $sth->execute([$fieldId]);
        $this->assertEquals(0, (int) $sth->fetchColumn(), 'Text fields should not have options saved');
    }

    public function testInvalidTypeDefaultsToSelect(): void
    {
        $ballotId = $this->seedBallot(['createdBy' => 'alice']);

        $this->callApi('save-group-fields.php', [
            'ballotId'  => $ballotId,
            'createdBy' => 'alice',
            'fields'    => [
                ['title' => 'Field', 'question_text' => 'Q?', 'type' => 'radio', 'options' => []],
            ],
        ]);

        $sth = $this->db->prepare("SELECT type FROM voter_group_fields WHERE ballot_id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals('select', $sth->fetchColumn());
    }
}
