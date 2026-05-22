<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = $_POST['id'];
$createdBy = $_POST['createdBy'];

if(!empty($ballotId)) {
	// Delete RCVis visualization if one exists
	$rcvisSth = $dbh->prepare("
		SELECT b.rcvisId, u.rcvisInfo
		FROM ballots b
		JOIN users u ON u.id = b.createdBy
		WHERE b.id = :ballotId AND b.createdBy = :createdBy AND b.rcvisId IS NOT NULL");
	$rcvisSth->execute([':ballotId' => $ballotId, ':createdBy' => $createdBy]);
	$rcvisRow = $rcvisSth->fetch(PDO::FETCH_ASSOC);
	if ($rcvisRow) {
		$apiKey = defined('APIKEY') ? APIKEY : '';
		if (!empty($rcvisRow['rcvisInfo'])) {
			$info = json_decode($rcvisRow['rcvisInfo'], true);
			if ($info && !empty($info['apiKey'])) {
				$apiKey = $info['apiKey'];
			}
		}
		if ($apiKey) {
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, 'https://www.rcvis.com/api/visualizations/' . $rcvisRow['rcvisId'] . '/');
			curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'DELETE');
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
			curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . $apiKey));
			curl_exec($ch);
		}
	}

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
