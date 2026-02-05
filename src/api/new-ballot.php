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

if (!empty($_POST['tieBreak']))
	$tieBreak = $_POST['tieBreak'];
else
	$tieBreak = "random";

if (!empty($_POST['register']))
	$register = intval($_POST['register']);
else
	$register = 0;

if (!empty($_POST['allowCustom']))
	$allowCustom = intval($_POST['allowCustom']);
else
	$allowCustom = 0;

if (!empty($_POST['hideNames']))
	$hideNames = intval($_POST['hideNames']);
else
	$hideNames = 0;

if (!empty($_POST['hideDetails']))
	$hideDetails = intval($_POST['hideDetails']);
else
	$hideDetails = 0;

if (!empty($_POST['showGraph']))
	$showGraph = intval($_POST['showGraph']);
else
	$showGraph = 0;

if (empty($_POST['maxVotes']))
	$maxVotes = "NULL";
else
	$maxVotes = intval($_POST['maxVotes']);

if (empty($_POST['sqlVoteCutoff']))
	$errors['voteCutoff'] = 'VoteCutoff is required.';

if (empty($_POST['sqlResultsRelease']))
	$errors['resultsRelease'] = 'ResultsRelease is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();
	$query = "
		INSERT INTO
			ballots (`name`, `timeCreated`, `key`, `positions`, `createdBy`, `resultsRelease`, `voteCutoff`, `requireSignIn`, `tieBreak`, `register`, `allowCustom`, `hideNames`, `hideDetails`, `showGraph`, `maxVotes`)
		VALUES
			('". addslashes($_POST['name']) ."', NOW(), '". addslashes($_POST['key']) ."',". $_POST['positions'] .",'". $_POST['createdBy'] ."', '". $_POST['sqlResultsRelease'] ."', '". $_POST['sqlVoteCutoff'] ."', $requireSignIn, '$tieBreak', $register, $allowCustom, $hideNames, $hideDetails, $showGraph, $maxVotes);";

	$sth = $dbh->prepare($query);
//   echo $query;
	$sth->execute();
	echo $dbh->lastInsertId();
}
?>
