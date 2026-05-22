<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotShortcode = $_POST['shortcode'];
$createdBy = $_POST['createdBy'];
$username = $_POST['username'];
$voteId = $_POST['voteId'];

if(!empty($voteId)) {

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
          `createdBy` = :createdBy
        AND
          `key` = :ballotShortcode
        AND
          `username` = :username
      )
      AND votes.vote_id = :voteId
    ;";
    $sth = $dbh->prepare($query);
    $sth->bindValue(':createdBy', $createdBy, PDO::PARAM_INT);
    $sth->bindValue(':ballotShortcode', $ballotShortcode, PDO::PARAM_STR);
    $sth->bindValue(':username', $username, PDO::PARAM_STR);
    $sth->bindValue(':voteId', $voteId, PDO::PARAM_INT);
    $sth->execute();
    $results=$sth->fetchAll(PDO::FETCH_ASSOC);
  // Update graph.
    $query2 = "
      UPDATE
        `ballots`
      SET
        `graphUpdated` = NULL
      WHERE
        `key` = :ballotShortcode
    ;";
    $sth2 = $dbh->prepare($query2);
    $sth2->bindValue(':ballotShortcode', $ballotShortcode, PDO::PARAM_STR);
    $sth2->execute();
    $results2=$sth2->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true]);
  } else {
    echo json_encode(['errors' => ['ballotId' => 'Failed to supply ballotId.']]);
  }
}
?>
