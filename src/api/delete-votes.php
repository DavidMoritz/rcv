<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = $_POST['id'];
$createdBy = $_POST['createdBy'];
$voteId = $_POST['voteId'] ?? null;

if(!empty($ballotId)) {
	$query = "
		DELETE FROM
			`votes`
		WHERE
			`ballotId` = (
			SELECT
				id
			FROM
				ballots
			WHERE
				`createdBy` = :createdBy
			AND
				`id` = :ballotId
		)
  ";
	$params = [':createdBy' => $createdBy, ':ballotId' => $ballotId];

	if(!empty($voteId)) {
		$query .= "AND votes.vote_id = :voteId";
		$params[':voteId'] = $voteId;
	}

	$sth = $dbh->prepare($query);
	$sth->execute($params);
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
} else {
	echo "failed to supply ballotId";
}
?>
