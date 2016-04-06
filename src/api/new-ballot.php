<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty(apiPost('name')))
	$errors['name'] = 'Name is required.';

if (empty(apiPost('key')))
	$errors['key'] = 'Key is required.';

if (empty(apiPost('positions')))
	$errors['positions'] = 'Positions is required.';
else if (intval(apiPost('positions')) < 1)
	$errors['positions'] = 'Positions must be a valid number.';

if (empty(apiPost('createdBy')))
	$errors['createdBy'] = 'Created By is required.';

if (empty(apiPost('password')))
	$password = "NULL";
else
	$password = "'". apiPost('password') ."'";

if (empty(apiPost('voteCutoff')))
	$cutoff = "NULL";
else
	$cutoff = "'". apiPost('voteCutoff') ."'";

if (empty(apiPost('resultsRelease')))
	$release = "NULL";
else
	$release = "'". apiPost('resultsRelease') ."'";

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			ballots (`name`, `key`, `positions`, `createdBy`, `resultsRelease`, `voteCutoff`)
		VALUES
			('". apiPost('name') ."','". apiPost('key') ."',". apiPost('positions') .",'". apiPost('createdBy') ."', ". $release .", ". $cutoff .");";

	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $dbh->lastInsertId();
}
?>