<?php
require_once("config.php");

$key = $_GET['key'];

if(!empty($key)) {
// checking for blank values.
	$query = "
		SELECT
			vote_id, vote, votes.name, ballots.rcvisId, ballots.rcvisSlug, ballots.showGraph, ballots.createdBy, ballots.hideNames, ballots.positions, ballots.resultsRelease, ballots.voteCutoff, ballots.name AS 'ballotName', ballots.tieBreak
		FROM
			votes
		JOIN
			ballots
			ON
				votes.ballotId = ballots.id
		WHERE
			ballots.key = '$key';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	// $query2 = "
	// 	SELECT
	// 		name
	// 	FROM
	// 		entries
	// 	WHERE
	// 		ballotId = '$key'";
	// $sth2 = $dbh->prepare($query2);
	// $sth2->execute();
	// // THIS DOESN'T WORK YET
	// array_push($results, $sth->fetchAll(PDO::FETCH_ASSOC));

	if(empty($results))
		echo "Either shortcode is incorrect or no one has voted yet.";
	else
		print json_encode($results);
} else {
	echo "Failed to supply key";
}
?>
