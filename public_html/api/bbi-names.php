<?php
require_once("config.php");
header("Access-Control-Allow-Origin: *");

// checking for blank values.
	$query = "
		SELECT
      `name`
    FROM
			votes
		WHERE
			ballotId = 27713
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
?>
