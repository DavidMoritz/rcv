<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['name']))
	$errors['name'] = 'Name is required.';

if (empty($_POST['positions']))
	$errors['positions'] = 'Positions is required.';

if (empty($_POST['created']))
	$errors['created'] = 'Created is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO 
			ballots (`name`, `positions`, `created_by`)
		VALUES 
			('". $_POST['name'] ."','". $_POST['positions'] ."','". $_POST['created'] ."');";
	
	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $dbh->lastInsertId();
}
?>