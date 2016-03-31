<?php
require_once("config.php");

$key = $_GET['key'];

if(!empty($key)) {
	$query = "
		SELECT
			b.key, b.name, b.positions, e.name AS 'candidate'
		FROM
			entries e
		JOIN
			ballots b
		ON
			e.ballotId = b.id
		WHERE
			b.key = '$key'
		AND
			b.voteCutoff >= NOW();";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results))
		echo "Either shortcode is incorrect or voting has already been cutoff";
	else
		print json_encode($results);
} else {
	echo "failed to supply Shortcode";
}
?>