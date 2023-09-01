<?php
require_once("config.php");

$key = $_GET['key'];

if ($key) {
	$query = "
		UPDATE
			ballots
		SET
			showGraph = 1,
      voteCutoff = NOW()
		WHERE
			`key` = '$key';";

	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $query;
}
?>
