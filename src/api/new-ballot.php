<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
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

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (empty($_POST['requireSignIn']))
	$requireSignIn = "0";
else
	$requireSignIn = "1";

if (empty($_POST['tieBreak']))
	$tieBreak = $_POST['tieBreak'];
else
	$tieBreak = "random";

if (empty($_POST['maxVotes']))
	$maxVotes = "NULL";
else
	$maxVotes = intval($_POST['maxVotes']);

if (empty($_POST['voteCutoff']))
	$errors['voteCutoff'] = 'VoteCutoff is required.';

if (empty($_POST['resultsRelease']))
	$errors['resultsRelease'] = 'ResultsRelease is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			ballots (`name`, `key`, `positions`, `createdBy`, `resultsRelease`, `voteCutoff`, `requireSignIn`, `tieBreak`, `maxVotes`)
		VALUES
			('". $_POST['name'] ."','". $_POST['key'] ."',". $_POST['positions'] .",'". $_POST['createdBy'] ."', '". $_POST['resultsRelease'] ."', '". $_POST['voteCutoff'] ."', $requireSignIn, '$tieBreak', $maxVotes);";

	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $dbh->lastInsertId();
}
?>