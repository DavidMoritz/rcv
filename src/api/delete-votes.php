<?php
require_once("config.php");

$ballotId = $_POST['id'];

if(!empty($ballotId)) {
// checking for blank values.
	$query = "
		DELETE FROM 
			`votes` 
		WHERE 
			`ballotId` = $ballotId;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
} else {
	echo "failed to supply ballotId";
}
?>