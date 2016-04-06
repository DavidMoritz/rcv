<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);
$createdBy = $_POST['id'];

if(!empty($createdBy)) {
	$query = "
		SELECT
			*
		FROM
			ballots
		WHERE
			createdBy = '$createdBy';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(strtolower($createdBy) == "guest") {
		echo "'guest' is not a valid entry";
	} else {
		print json_encode($results);
	}
} else {
	echo "failed to supply Created By";
}
?>