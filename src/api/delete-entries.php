<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = apiPost('id');
$createdBy = apiPost('createdBy');

if(!empty($ballotId)) {
// checking for blank values.
	$query = "
		DELETE FROM
			`entries`
		WHERE
			`ballotId` = (
			SELECT
				id
			FROM
				ballots
			WHERE
				`id` = $ballotId
			AND
				`createdBy` = '$createdBy';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
} else {
	echo "failed to supply ballotId";
}
?>