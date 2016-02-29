<?php
require_once("config.php");

$id = $_GET['id'];

if(!empty($id)) {
// checking for blank values.
	$query = "
		SELECT
			`name`
		FROM 
			`entries` 
		WHERE 
			`ballotId` = ". $id .";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
} else {
	echo "failed to supply ID";
}
?>