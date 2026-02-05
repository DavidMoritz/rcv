<?php
require_once("config.php");

	$query = "
    SELECT
			vote, votes.name, ballots.positions, ballots.resultsRelease, ballots.name AS 'ballotName', ballots.tieBreak
		FROM
			votes
		JOIN
			ballots
			ON
				votes.ballotId = ballots.id
		WHERE
			ballots.key = 'r0ik'
		AND
			NOW() > ballots.resultsRelease;";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);
		print json_encode($results);
?>