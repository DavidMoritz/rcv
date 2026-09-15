<?php
require_once("config.php");

$errors = array();
$data = array();
$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['sourceBallotId']))
	$errors['sourceBallotId'] = 'Source Ballot ID is required.';

if (empty($_POST['targetBallotId']))
	$errors['targetBallotId'] = 'Target Ballot ID is required.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (empty($errors)) {
	// Verify source ballot ownership and is secure with codes
	$sth = $dbh->prepare("SELECT id, isSecure FROM ballots WHERE id = :ballotId AND createdBy = :createdBy");
	$sth->bindValue(':ballotId', $_POST['sourceBallotId'], PDO::PARAM_INT);
	$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
	$sth->execute();
	$source = $sth->fetch(PDO::FETCH_ASSOC);
	if (!$source) {
		$errors['auth'] = 'Not authorized for source ballot.';
	} elseif (!$source['isSecure']) {
		$errors['source'] = 'Source ballot is not a secure ballot.';
	}
}

if (empty($errors)) {
	// Verify target ballot ownership
	$sth = $dbh->prepare("SELECT id FROM ballots WHERE id = :ballotId AND createdBy = :createdBy");
	$sth->bindValue(':ballotId', $_POST['targetBallotId'], PDO::PARAM_INT);
	$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
	$sth->execute();
	if (!$sth->fetch()) {
		$errors['auth'] = 'Not authorized for target ballot.';
	}
}

if (empty($errors)) {
	$sth = $dbh->prepare("
		INSERT IGNORE INTO ballot_codes (ballot_id, random_code_id, label)
		SELECT :targetId, random_code_id, label
		FROM ballot_codes WHERE ballot_id = :sourceId
	");
	$sth->bindValue(':targetId', $_POST['targetBallotId'], PDO::PARAM_INT);
	$sth->bindValue(':sourceId', $_POST['sourceBallotId'], PDO::PARAM_INT);
	$sth->execute();
	$data['success'] = true;
	$data['count'] = $sth->rowCount();
}

if (!empty($errors)) {
	$data['errors'] = $errors;
}
echo json_encode($data);
?>
