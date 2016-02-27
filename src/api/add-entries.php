<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.

if (!empty($_POST['entries'])) {
	$total = count($_POST['entries']);
	if ($total < 2)
		$errors['entryInput'] = 'At least two entries are required.';
} else {
	$errors['entryInput'] = 'Entries are required.';
}

if (empty($_POST['ballot_id']))
	$errors['ballot_id'] = 'Ballot ID is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO 
			entries (`ballot_id`, `name`)
		VALUES ";
	for ($i=0; $i < $total; $i++) { 
		$query .= "('". $_POST['ballot_id'] ."','". $_POST['entries'][$i] ."'),";
	}
	$query = substr($query, 0, -1) . ";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	echo "Success";
}
?>