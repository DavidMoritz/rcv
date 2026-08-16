<?php

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

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

function normalizeRequestId($value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $requestId = trim($value);
    if (!preg_match('/^[A-Za-z0-9_-]{16,64}$/', $requestId)) {
        return null;
    }
    return $requestId;
}

function normalizeRanking($value): ?array
{
    if (!is_array($value) || count($value) === 0) {
        return null;
    }

    $ids = [];
    foreach ($value as $candidateId) {
        if (is_int($candidateId)) {
            $id = $candidateId;
        } elseif (is_string($candidateId) && ctype_digit($candidateId)) {
            $id = (int) $candidateId;
        } else {
            return null;
        }

        if ($id <= 0 || in_array($id, $ids, true)) {
            return null;
        }
        $ids[] = $id;
    }

    return $ids;
}

function findIdempotentVote(PDO $dbh, int $ballotId, string $requestId): ?array
{
    $statement = $dbh->prepare(
        'SELECT vote_id, requestHash FROM votes WHERE ballotId = :ballotId AND requestKey = :requestKey LIMIT 1'
    );
    $statement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $statement->bindValue(':requestKey', $requestId, PDO::PARAM_STR);
    $statement->execute();
    $row = $statement->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'method_not_allowed', 'Use POST to submit a vote.');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    fail(400, 'invalid_json', 'The request body must be a JSON object.');
}

$fields = [];
$key = isset($input['key']) && is_string($input['key']) ? trim($input['key']) : '';
if ($key === '') {
    $fields['key'] = 'A ballot shortcode is required.';
}

$requestId = normalizeRequestId($input['requestId'] ?? null);
if ($requestId === null) {
    $fields['requestId'] = 'A 16-64 character request ID is required.';
}

$ranking = normalizeRanking($input['ranking'] ?? null);
if ($ranking === null) {
    $fields['ranking'] = 'Rank at least one candidate using unique candidate IDs.';
}

if ($fields !== []) {
    fail(422, 'validation_failed', 'The vote request is invalid.', $fields);
}

$ballotStatement = $dbh->prepare(
    'SELECT id, register, oneDeviceOneVote, isSecure, allowGrouping, voteCutoff FROM ballots WHERE `key` = :key LIMIT 1'
);
$ballotStatement->bindValue(':key', $key, PDO::PARAM_STR);
$ballotStatement->execute();
$ballot = $ballotStatement->fetch(PDO::FETCH_ASSOC);

if (!$ballot) {
    fail(404, 'ballot_not_found', 'The ballot could not be found.');
}

$ballotId = (int) $ballot['id'];
$requestHash = hash('sha256', json_encode(['ranking' => $ranking], JSON_UNESCAPED_SLASHES));
$existingVote = findIdempotentVote($dbh, $ballotId, $requestId);
if ($existingVote) {
    if (!hash_equals((string) $existingVote['requestHash'], $requestHash)) {
        fail(409, 'idempotency_conflict', 'This request ID was already used for a different vote.');
    }
    respond(200, [
        'status' => 'accepted',
        'voteId' => (int) $existingVote['vote_id'],
        'replayed' => true,
    ], null);
}

if ($ballot['voteCutoff'] !== null && $ballot['voteCutoff'] < gmdate('Y-m-d H:i:s')) {
    fail(409, 'voting_closed', 'Voting has closed for this ballot.');
}

if ((int) $ballot['register'] === 1) {
    fail(409, 'voter_name_required', 'This ballot requires a voter name, which is not supported in the anonymous flow.');
}

if ((int) $ballot['isSecure'] === 1) {
    fail(409, 'secure_code_required', 'This ballot requires a voter code.');
}

if ((int) $ballot['allowGrouping'] === 1) {
    fail(409, 'group_answers_required', 'This ballot requires voter questions.');
}

$fingerprint = isset($input['fingerprint']) && is_string($input['fingerprint'])
    ? substr(trim($input['fingerprint']), 0, 64)
    : '';

if ((int) $ballot['oneDeviceOneVote'] === 1) {
    if ($fingerprint === '') {
        fail(422, 'fingerprint_required', 'A device identifier is required for this ballot.');
    }

    $duplicateStatement = $dbh->prepare(
        'SELECT vote_id FROM votes WHERE ballotId = :ballotId AND fingerprint = :fingerprint LIMIT 1'
    );
    $duplicateStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $duplicateStatement->bindValue(':fingerprint', $fingerprint, PDO::PARAM_STR);
    $duplicateStatement->execute();
    if ($duplicateStatement->fetch()) {
        fail(409, 'duplicate_device', 'This device has already voted on this ballot.');
    }
}

$candidatePlaceholders = implode(',', array_fill(0, count($ranking), '?'));
$candidateStatement = $dbh->prepare(
    "SELECT entry_id, name FROM entries WHERE ballotId = ? AND entry_id IN ($candidatePlaceholders)"
);
$candidateStatement->execute(array_merge([$ballotId], $ranking));
$candidateRows = $candidateStatement->fetchAll(PDO::FETCH_ASSOC);
$candidateNames = [];
foreach ($candidateRows as $candidate) {
    $candidateNames[(int) $candidate['entry_id']] = (string) $candidate['name'];
}

if (count($candidateNames) !== count($ranking)) {
    fail(422, 'invalid_ranking', 'One or more ranked candidates do not belong to this ballot.');
}

$voteNames = array_map(fn (int $candidateId): string => $candidateNames[$candidateId], $ranking);
$voteJson = json_encode($voteNames, JSON_UNESCAPED_SLASHES);
$voteIds = implode(',', $ranking);

try {
    $insert = $dbh->prepare(
        'INSERT INTO votes '
        . '(ballotId, date_created, vote, voteIds, ipAddress, name, fingerprint, group_answers, requestKey, requestHash) '
        . 'VALUES (:ballotId, UTC_TIMESTAMP(), :vote, :voteIds, :ipAddress, \'\', :fingerprint, NULL, :requestKey, :requestHash)'
    );
    $insert->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $insert->bindValue(':vote', $voteJson, PDO::PARAM_STR);
    $insert->bindValue(':voteIds', $voteIds, PDO::PARAM_STR);
    $insert->bindValue(':ipAddress', $_SERVER['REMOTE_ADDR'] ?? '', PDO::PARAM_STR);
    $insert->bindValue(':fingerprint', $fingerprint, PDO::PARAM_STR);
    $insert->bindValue(':requestKey', $requestId, PDO::PARAM_STR);
    $insert->bindValue(':requestHash', $requestHash, PDO::PARAM_STR);
    $insert->execute();
    $voteId = (int) $dbh->lastInsertId();
} catch (PDOException $exception) {
    $existingVote = findIdempotentVote($dbh, $ballotId, $requestId);
    if (!$existingVote || !hash_equals((string) $existingVote['requestHash'], $requestHash)) {
        error_log('v2 vote insert failed: ' . $exception->getMessage());
        fail(500, 'server_error', 'The vote could not be recorded.');
    }
    respond(200, [
        'status' => 'accepted',
        'voteId' => (int) $existingVote['vote_id'],
        'replayed' => true,
    ], null);
}

respond(201, [
    'status' => 'accepted',
    'voteId' => $voteId,
    'replayed' => false,
], null);
