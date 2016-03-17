<?php
require_once("config.php");

$created = $_GET['createdBy'];

if(!empty($created)) {
	$query = "
		SELECT
			*
		FROM 
			ballots
		WHERE 
			createdBy = '$created';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(strtolower($created) == "guest") {
		echo "'guest' is not a valid entry";
	} else {
		print json_encode($results);
	}
} else {
	echo "failed to supply Created By";
}
?>