<?php
require_once("config.php");

$key = $_GET['key'];

if(!empty($key)) {
// checking for blank values.
	$query = "
		SELECT
			vote, ballots.positions, ballots.resultsRelease
		FROM
			votes
		JOIN
			ballots
		ON
			votes.ballotId = ballots.id
		WHERE
			ballots.key = '$key'
		AND
			NOW() > ballots.resultsRelease;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results))
		echo "Either shortcode is incorrect or results aren't ready to be released";
	else
		print json_encode($results);
} else {
	echo "Failed to supply key";
}
?>