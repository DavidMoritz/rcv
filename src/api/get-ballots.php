<?php
require_once("config.php");

// checking for blank values.
	$query = "
		SELECT
			`id`,
			`name`,
			`vote_cutoff`
		FROM 
			`ballots` 
		WHERE 
			`vote_cutoff` >= NOW()
		OR 
			`vote_cutoff` IS NULL;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
?>