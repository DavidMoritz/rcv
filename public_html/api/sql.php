<?php
require_once("config.php");

// checking for blank values.
	$query = "
		SELECT
      *
    FROM
			entries
    WHERE
      ballotId = 27713
  ";

// 	$query = "
// 		INSERT INTO
// 			entries (ballotId, `name`, image, color)
//     VALUES
//        ('27713', 'R - Ryan Brinkley', '', 'FFCCCB')
//   ";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
?>
