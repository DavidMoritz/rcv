<?php
require_once("config.php");

$createdBy = $_GET['createdBy'];

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