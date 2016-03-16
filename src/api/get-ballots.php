<?php
require_once("config.php");

echo "Not operational at this time";

// checking for blank values.
	$query = "
		SELECT
			`id`,
			`name`,
			`voteCutoff`,
			`positions`
		FROM 
			`ballots` 
		WHERE 
			`voteCutoff` >= NOW()
		OR 
			`voteCutoff` IS NULL;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	//print json_encode($results);
?>