<?php
require_once("config.php");

$errors = array();
$data = array();

$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['currentOwnerId']))
	$errors['currentOwnerId'] = 'Current owner ID is required.';

if (!isset($_POST['newOwnerUsername']) || trim($_POST['newOwnerUsername']) === '')
	$errors['newOwnerUsername'] = 'New owner username is required.';

if (!empty($errors)) {
	echo json_encode(array('data' => $data, 'errors' => $errors));
} else {
	$query = "
		SELECT id
		FROM users
		WHERE username = :username";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':username', $_POST['newOwnerUsername'], PDO::PARAM_STR);
	$sth->execute();
	$user = $sth->fetch(PDO::FETCH_ASSOC);

	if ($user) {
		$newOwnerId = $user['id'];
		$message = 'Ballot transferred to ' . $_POST['newOwnerUsername'] . '.';
	} else {
		$newOwnerId = 'guest';
		$message = 'User not found. Ballot transferred to guest.';
	}

	$query = "
		UPDATE ballots
		SET createdBy = :newOwnerId
		WHERE id = :ballotId
		AND createdBy = :currentOwnerId";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':newOwnerId', $newOwnerId, PDO::PARAM_STR);
	$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->bindValue(':currentOwnerId', $_POST['currentOwnerId'], PDO::PARAM_STR);
	$sth->execute();

	if ($sth->rowCount() > 0) {
		$data['success'] = true;
		$data['message'] = $message;
	} else {
		$errors['ballot'] = 'Ballot not found or not owned by you.';
	}

	echo json_encode(array('data' => $data, 'errors' => $errors));
}
?>
