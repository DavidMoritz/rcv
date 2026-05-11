<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = $_POST['id'];
$createdBy = $_POST['createdBy'];

if(!empty($ballotId)) {
	// Delete voter group options (via field_id subquery)
	$dbh->prepare("
		DELETE FROM voter_group_options WHERE field_id IN (
			SELECT vgf.id FROM voter_group_fields vgf
			JOIN ballots b ON b.id = vgf.ballot_id
			WHERE b.createdBy = :createdBy AND b.id = :ballotId
		)
	")->execute([':createdBy' => $createdBy, ':ballotId' => $ballotId]);

	// Delete voter group fields
	$dbh->prepare("
		DELETE FROM voter_group_fields WHERE ballot_id = (
			SELECT id FROM ballots WHERE createdBy = :createdBy AND id = :ballotId
		)
	")->execute([':createdBy' => $createdBy, ':ballotId' => $ballotId]);

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
