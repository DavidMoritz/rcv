<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotShortcode = $_POST['shortcode'];
$createdBy = $_POST['createdBy'];
$username = $_POST['username'];
$voteId = $_POST['voteId'];
$specificVote = '';

if(!empty($voteId)) {
  $specificVote = "AND votes.vote_id = $voteId";

  if(!empty($ballotShortcode)) {
  // remove specific vote.
    $query = "
      DELETE FROM
        `votes`
      WHERE
        `ballotId` = (
        SELECT
          ballots.id
        FROM
          ballots
        INNER JOIN
          users
          ON users.id = ballots.createdBy
        WHERE
          `createdBy` = $createdBy
        AND 
          `key` = '$ballotShortcode'
        AND
          `username` = '$username'
      )
      $specificVote
    ;";
    $sth = $dbh->prepare($query);
    $sth->execute();
    $results=$sth->fetchAll(PDO::FETCH_ASSOC);
  // Update graph.
    $query2 = "
      UPDATE
        `ballots`
      SET
        `graphUpdated` = '2022-02-02 12:12:12'
      WHERE
        `key` = '$ballotShortcode'
    ;";
    $sth2 = $dbh->prepare($query2);
    $sth2->execute();
    $results2=$sth2->fetchAll(PDO::FETCH_ASSOC);
    echo $query;
  } else {
    echo "failed to supply ballotId";
  }
}
?>
