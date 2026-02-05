<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$acceptableFields = array("id", "username", "email", "image", "password");

$columns = "";
$values = "";
$update = "";

foreach ($_POST as $key => $val) {
	if(!in_array($key, $acceptableFields))
		continue;
	else if(!empty($columns)) {
		$columns .= ", ";
		$values .= ", ";
		$update .= ", ";
	}
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
		ON DUPLICATE KEY UPDATE id=id
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
} else {
	echo "failed to supply info";
	$query = "
		show tables;";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
}
?>
