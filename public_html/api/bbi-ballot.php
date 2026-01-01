<?php
require_once("config.php");
header("Access-Control-Allow-Origin: *");

$code = $_GET["code"];

if(!$code) {
  echo 'ERROR: Please supply a code.';
} else {

// checking for blank values.
	$query = "
		SELECT
      *
    FROM
			votes
		WHERE
			ballotId = 36913
    AND
      `name` LIKE '$code%'
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
}
?>