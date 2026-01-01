<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['id']) || empty($_POST['key']))
	$errors['key'] = 'Key is required';

if (empty($_POST['name']))
	$errors['name'] = 'Name is required.';

if (empty($_POST['positions']))
	$errors['positions'] = 'Positions is required.';
else if (intval($_POST['positions']) < 1)
	$errors['positions'] = 'Positions must be a valid number.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (empty($_POST['sqlVoteCutoff']))
	$cutoff = "NULL";
else
	$cutoff = "'". $_POST['sqlVoteCutoff'] ."'";

if (empty($_POST['sqlResultsRelease']))
	$release = "NULL";
else
	$release = "'". $_POST['sqlResultsRelease'] ."'";

if (!empty($_POST['register']))
	$register = "register = " . $_POST['register'] . ",";
else
	$register = "";

if (!empty($_POST['allowCustom']))
	$allowCustom = "allowCustom = " . $_POST['allowCustom'] . ",";
else
	$allowCustom = "";

if (!empty($_POST['showGraph']))
	$showGraph = "showGraph = " . $_POST['showGraph'] . ",";
else
	$showGraph = "";

if (!empty($_POST['requireSignIn']))
	$requireSignIn = "requireSignIn = " . $_POST['requireSignIn'] . ",";
else
	$requireSignIn = "";

if (!empty($_POST['hideNames']))
	$hideNames = "hideNames = " . $_POST['hideNames'] . ",";
else
	$hideNames = "";

if (!empty($_POST['hideDetails']))
	$hideDetails = "hideDetails = " . $_POST['hideDetails'] . ",";
else
	$hideDetails = "";

if (!empty($_POST['tieBreak']))
	$tieBreak = "tieBreak = '" . $_POST['tieBreak'] . "',";
else
	$tieBreak = "";

if (!empty($_POST['key']))
	$key = "`key` = '" . $_POST['key'] . "',";
else
	$key = "";

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
			positions = ". $_POST['positions'] .",
			resultsRelease = $release,
			$key
			$tieBreak
			$register
      $hideNames
      $hideDetails
      $allowCustom
      $requireSignIn
      $showGraph
			voteCutoff = $cutoff
		WHERE
			createdBy = '". $_POST['createdBy'] ."'
		AND
			id = ". $_POST['id'] .";";

	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $query;
}
?>
