<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
$ballotId = intval($_POST['ballotId']);
$duplicateBallotId = intval($_POST['duplicateBallotId']);

if (empty($ballotId))
	$errors['ballotId'] = 'Ballot ID is required.';
if (empty($duplicateBallotId))
	$errors['duplicateBallotId'] = 'Duplicate Ballot ID is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			entries (`ballotId`, `name`, `image`)
     SELECT
		 	?,
			`name`,
      `image`
     FROM entries
		 WHERE `ballotId` = ?";
	$sth = $dbh->prepare($query);
	$sth->execute(array($ballotId, $duplicateBallotId));
	echo "Success";
}
?>
