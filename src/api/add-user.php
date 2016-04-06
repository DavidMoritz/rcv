<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$acceptableFields = array("id", "name", "email", "image");

$columns = "";
$values = "";
$update = "";

function checkLen() {
	if(!empty($columns)) {
		$columns .= ", ";
		$values .= ", ";
		$update .= ", ";
	}
}

foreach ($_POST as $key => $val) {
	if(!in_array($key, $acceptableFields)) continue;

	checkLen();
	$columns .= "`$key`";
	$values .= "'$val'";
	$update .= "`$key` = VALUES(`$key`)";
}

if(!empty($columns)) {
// checking for blank values.
	$query = "
		INSERT INTO
			users ($columns)
		VALUES
			($values)
		ON DUPLICATE KEY UPDATE
			$update";
	$sth = $dbh->prepare($query);
	$sth->execute();
} else {
	echo "failed to supply info";
}
?>