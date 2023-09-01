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
  // checking for blank values.
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
    echo $query;
  } else {
    echo "failed to supply ballotId";
  }
}
?>
