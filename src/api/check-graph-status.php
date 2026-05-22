<?php
require_once("config.php");

$key = $_GET['key'];
$data = [];
$errors = [];

if (empty($key)) {
  $errors['key'] = 'Ballot shortcode is required.';
} else {
  // Get ballot info
  $query = "
    SELECT id, graphUpdated
    FROM ballots
    WHERE `key` = :key";
  $sth = $dbh->prepare($query);
  $sth->bindValue(':key', $key, PDO::PARAM_STR);
  $sth->execute();
  $ballot = $sth->fetch(PDO::FETCH_ASSOC);

  if (!$ballot) {
    $errors['key'] = 'Ballot not found.';
  } else {
    $graphUpdated = $ballot['graphUpdated'];
    $baseline = $graphUpdated ? $graphUpdated : '2000-01-01 00:00:00';

    // Count votes since last graph update
    $countQuery = "
      SELECT COUNT(*) as cnt
      FROM votes
      WHERE ballotId = :ballotId
      AND date_created > :baseline";
    $sth = $dbh->prepare($countQuery);
    $sth->bindValue(':ballotId', $ballot['id'], PDO::PARAM_INT);
    $sth->bindValue(':baseline', $baseline, PDO::PARAM_STR);
    $sth->execute();
    $countRow = $sth->fetch(PDO::FETCH_ASSOC);

    // Get last vote time
    $lastQuery = "
      SELECT MAX(date_created) as lastVote
      FROM votes
      WHERE ballotId = :ballotId";
    $sth = $dbh->prepare($lastQuery);
    $sth->bindValue(':ballotId', $ballot['id'], PDO::PARAM_INT);
    $sth->execute();
    $lastRow = $sth->fetch(PDO::FETCH_ASSOC);

    // Calculate minutes since update
    $minutesSinceUpdate = null;
    if ($graphUpdated) {
      $updatedTime = new DateTime($graphUpdated, new DateTimeZone('UTC'));
      $now = new DateTime('now', new DateTimeZone('UTC'));
      $minutesSinceUpdate = ($now->getTimestamp() - $updatedTime->getTimestamp()) / 60;
    }

    $votesSinceUpdate = (int) $countRow['cnt'];
    $isStale = $votesSinceUpdate > 0;

    $data = [
      'votesSinceUpdate' => $votesSinceUpdate,
      'minutesSinceUpdate' => $minutesSinceUpdate !== null ? round($minutesSinceUpdate) : null,
      'isStale' => $isStale,
      'graphUpdated' => $graphUpdated,
      'lastVoteTime' => $lastRow['lastVote'],
    ];
  }
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
