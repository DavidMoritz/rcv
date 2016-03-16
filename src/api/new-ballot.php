<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['name']))
	$errors['name'] = 'Name is required.';

if (empty($_POST['key']))
	$errors['key'] = 'Key is required.';

if (empty($_POST['positions']))
	$errors['positions'] = 'Positions is required.';
else if (intval($_POST['positions']) < 1)
	$errors['positions'] = 'Positions must be a valid number.';

if (empty($_POST['created']))
	$errors['created'] = 'Created is required.';

if (empty($_POST['voteCutoff']))
	$cutoff = "NULL";
else
	$cutoff = "'". date("Y-m-d H:i:s", strtotime($_POST['voteCutoff'])) ."'";

if (empty($_POST['resultsRelease']))
	$release = "NULL";
else
	$release = "'". date("Y-m-d H:i:s", strtotime($_POST['resultsRelease'])) ."'";

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			ballots (`name`, `key`, `positions`, `createdBy`, `resultsRelease`, `voteCutoff`)
		VALUES
			('". $_POST['name'] ."','". $_POST['key'] ."','". $_POST['positions'] ."','". $_POST['created'] ."', ". $release .", ". $cutoff .");";

	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $dbh->lastInsertId();
}
?>