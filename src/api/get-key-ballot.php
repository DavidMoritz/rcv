<?php
require_once("config.php");

$key = $_GET['key'];

if(!empty($key)) {
// checking for blank values.
	$query = "
		SELECT
			`key`
		FROM
			`ballots`
		WHERE
			`key` = :key
		LIMIT
			1;";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':key', $key, PDO::PARAM_STR);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
} else {
	echo "failed to supply Key";
}
?>
