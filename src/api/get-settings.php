<?php
require_once("config.php");

$username = $_POST['username'];
$password = $_POST['password'];

if(!empty($username)) {
// checking for blank values.
	$query = "
		SELECT
			*
		FROM
			`settings`
		WHERE
			`clearance` <= (
				SELECT
					`clearance`
				FROM
					`users`
				WHERE
					`username` = '$username'
				AND
					`password` = '$password'
				LIMIT
					1
			)";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
} else {
	$query = "
		SELECT
			*
		FROM
			`settings`
		WHERE
			`clearance` = 1";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	print json_encode($results);
}
?>
