<?php

require_once __DIR__ . '/ApiTestCase.php';

class GetContributionsTest extends ApiTestCase
{
    public function testReturnsContributionsAsJson(): void
    {
        $this->db->exec("INSERT INTO contributions (name, message, date) VALUES ('Alice', 'Thanks!', '2024-06-01')");
        $this->db->exec("INSERT INTO contributions (name, message, date) VALUES ('Bob', 'Great app', '2024-05-01')");

        $result = $this->callApi('get-contributions.php');

        $this->assertIsArray($result['body']);
        $this->assertCount(2, $result['body']);
    }

    public function testReturnsErrorStringWhenEmpty(): void
    {
        $result = $this->callApi('get-contributions.php');

        $this->assertIsString($result['body']);
        $this->assertStringContainsString('no one has voted yet', $result['body']);
    }

    public function testResultsOrderedByDateDesc(): void
    {
        $this->db->exec("INSERT INTO contributions (name, message, date) VALUES ('Earlier', 'msg', '2024-01-01')");
        $this->db->exec("INSERT INTO contributions (name, message, date) VALUES ('Later', 'msg', '2024-12-01')");

        $result = $this->callApi('get-contributions.php');

        $this->assertEquals('Later', $result['body'][0]['name']);
        $this->assertEquals('Earlier', $result['body'][1]['name']);
    }
}
