<?php
require_once("config.php");

$key = $_GET['key'];

if (!empty($key)) {
	$id = "(
		SELECT
			`id`
		FROM
			`ballots`
		WHERE
			`key` = '" . $key . "'
	)";
} else {
	$id = $_GET['id'];
}

if(!empty($id)) {
// checking for blank values.
	$query = "
		SELECT
			`name`, `ballot_id`
		FROM
			`entries`
		WHERE
			`ballotId` = ". $id .";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
} else {
	echo "failed to supply ID or KEY";
}
?>