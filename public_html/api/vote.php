<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);
$key = $_POST['key'];

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

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			votes (`ballotId`, `vote`, `voteIds`, `ipAddress`$inName)
		VALUES
			((
			SELECT
				id
			FROM
				ballots
			WHERE
				`key` = '$key'
			),
			'". $_POST['vote'] ."','". $_POST['voteIds'] ."','". $_SERVER['REMOTE_ADDR'] ."'$name);";
	$sth = $dbh->prepare($query);
	$sth->execute();
}
?>
