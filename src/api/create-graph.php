<?php
require_once("config.php");

$key = $_GET['key'];

if ($key) {
	$query = "
		UPDATE
			ballots
		SET
			showGraph = 1,
      voteCutoff = UTC_TIMESTAMP(),
      graphUpdated = UTC_TIMESTAMP()
		WHERE
			`key` = :key
		AND NOT EXISTS (
			SELECT 1 FROM ballot_management_tokens
			WHERE ballot_management_tokens.ballot_id = ballots.id
		);";

	$sth = $dbh->prepare($query);
	$sth->execute([':key' => $key]);
}
?>
