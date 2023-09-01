<?php
require_once("config.php");

// checking for blank values.
	$query = "
		SELECT
      id, UPPER(code) AS 'code'
    FROM
			random_codes
    ORDER BY
      id
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
?>
