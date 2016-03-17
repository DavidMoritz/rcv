<?php
require_once("config.php");

$key = $_GET['key'];
$password = $_GET['password'] ? "= '" . $_GET['password'] . "'" : "IS NULL";

if(!empty($key)) {
	$query = "
		SELECT
			*, entries.name AS 'candidate'
		FROM
			entries
		JOIN
			ballots
		ON
			entries.ballotId = ballots.id  
		WHERE
			ballots.key = '$key'
		AND
			ballots.password $password;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
} else {
	echo "failed to supply KEY";
}
?>