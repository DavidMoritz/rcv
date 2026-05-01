<?php

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/TestPDO.php';

/**
 * Base test class for API endpoint tests.
 *
 * Provides:
 * - callApi() to invoke PHP endpoints as subprocesses
 * - Seed helpers to insert test data
 * - Table truncation between tests for isolation
 */
abstract class ApiTestCase extends TestCase
{
    protected PDO $db;

    protected function setUp(): void
    {
        $dbPath = getenv('RCV_TEST_DB');
        $this->db = new PDO("sqlite:$dbPath");
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Clean all tables for test isolation
        foreach (['votes', 'entries', 'ballot_codes', 'random_codes', 'ballots', 'users', 'contributions'] as $table) {
            $this->db->exec("DELETE FROM $table");
        }
    }

    /**
     * Call a PHP API endpoint as a subprocess.
     *
     * @param string $endpoint  Filename in src/api/ (e.g. "login.php")
     * @param array  $postData  Data sent as JSON on stdin → $_POST
     * @param array  $getData   Data sent via env → $_GET
     * @return array{status: int, body: mixed, raw: string}
     */
    protected function callApi(string $endpoint, array $postData = [], array $getData = []): array
    {
        $prepend = realpath(__DIR__ . '/prepend.php');
        $script  = realpath(__DIR__ . '/../../src/api/' . $endpoint);

        if (!$script) {
            throw new \RuntimeException("Endpoint not found: src/api/$endpoint");
        }

        $dbPath  = getenv('RCV_TEST_DB');
        $jsonIn  = json_encode($postData);
        $getStr  = http_build_query($getData);

        // Run endpoint as subprocess.
        // -d display_errors=stderr keeps PHP warnings/errors out of stdout.
        $cmd = sprintf(
            'echo %s | RCV_TEST_DB=%s TEST_GET_PARAMS=%s php -d display_errors=stderr -d auto_prepend_file=%s %s 2>/dev/null',
            escapeshellarg($jsonIn),
            escapeshellarg($dbPath),
            escapeshellarg($getStr),
            escapeshellarg($prepend),
            escapeshellarg($script)
        );

        // Execute
        $output = [];
        $status = 0;
        exec($cmd, $output, $status);
        $raw = implode("\n", $output);

        // Reconnect to see subprocess changes
        $this->db = new PDO("sqlite:$dbPath");
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Try to parse JSON
        $body = json_decode($raw, true);
        if ($body === null && $raw !== 'null') {
            $body = $raw; // Return raw string if not valid JSON
        }

        return [
            'status' => $status,
            'body'   => $body,
            'raw'    => $raw,
        ];
    }

    // ── Seed Helpers ──────────────────────────────────────────

    /**
     * Insert a ballot and return its ID.
     */
    protected function seedBallot(array $overrides = []): int
    {
        $defaults = [
            'name'           => 'Test Ballot',
            'key'            => 'test-' . uniqid(),
            'positions'      => '1',
            'createdBy'      => 'testuser',
            'requireSignIn'  => 0,
            'maxVotes'       => 0,
            'tieBreak'       => 'random',
            'voteCutoff'     => '2099-12-31 23:59:59',
            'resultsRelease' => '2099-12-31 23:59:59',
            'timeCreated'    => date('Y-m-d H:i:s'),
            'register'       => 0,
            'oneDeviceOneVote' => 0,
            'isSecure'       => 0,
        ];
        $data = array_merge($defaults, $overrides);

        $sth = $this->db->prepare("
            INSERT INTO ballots (name, key, positions, createdBy, requireSignIn, maxVotes, tieBreak, voteCutoff, resultsRelease, timeCreated, register, oneDeviceOneVote, isSecure)
            VALUES (:name, :key, :positions, :createdBy, :requireSignIn, :maxVotes, :tieBreak, :voteCutoff, :resultsRelease, :timeCreated, :register, :oneDeviceOneVote, :isSecure)
        ");
        $sth->execute([
            ':name'           => $data['name'],
            ':key'            => $data['key'],
            ':positions'      => $data['positions'],
            ':createdBy'      => $data['createdBy'],
            ':requireSignIn'  => $data['requireSignIn'],
            ':maxVotes'       => $data['maxVotes'],
            ':tieBreak'       => $data['tieBreak'],
            ':voteCutoff'     => $data['voteCutoff'],
            ':resultsRelease' => $data['resultsRelease'],
            ':timeCreated'    => $data['timeCreated'],
            ':register'       => $data['register'],
            ':oneDeviceOneVote' => $data['oneDeviceOneVote'],
            ':isSecure'       => $data['isSecure'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Insert a user and return their ID.
     */
    protected function seedUser(array $overrides = []): int
    {
        $defaults = [
            'id'       => random_int(100000, 999999),
            'username' => 'user_' . uniqid(),
            'password' => 'testpass',
            'email'    => null,
        ];
        $data = array_merge($defaults, $overrides);

        $sth = $this->db->prepare("
            INSERT INTO users (id, username, password, email)
            VALUES (:id, :username, :password, :email)
        ");
        $sth->execute([
            ':id'       => $data['id'],
            ':username' => $data['username'],
            ':password' => $data['password'],
            ':email'    => $data['email'],
        ]);
        return (int) $data['id'];
    }

    /**
     * Insert entries for a ballot and return their IDs.
     *
     * @param int   $ballotId
     * @param array $names     List of entry names
     * @return int[]            Entry IDs
     */
    protected function seedEntries(int $ballotId, array $names): array
    {
        $ids = [];
        $sth = $this->db->prepare("
            INSERT INTO entries (ballotId, name, image, hyperlink)
            VALUES (:ballotId, :name, '', '')
        ");
        foreach ($names as $name) {
            $sth->execute([':ballotId' => $ballotId, ':name' => $name]);
            $ids[] = (int) $this->db->lastInsertId();
        }
        return $ids;
    }

    /**
     * Insert a vote and return its vote_id.
     */
    protected function seedVote(int $ballotId, string $vote, string $voteIds = '', string $name = ''): int
    {
        $sth = $this->db->prepare("
            INSERT INTO votes (ballotId, vote, voteIds, ipAddress, name, fingerprint)
            VALUES (:ballotId, :vote, :voteIds, '127.0.0.1', :name, '')
        ");
        $sth->execute([
            ':ballotId' => $ballotId,
            ':vote'     => $vote,
            ':voteIds'  => $voteIds,
            ':name'     => $name,
        ]);
        return (int) $this->db->lastInsertId();
    }

    /**
     * Insert a random code and assign it to a ballot. Returns the code string.
     */
    protected function seedVoterCode(int $ballotId, string $code): string
    {
        $sth = $this->db->prepare("INSERT INTO random_codes (code) VALUES (:code)");
        $sth->execute([':code' => $code]);
        $codeId = (int) $this->db->lastInsertId();

        $sth2 = $this->db->prepare("INSERT INTO ballot_codes (ballot_id, random_code_id) VALUES (:ballotId, :codeId)");
        $sth2->execute([':ballotId' => $ballotId, ':codeId' => $codeId]);

        return $code;
    }
}
