<?php
require_once("config.php");

$key = apiGet('key');

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
			ballots.key = '$key';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results))
		echo "Either shortcode is incorrect or results aren't ready to be released";
	else
		print json_encode($results);
} else {
	echo "failed to supply key";
}
?>