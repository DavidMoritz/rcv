<?php

require_once __DIR__ . '/ApiTestCase.php';

class CreateGraphTest extends ApiTestCase
{
    public function testSetsShowGraphAndVoteCutoff(): void
    {
        $ballotId = $this->seedBallot(['key' => 'mygraph', 'showGraph' => 0]);

        $this->callApi('create-graph.php', [], ['key' => 'mygraph']);

        $sth = $this->db->prepare("SELECT showGraph, voteCutoff, graphUpdated FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $row = $sth->fetch(PDO::FETCH_ASSOC);

        $this->assertEquals(1, (int) $row['showGraph']);
        $this->assertNotNull($row['voteCutoff']);
        $this->assertNotNull($row['graphUpdated']);
    }

    public function testMissingKeyIsNoOp(): void
    {
        $ballotId = $this->seedBallot(['key' => 'untouched', 'showGraph' => 0]);

        $this->callApi('create-graph.php', [], []);

        $sth = $this->db->prepare("SELECT showGraph FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn(), 'showGraph should be unchanged');
    }

    public function testUnknownKeyAffectsNoRows(): void
    {
        $ballotId = $this->seedBallot(['key' => 'real-ballot', 'showGraph' => 0]);

        $this->callApi('create-graph.php', [], ['key' => 'nonexistent']);

        $sth = $this->db->prepare("SELECT showGraph FROM ballots WHERE id = ?");
        $sth->execute([$ballotId]);
        $this->assertEquals(0, (int) $sth->fetchColumn());
    }
}
