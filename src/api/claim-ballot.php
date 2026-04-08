<?php
require_once("config.php");

$errors = array();
$data = array();

$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['userId']))
	$errors['userId'] = 'User ID is required.';

if (!empty($errors)) {
	echo json_encode(array('data' => $data, 'errors' => $errors));
} else {
	$query = "
		UPDATE
			ballots
		SET
			createdBy = :userId
		WHERE
			id = :ballotId
		AND
			createdBy = 'guest';";

	$sth = $dbh->prepare($query);
	$sth->bindValue(':userId', $_POST['userId'], PDO::PARAM_STR);
	$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->execute();

	if ($sth->rowCount() > 0) {
		$data['success'] = true;
	} else {
		$errors['ballot'] = 'Ballot not found or already claimed.';
	}

	echo json_encode(array('data' => $data, 'errors' => $errors));
}
?>
