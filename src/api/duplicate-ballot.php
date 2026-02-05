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
		 	$ballotId,
			`name`,
      `image`
     FROM entries
		 WHERE `ballotId` = $duplicateBallotId
		";
	for ($i=0; $i < $total; $i++) {
		$name = preg_replace('/[\'"\\\]/', '', $_POST['entries'][$i]);
		$query .= "($ballotId,'". $name ."', '". $_POST['images'][$i] ."'),";
	}
	$query = substr($query, 0, -1) . ";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	echo $query;
}
?>
