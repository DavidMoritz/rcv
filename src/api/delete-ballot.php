<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = $_POST['id'];
$createdBy = $_POST['createdBy'];

if(!empty($ballotId)) {
	$query2 = "
		DELETE FROM
			`entries`
    WHERE
      `ballotId` = (
      SELECT
        `id`
      FROM
        `ballots`
      WHERE
        `createdBy` = :createdBy
      AND
        `id` = :ballotId
    );";
	$sth2 = $dbh->prepare($query2);
	$sth2->execute([':createdBy' => $createdBy, ':ballotId' => $ballotId]);

	$query = "
		DELETE FROM
			`ballots`
		WHERE
			`createdBy` = :createdBy
		AND
			`id` = :ballotId;";
	$sth = $dbh->prepare($query);
	$sth->execute([':createdBy' => $createdBy, ':ballotId' => $ballotId]);
} else {
	echo "failed to supply ballotId";
}
?>
