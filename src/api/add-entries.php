<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
$ballotId = intval(apiPost('ballotId'));

if (!empty(apiPost('entries'))) {
	$total = count(apiPost('entries'));
	if ($total < 2)
		$errors['entryInput'] = 'At least two entries are required.';
} else {
	$errors['entryInput'] = 'Entries are required.';
}

if (empty($ballotId))
	$errors['ballotId'] = 'Ballot ID is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			entries (`ballotId`, `name`)
		VALUES ";
	for ($i=0; $i < $total; $i++) {
		$query .= "($ballotId,'". apiPost('entries')[$i] ."'),";
	}
	$query = substr($query, 0, -1) . ";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	echo "Success";
}
?>