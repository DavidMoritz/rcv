<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$userId = $_POST['id'];
$username = $_POST['username'];
$password = $_POST['password'];

if(!empty($userId) && !empty($username) && !empty($password)) {
// checking for blank values.
	$query = "
		SET @clearance = (
			SELECT
				clearance
			FROM
				users
			WHERE
				`username` = '$username'
			AND 
				`password` = '$password'
			LIMIT
				1
		);
		DELETE FROM
			`users`
		WHERE
			`id` = '$userId'
		AND 
			`clearance` <= @clearance;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);
	if(count(results) = 0) {

	}
} else {
	echo "failed to supply either userId, username, or password";
}
?>
