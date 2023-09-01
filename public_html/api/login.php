<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['username']))
	$errors['username'] = 'Name is required.';

if (empty($_POST['password']))
	$errors['password'] = 'Password is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
// checking for blank values.
	$query = "
		SELECT *
    FROM users
		WHERE
      username = '". $_POST['username'] ."'
    AND
      password = '". $_POST['password'] ."';";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results))
		echo "Incorrect username and/or password";
	else
		print json_encode($results);
}