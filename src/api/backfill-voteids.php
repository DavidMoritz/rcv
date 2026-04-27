<?php
/**
 * Backfill voteIds for votes that are missing them.
 *
 * For each vote with null/empty voteIds, parse the vote JSON names,
 * look up each name in entries for that ballotId to get entry_id,
 * and update the vote row.
 *
 * Run once: php backfill-voteids.php
 */
require_once("config.php");

// Get all votes missing voteIds
$sth = $dbh->prepare("SELECT vote_id, ballotId, vote FROM votes WHERE voteIds IS NULL OR voteIds = ''");
$sth->execute();
$missing = $sth->fetchAll(PDO::FETCH_ASSOC);

echo count($missing) . " votes missing voteIds\n";

if (empty($missing)) {
    echo "Nothing to do.\n";
    exit(0);
}

// Cache entry lookups per ballot
$entryCache = [];

function getEntryMap($dbh, $ballotId) {
    global $entryCache;
    if (isset($entryCache[$ballotId])) {
        return $entryCache[$ballotId];
    }
    $sth = $dbh->prepare("SELECT entry_id, name FROM entries WHERE ballotId = :ballotId");
    $sth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
    $sth->execute();
    $rows = $sth->fetchAll(PDO::FETCH_ASSOC);
    $map = [];
    foreach ($rows as $row) {
        $map[$row['name']] = (int)$row['entry_id'];
    }
    $entryCache[$ballotId] = $map;
    return $map;
}

$updated = 0;
$skipped = 0;
$updateSth = $dbh->prepare("UPDATE votes SET voteIds = :voteIds WHERE vote_id = :vote_id");

foreach ($missing as $vote) {
    $names = json_decode($vote['vote'], true);
    if (!is_array($names)) {
        echo "SKIP vote_id={$vote['vote_id']}: vote is not valid JSON\n";
        $skipped++;
        continue;
    }

    $entryMap = getEntryMap($dbh, $vote['ballotId']);
    $ids = [];
    $allFound = true;

    foreach ($names as $name) {
        if (isset($entryMap[$name])) {
            $ids[] = $entryMap[$name];
        } else {
            echo "WARN vote_id={$vote['vote_id']}: entry '{$name}' not found for ballotId={$vote['ballotId']}\n";
            $allFound = false;
        }
    }

    if (empty($ids)) {
        echo "SKIP vote_id={$vote['vote_id']}: no entry IDs matched\n";
        $skipped++;
        continue;
    }

    $voteIdsStr = '[' . implode(',', $ids) . ']';
    $updateSth->bindValue(':voteIds', $voteIdsStr, PDO::PARAM_STR);
    $updateSth->bindValue(':vote_id', $vote['vote_id'], PDO::PARAM_INT);
    $updateSth->execute();
    $updated++;
}

echo "Done. Updated: $updated, Skipped: $skipped\n";
?>
