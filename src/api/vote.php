<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
$_POST = json_decode(file_get_contents('php://input'), true);
$key = $_POST['key'];
$id = $_POST['id'];

// checking for blank values.
if (empty($key))
	$errors['key'] = 'Key is required.';

if (empty($_POST['vote']))
	$errors['vote'] = 'Vote is required.';

if (empty($_POST['name'])) {
  $inName = '';
	$name = '';
} else {
  $inName = ', `name`';
  $name = ",'" . substr(preg_replace(array('/[^a-zA-Z0-9-]/', '/ +/', '/^-|-$/'), array(' ', ' ', ''), $_POST['name']), 0, 40) . "'";
}

if (empty($id)) {
  // Need to fetch ballot id from key using secure parameterized query
  $subQuery = "SELECT id FROM ballots WHERE `key` = :key";
  $subSth = $dbh->prepare($subQuery);
  $subSth->bindValue(':key', $key, PDO::PARAM_STR);
  $subSth->execute();
  $result = $subSth->fetch(PDO::FETCH_ASSOC);
  $id = $result['id'];
}

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			votes (`ballotId`, `date_created`, `vote`, `voteIds`, `ipAddress`$inName)
		VALUES
			(:ballotId, NOW(), :vote, :voteIds, :ipAddress" . (empty($_POST['name']) ? "" : ", :name") . ")
    ;
  ";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':ballotId', $id, PDO::PARAM_INT);
	$sth->bindValue(':vote', $_POST['vote'], PDO::PARAM_STR);
	$sth->bindValue(':voteIds', $_POST['voteIds'], PDO::PARAM_STR);
	$sth->bindValue(':ipAddress', $_SERVER['REMOTE_ADDR'], PDO::PARAM_STR);
	if (!empty($_POST['name'])) {
		$sanitizedName = substr(preg_replace(array('/[^a-zA-Z0-9-]/', '/ +/', '/^-|-$/'), array(' ', ' ', ''), $_POST['name']), 0, 40);
		$sth->bindValue(':name', $sanitizedName, PDO::PARAM_STR);
	}
	$sth->execute();
}
?>
