<?php
require_once("config.php");

$created = $_GET['created'];

if(!empty($created)) {
// checking for blank values.
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
	print json_encode($results);
} else {
	echo "failed to supply Created By";
}
?>