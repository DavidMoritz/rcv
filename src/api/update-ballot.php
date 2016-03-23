<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if(empty($_POST['id']) || empty($_POST['key']))
	$errors['key'] = 'Key is required';

if (empty($_POST['name']))
	$errors['name'] = 'Name is required.';

if (empty($_POST['positions']))
	$errors['positions'] = 'Positions is required.';
else if (intval($_POST['positions']) < 1)
	$errors['positions'] = 'Positions must be a valid number.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (empty($_POST['voteCutoff']))
	$cutoff = "NULL";
else
	$cutoff = "'". $_POST['voteCutoff'] ."'";

if (empty($_POST['resultsRelease']))
	$release = "NULL";
else
	$release = "'". $_POST['resultsRelease'] ."'";

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		UPDATE
			ballots
		SET 
			name = '". $_POST['name'] ."',
			positions = '". $_POST['positions'] ."', 
			createdBy = '". $_POST['createdBy'] ."', 
			resultsRelease = $release, 
			voteCutoff = $cutoff
		WHERE
			`key` = '". $_POST['key'] ."'
		AND
			id = ". $_POST['id'] .";";

	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $query;
}
?>