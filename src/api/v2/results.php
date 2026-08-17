<?php

require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');

function resultsRespond(int $status, ?array $data, ?array $error): void
{
    http_response_code($status);
    echo json_encode(['data' => $data, 'error' => $error]);
    exit;
}

function resultsFail(int $status, string $code, string $message): void
{
    resultsRespond($status, null, ['code' => $code, 'message' => $message]);
}

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    resultsFail(405, 'method_not_allowed', 'Use GET to load election results.');
}

$key = isset($_GET['key']) && is_string($_GET['key']) ? trim($_GET['key']) : '';
if ($key === '') {
    resultsFail(422, 'validation_failed', 'A ballot shortcode is required.');
}

$ballotStatement = $dbh->prepare(
    'SELECT id, name, positions, tieBreak, resultsRelease FROM ballots WHERE `key` = :key LIMIT 1'
);
$ballotStatement->bindValue(':key', $key, PDO::PARAM_STR);
$ballotStatement->execute();
$ballot = $ballotStatement->fetch(PDO::FETCH_ASSOC);

if (!$ballot) {
    resultsFail(404, 'ballot_not_found', 'The ballot could not be found.');
}

if ($ballot['resultsRelease'] !== null && $ballot['resultsRelease'] > gmdate('Y-m-d H:i:s')) {
    resultsFail(403, 'results_not_released', 'Results have not been released for this ballot.');
}

$ballotId = (int) $ballot['id'];
$entryStatement = $dbh->prepare(
    'SELECT entry_id, name FROM entries WHERE ballotId = :ballotId ORDER BY entry_id ASC'
);
$entryStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
$entryStatement->execute();
$entries = array_map(
    fn (array $entry): array => ['id' => (int) $entry['entry_id'], 'name' => (string) $entry['name']],
    $entryStatement->fetchAll(PDO::FETCH_ASSOC)
);

$voteStatement = $dbh->prepare(
    'SELECT voteIds FROM votes WHERE ballotId = :ballotId ORDER BY vote_id ASC'
);
$voteStatement->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
$voteStatement->execute();
$validIds = array_fill_keys(array_column($entries, 'id'), true);
$votes = [];
foreach ($voteStatement->fetchAll(PDO::FETCH_COLUMN) as $voteIds) {
    $ranking = array_values(array_filter(
        array_map('intval', explode(',', (string) $voteIds)),
        fn (int $id): bool => isset($validIds[$id])
    ));
    if ($ranking !== []) {
        $votes[] = $ranking;
    }
}

resultsRespond(200, [
    'ballot' => [
        'key' => $key,
        'name' => (string) $ballot['name'],
        'positions' => (int) $ballot['positions'],
        'tieBreak' => $ballot['tieBreak'] === 'random' ? 'random' : 'weighted',
    ],
    'candidates' => $entries,
    'votes' => $votes,
], null);
