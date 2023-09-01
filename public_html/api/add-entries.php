<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
$ballotId = intval($_POST['ballotId']);

if (!empty($_POST['entries'])) {
	$total = count($_POST['entries']);
	$imgTotal = count($_POST['images']);
	if ($total < 2)
		$errors['entryInput'] = 'At least two entries are required.';
  if ($total != $imgTotal)
		$errors['imgTotal'] = 'Must be as many images as entries.'; 
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
			entries (`ballotId`, `name`, `image`)
		VALUES ";
	for ($i=0; $i < $total; $i++) {
		$name = preg_replace('/[\'"\\\]/', '', $_POST['entries'][$i]);
		$query .= "($ballotId,'". $name ."','". $_POST['images'][$i] ."'),";
	}
	$query = substr($query, 0, -1) . ";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	echo "Success";
}
?>
