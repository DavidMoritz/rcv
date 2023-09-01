<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = $_POST['id'];
$createdBy = $_POST['createdBy'];

if(!empty($ballotId)) {
// checking for blank values.
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
        `createdBy` = $createdBy
      AND 
        `id` = $ballotId
    );";
	$sth2 = $dbh->prepare($query2);
	$sth2->execute();
  echo $query2;
	$query = "
		DELETE FROM
			`ballots`
		WHERE
			`createdBy` = $createdBy
		AND 
			`id` = $ballotId;";
	$sth = $dbh->prepare($query);
	$sth->execute();
} else {
	echo "failed to supply ballotId";
}
?>
