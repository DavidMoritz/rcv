<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$acceptableFields = array("username", "email", "image", "password");

$columns = array();
$placeholders = array();
$params = array();

// Generate ID server-side (1-2 billion range to fit in MySQL INT)
$userId = random_int(1, 2000000000);
$columns[] = "`id`";
$placeholders[] = "?";
$params[] = $userId;

foreach ($_POST as $key => $val) {
	if(!in_array($key, $acceptableFields))
		continue;
	$columns[] = "`$key`";
	$placeholders[] = "?";
	$params[] = $val;
}

if(!empty($columns)) {
// checking for blank values.
	$columnsList = implode(", ", $columns);
	$placeholdersList = implode(", ", $placeholders);
	$query = "
		INSERT INTO
			users ($columnsList)
		VALUES
			($placeholdersList)
		ON DUPLICATE KEY UPDATE id=id
  ";
	$sth = $dbh->prepare($query);
	$sth->execute($params);

	// Return the user ID to the client
	echo json_encode(array('id' => $userId));
} else {
	echo json_encode(array('error' => 'failed to supply info'));
}
?>
