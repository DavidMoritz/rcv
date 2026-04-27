<?php
require_once("config.php");

$key = $_GET['key'];

if(!empty($key)) {
// checking for blank values.
	$query = "
		SELECT
			vote_id, vote, voteIds, votes.name, votes.date_created, votes.ballotId, ballots.rcvisId, ballots.rcvisSlug, ballots.showGraph, ballots.createdBy, ballots.hideNames, ballots.hideDetails, ballots.positions, ballots.resultsRelease, ballots.voteCutoff, ballots.name AS 'ballotName', ballots.tieBreak, ballots.graphUpdated, ballots.isSecure
		FROM
			votes
		JOIN
			ballots
			ON
				votes.ballotId = ballots.id
		WHERE
			ballots.key = :key
		ORDER BY
			CASE WHEN ballots.isSecure = 1 THEN votes.name ELSE votes.vote_id END ASC;";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':key', $key, PDO::PARAM_STR);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results)) {
		$sth2 = $dbh->prepare("SELECT id FROM ballots WHERE `key` = :key");
		$sth2->bindValue(':key', $key, PDO::PARAM_STR);
		$sth2->execute();
		if($sth2->fetch()) {
			echo "No one has voted yet on this ballot.";
		} else {
			echo "Shortcode not found.";
		}
	} else {
		$ballotId = $results[0]['ballotId'];
		$sth2 = $dbh->prepare("SELECT entry_id, name, image, color, hyperlink FROM entries WHERE ballotId = :ballotId");
		$sth2->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
		$sth2->execute();
		$entries = $sth2->fetchAll(PDO::FETCH_ASSOC);

		print json_encode(['votes' => $results, 'entries' => $entries]);
	}
} else {
	echo "Failed to supply key";
}
?>
