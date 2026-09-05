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

function normalizeVoterCode($value): ?string
{
    if (!is_string($value)) {
        return null;
    }

    $code = strtr(strtolower(trim($value)), '01', 'oi');
    return strlen($code) === 6 ? $code : null;
}

function canonicalizeGroupAnswers($value): ?array
{
    if (!is_array($value)) {
        return null;
    }

    $answers = [];
    foreach ($value as $fieldId => $answer) {
        $id = is_int($fieldId) ? $fieldId : (is_string($fieldId) && ctype_digit($fieldId) ? (int) $fieldId : 0);
        if ($id <= 0 || array_key_exists($id, $answers)) {
            return null;
        }

        if (is_bool($answer)) {
            $answers[$id] = $answer;
        } elseif (is_string($answer)) {
            $answers[$id] = trim($answer);
        } elseif (is_int($answer) && $answer > 0) {
            $answers[$id] = (string) $answer;
        } else {
            return null;
        }
    }

    ksort($answers, SORT_NUMERIC);
    return $answers;
}

function validateGroupAnswers(PDO $dbh, int $ballotId, array $answers): array
{
    $fieldStatement = $dbh->prepare(
        'SELECT id, type, required FROM voter_group_fields WHERE ballot_id = :ballotId ORDER BY sort_order ASC, id ASC'
    );
    $fieldStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $fieldStatement->execute();
    $groupFields = $fieldStatement->fetchAll(PDO::FETCH_ASSOC);

    $optionStatement = $dbh->prepare(
        'SELECT o.id, o.field_id FROM voter_group_options o '
        . 'JOIN voter_group_fields f ON f.id = o.field_id '
        . 'WHERE f.ballot_id = :ballotId'
    );
    $optionStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $optionStatement->execute();
    $optionIds = [];
    foreach ($optionStatement->fetchAll(PDO::FETCH_ASSOC) as $option) {
        $optionIds[(int) $option['field_id']][(int) $option['id']] = true;
    }

    $knownFields = [];
    $normalized = [];
    $errors = [];
    foreach ($groupFields as $field) {
        $fieldId = (int) $field['id'];
        $knownFields[$fieldId] = true;
        $type = (string) ($field['type'] ?: 'select');
        $required = (int) $field['required'] === 1;
        $hasAnswer = array_key_exists($fieldId, $answers);
        $answer = $hasAnswer ? $answers[$fieldId] : null;
        $errorKey = 'groupAnswers.' . $fieldId;

        if ($type === 'checkbox') {
            if ($hasAnswer && !is_bool($answer)) {
                $errors[$errorKey] = 'Choose yes or no.';
            } else {
                $normalized[$fieldId] = $hasAnswer ? $answer : false;
            }
            continue;
        }

        if ($type === 'text') {
            if ($hasAnswer && !is_string($answer)) {
                $errors[$errorKey] = 'Enter a text answer.';
            } elseif ($required && (!$hasAnswer || $answer === '')) {
                $errors[$errorKey] = 'This question is required.';
            } elseif ($hasAnswer && strlen($answer) > 1000) {
                $errors[$errorKey] = 'Keep this answer under 1,000 characters.';
            } else {
                $normalized[$fieldId] = $hasAnswer ? $answer : '';
            }
            continue;
        }

        $optionId = is_string($answer) && ctype_digit($answer) ? (int) $answer : 0;
        if ($required && (!$hasAnswer || $optionId === 0)) {
            $errors[$errorKey] = 'This question is required.';
        } elseif ($hasAnswer && ($optionId === 0 || empty($optionIds[$fieldId][$optionId]))) {
            $errors[$errorKey] = 'Choose one of the available options.';
        } else {
            $normalized[$fieldId] = $optionId === 0 ? '' : (string) $optionId;
        }
    }

    foreach ($answers as $fieldId => $_answer) {
        if (empty($knownFields[$fieldId])) {
            $errors['groupAnswers.' . $fieldId] = 'This question does not belong to the ballot.';
        }
    }

    return ['answers' => $normalized, 'errors' => $errors];
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
$isSecure = (int) $ballot['isSecure'] === 1;
$allowsGrouping = (int) $ballot['allowGrouping'] === 1;
$voterCode = $isSecure ? normalizeVoterCode($input['voterCode'] ?? null) : null;
if ($isSecure && $voterCode === null) {
    fail(422, 'secure_code_required', 'Enter the six-character voter code.');
}

$groupAnswers = null;
if ($allowsGrouping) {
    if (!array_key_exists('groupAnswers', $input)) {
        fail(422, 'group_answers_required', 'Answer the ballot questions before submitting.');
    }
    $groupAnswers = canonicalizeGroupAnswers($input['groupAnswers']);
    if ($groupAnswers === null) {
        fail(422, 'invalid_group_answers', 'One or more ballot answers are invalid.');
    }
}

$requestPayload = ['ranking' => $ranking];
if ($isSecure) {
    $requestPayload['voterCode'] = $voterCode;
}
if ($allowsGrouping) {
    $requestPayload['groupAnswers'] = $groupAnswers;
}
$requestHash = hash('sha256', json_encode($requestPayload, JSON_UNESCAPED_SLASHES));
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

$groupAnswersJson = null;
if ($allowsGrouping) {
    $groupValidation = validateGroupAnswers($dbh, $ballotId, $groupAnswers);
    if ($groupValidation['errors'] !== []) {
        fail(422, 'invalid_group_answers', 'One or more ballot answers are invalid.', $groupValidation['errors']);
    }
    $groupAnswersJson = json_encode($groupValidation['answers'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
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
$secureTransaction = false;

try {
    if ($isSecure) {
        $dbh->beginTransaction();
        $secureTransaction = true;

        // Lock the ballot-code assignment until the vote is recorded. This
        // serializes concurrent attempts to redeem the same code even though
        // the production votes table is still MyISAM.
        $lockSuffix = $dbh->getAttribute(PDO::ATTR_DRIVER_NAME) === 'mysql' ? ' FOR UPDATE' : '';
        $codeStatement = $dbh->prepare(
            'SELECT bc.random_code_id FROM ballot_codes bc '
            . 'JOIN random_codes rc ON rc.id = bc.random_code_id '
            . 'WHERE bc.ballot_id = :ballotId AND rc.code = :voterCode LIMIT 1'
            . $lockSuffix
        );
        $codeStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
        $codeStatement->bindValue(':voterCode', $voterCode, PDO::PARAM_STR);
        $codeStatement->execute();
        if (!$codeStatement->fetch(PDO::FETCH_ASSOC)) {
            $dbh->rollBack();
            $secureTransaction = false;
            fail(403, 'invalid_voter_code', 'The voter code is invalid or has already been used.');
        }

        // A concurrent retry may have completed while this request waited for
        // the code lock, so repeat the idempotency check before rejecting a
        // code that now appears used.
        $existingVote = findIdempotentVote($dbh, $ballotId, $requestId);
        if ($existingVote) {
            $dbh->commit();
            $secureTransaction = false;
            if (!hash_equals((string) $existingVote['requestHash'], $requestHash)) {
                fail(409, 'idempotency_conflict', 'This request ID was already used for a different vote.');
            }
            respond(200, [
                'status' => 'accepted',
                'voteId' => (int) $existingVote['vote_id'],
                'replayed' => true,
            ], null);
        }

        $usedCodeStatement = $dbh->prepare(
            'SELECT vote_id FROM votes WHERE ballotId = :ballotId AND name = :voterCode LIMIT 1'
        );
        $usedCodeStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
        $usedCodeStatement->bindValue(':voterCode', $voterCode, PDO::PARAM_STR);
        $usedCodeStatement->execute();
        if ($usedCodeStatement->fetch()) {
            $dbh->rollBack();
            $secureTransaction = false;
            fail(403, 'invalid_voter_code', 'The voter code is invalid or has already been used.');
        }
    }

    $insert = $dbh->prepare(
        'INSERT INTO votes '
        . '(ballotId, date_created, vote, voteIds, ipAddress, name, fingerprint, group_answers, requestKey, requestHash) '
        . 'VALUES (:ballotId, UTC_TIMESTAMP(), :vote, :voteIds, :ipAddress, :voterName, :fingerprint, :groupAnswers, :requestKey, :requestHash)'
    );
    $insert->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $insert->bindValue(':vote', $voteJson, PDO::PARAM_STR);
    $insert->bindValue(':voteIds', $voteIds, PDO::PARAM_STR);
    $insert->bindValue(':ipAddress', $_SERVER['REMOTE_ADDR'] ?? '', PDO::PARAM_STR);
    $insert->bindValue(':voterName', $voterCode ?? '', PDO::PARAM_STR);
    $insert->bindValue(':fingerprint', $fingerprint, PDO::PARAM_STR);
    $insert->bindValue(
        ':groupAnswers',
        $groupAnswersJson,
        $groupAnswersJson === null ? PDO::PARAM_NULL : PDO::PARAM_STR
    );
    $insert->bindValue(':requestKey', $requestId, PDO::PARAM_STR);
    $insert->bindValue(':requestHash', $requestHash, PDO::PARAM_STR);
    $insert->execute();
    $voteId = (int) $dbh->lastInsertId();
    if ($secureTransaction) {
        $dbh->commit();
        $secureTransaction = false;
    }
} catch (PDOException $exception) {
    if ($secureTransaction && $dbh->inTransaction()) {
        $dbh->rollBack();
        $secureTransaction = false;
    }
    $existingVote = findIdempotentVote($dbh, $ballotId, $requestId);
    if ($existingVote && !hash_equals((string) $existingVote['requestHash'], $requestHash)) {
        fail(409, 'idempotency_conflict', 'This request ID was already used for a different vote.');
    }
    if (!$existingVote) {
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
