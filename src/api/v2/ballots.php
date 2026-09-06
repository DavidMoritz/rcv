<?php

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, ?array $data, ?array $error): void
{
    http_response_code($status);
    echo json_encode(['data' => $data, 'error' => $error]);
    exit;
}

function fail(int $status, string $code, string $message, ?array $fields = null): void
{
    $error = ['code' => $code, 'message' => $message];
    if ($fields !== null) {
        $error['fields'] = $fields;
    }
    respond($status, null, $error);
}

function validText($value, int $maxCharacters): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $text = trim($value);
    if (
        $text === ''
        || preg_match('//u', $text) !== 1
        || preg_match('/[\x00-\x1F\x7F]/u', $text) === 1
        || preg_match('/[\x{10000}-\x{10FFFF}]/u', $text) === 1
        || preg_match_all('/./us', $text) > $maxCharacters
    ) {
        return null;
    }

    return $text;
}

function normalizedCandidateKey(string $name): string
{
    return function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
}

function randomUrlSafeString(int $bytes): string
{
    return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
}

$rawRequest = file_get_contents('php://input');
$request = json_decode($rawRequest, true);
if (!is_array($request) || json_last_error() !== JSON_ERROR_NONE) {
    fail(400, 'invalid_json', 'Send a JSON object.');
}

$fields = [];
$name = validText($request['name'] ?? null, 64);
if ($name === null) {
    $fields['name'] = 'Enter a ballot name of 64 characters or fewer.';
}

$candidateValues = $request['candidates'] ?? null;
$candidates = [];
if (!is_array($candidateValues) || count($candidateValues) < 2 || count($candidateValues) > 100) {
    $fields['candidates'] = 'Enter between 2 and 100 candidates.';
} else {
    $seenCandidates = [];
    foreach ($candidateValues as $index => $candidateValue) {
        $candidate = validText($candidateValue, 256);
        if ($candidate === null) {
            $fields['candidates.' . $index] = 'Enter a candidate name of 256 characters or fewer.';
            continue;
        }

        $candidateKey = normalizedCandidateKey($candidate);
        if (isset($seenCandidates[$candidateKey])) {
            $fields['candidates.' . $index] = 'Candidate names must be unique.';
            continue;
        }

        $seenCandidates[$candidateKey] = true;
        $candidates[] = $candidate;
    }
}

if ($fields !== []) {
    fail(422, 'validation_failed', 'Check the ballot details and try again.', $fields);
}

$ballotId = null;
try {
    $managementToken = randomUrlSafeString(32);
    $tokenDigest = hash('sha256', $managementToken);
    $ownerMarker = 'native:' . bin2hex(random_bytes(16));

    for ($attempt = 0; $attempt < 5; $attempt++) {
        $key = bin2hex(random_bytes(4));
        $keyStatement = $dbh->prepare('SELECT COUNT(*) FROM ballots WHERE `key` = :key');
        $keyStatement->execute([':key' => $key]);
        if ((int) $keyStatement->fetchColumn() === 0) {
            break;
        }
    }

    if (!isset($key) || $attempt === 5) {
        throw new RuntimeException('Could not allocate a ballot shortcode.');
    }

    $dbh->beginTransaction();

    $ballotStatement = $dbh->prepare(
        'INSERT INTO ballots '
        . '(`name`, `timeCreated`, `key`, `positions`, `createdBy`, `requireSignIn`, '
        . '`tieBreak`, `register`, `allowCustom`, `hideNames`, `hideDetails`, `showGraph`, '
        . '`maxVotes`, `oneDeviceOneVote`, `isSecure`, `orderedEntries`, `allowGrouping`, `bordaActive`) '
        . 'VALUES '
        . '(:name, UTC_TIMESTAMP(), :key, 1, :ownerMarker, 0, \'weighted\', 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0)'
    );
    $ballotStatement->execute([':name' => $name, ':key' => $key, ':ownerMarker' => $ownerMarker]);
    $ballotId = (int) $dbh->lastInsertId();

    $entryStatement = $dbh->prepare(
        'INSERT INTO entries (`ballotId`, `name`, `image`, `hyperlink`, `color`) '
        . 'VALUES (:ballotId, :name, \'\', \'\', NULL)'
    );
    $candidateData = [];
    foreach ($candidates as $candidate) {
        $entryStatement->execute([':ballotId' => $ballotId, ':name' => $candidate]);
        $candidateData[] = ['id' => (int) $dbh->lastInsertId(), 'name' => $candidate];
    }

    $tokenStatement = $dbh->prepare(
        'INSERT INTO ballot_management_tokens (`ballot_id`, `token_digest`, `created_at`) '
        . 'VALUES (:ballotId, :tokenDigest, UTC_TIMESTAMP())'
    );
    $tokenStatement->execute([':ballotId' => $ballotId, ':tokenDigest' => $tokenDigest]);

    $dbh->commit();

    respond(201, [
        'status' => 'created',
        'ballot' => [
            'id' => $ballotId,
            'key' => $key,
            'name' => $name,
            'positions' => 1,
        ],
        'candidates' => $candidateData,
        'managementToken' => $managementToken,
    ], null);
} catch (Throwable $error) {
    if ($dbh->inTransaction()) {
        $dbh->rollBack();
    }

    // ballots and entries are MyISAM in production, so a transaction cannot
    // roll them back. Compensate after any partial failure.
    if ($ballotId !== null) {
        foreach ([
            'DELETE FROM ballot_management_tokens WHERE ballot_id = :ballotId',
            'DELETE FROM entries WHERE ballotId = :ballotId',
            'DELETE FROM ballots WHERE id = :ballotId',
        ] as $cleanupQuery) {
            try {
                $cleanupStatement = $dbh->prepare($cleanupQuery);
                $cleanupStatement->execute([':ballotId' => $ballotId]);
            } catch (Throwable $cleanupError) {
                // Keep attempting the remaining compensating deletes and
                // return the same non-sensitive client error below.
            }
        }
    }

    fail(500, 'server_error', 'The ballot could not be created. Try again.');
}
