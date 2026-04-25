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
      username = :username
    AND
      password = :password";
  $sth = $dbh->prepare($query);
  $sth->bindValue(':username', $_POST['username'], PDO::PARAM_STR);
  $sth->bindValue(':password', $_POST['password'], PDO::PARAM_STR);
  $sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results)) {
		http_response_code(401);
		echo json_encode(['error' => 'Incorrect username and/or password']);
	} else
		print json_encode($results);
}