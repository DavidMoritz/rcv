<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['vote']))
	$errors['vote'] = 'Vote is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO 
			votes (`ballotId`, `vote`, `ipAddress`)
		VALUES 
			(". $_POST['ballotId'] .",'". $_POST['vote'] ."','". $_SERVER['REMOTE_ADDR'] ."');";
	$sth = $dbh->prepare($query);
	$sth->execute();
}
?>