<?php
require_once("config.php");

$ballotId = $_GET['ballotId'];

if(!empty($ballotId)) {
// checking for blank values.
	$query = "
		DELETE FROM 
			`entries` 
		WHERE 
			`ballotId` = $ballotId
		LIMIT
			1;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
} else {
	echo "failed to supply ballotId";
}
?>