<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetGroupFieldsTest extends ApiTestCase
{
    public function testReturnsFieldsWithOptions(): void
    {
        $ballotId = $this->seedBallot();
        $fieldId  = $this->seedGroupField($ballotId, ['title' => 'Age Range', 'type' => 'select']);
        $this->seedGroupOption($fieldId, 'Under 30', 0);
        $this->seedGroupOption($fieldId, '30 and over', 1);

        $result = $this->callApi('get-group-fields.php', [], ['ballotId' => $ballotId]);

        $this->assertIsArray($result['body']);
        $this->assertCount(1, $result['body']);
        $this->assertEquals('Age Range', $result['body'][0]['title']);
        $this->assertCount(2, $result['body'][0]['options']);
        $this->assertEquals('Under 30',    $result['body'][0]['options'][0]['label']);
        $this->assertEquals('30 and over', $result['body'][0]['options'][1]['label']);
    }

    public function testRequiresBallotId(): void
    {
        $result = $this->callApi('get-group-fields.php', [], []);

        $this->assertIsArray($result['body']);
        $this->assertArrayHasKey('errors', $result['body']);
        $this->assertArrayHasKey('ballotId', $result['body']['errors']);
    }

    public function testReturnsEmptyArrayWhenNoFields(): void
    {
        $ballotId = $this->seedBallot();

        $result = $this->callApi('get-group-fields.php', [], ['ballotId' => $ballotId]);

        $this->assertIsArray($result['body']);
        $this->assertEmpty($result['body']);
    }

    public function testTextFieldHasEmptyOptions(): void
    {
        $ballotId = $this->seedBallot();
        $this->seedGroupField($ballotId, ['title' => 'Notes', 'type' => 'text']);

        $result = $this->callApi('get-group-fields.php', [], ['ballotId' => $ballotId]);

        $this->assertIsArray($result['body']);
        $this->assertCount(1, $result['body']);
        $this->assertEmpty($result['body'][0]['options'], 'Text fields should always return empty options array');
    }

    public function testFieldsReturnedInSortOrder(): void
    {
        $ballotId = $this->seedBallot();
        $this->seedGroupField($ballotId, ['title' => 'Second', 'sort_order' => 1]);
        $this->seedGroupField($ballotId, ['title' => 'First',  'sort_order' => 0]);

        $result = $this->callApi('get-group-fields.php', [], ['ballotId' => $ballotId]);

        $this->assertEquals('First',  $result['body'][0]['title']);
        $this->assertEquals('Second', $result['body'][1]['title']);
    }

    public function testDoesNotReturnFieldsForOtherBallots(): void
    {
        $ballot1 = $this->seedBallot(['key' => 'ballot-one']);
        $ballot2 = $this->seedBallot(['key' => 'ballot-two']);
        $this->seedGroupField($ballot1, ['title' => 'Ballot1 Field']);

        $result = $this->callApi('get-group-fields.php', [], ['ballotId' => $ballot2]);

        $this->assertEmpty($result['body']);
    }
}
