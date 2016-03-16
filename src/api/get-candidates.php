<?php
require_once("config.php");

$key = $_GET['key'];

// if (!empty($key)) {
// 	$id = "(
// 		SELECT
// 			`id`
// 		FROM
// 			`ballots`
// 		WHERE
// 			`key` = '" . $key . "'
// 	)";
// } else {
// 	$id = $_GET['id'];
// }

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
			ballots.key = '$key';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
} else {
	echo "failed to supply KEY";
}
?>