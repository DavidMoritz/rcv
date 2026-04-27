<?php
require_once("config.php");

$errors = array();
$data = array();
$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (empty($errors)) {
	// Verify ballot ownership
	$sth = $dbh->prepare("SELECT id FROM ballots WHERE id = :ballotId AND createdBy = :createdBy");
	$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
	$sth->execute();
	if (!$sth->fetch()) {
		$errors['auth'] = 'Not authorized.';
	}
}

if (empty($errors)) {
	$sth = $dbh->prepare("
		SELECT rc.code, rc.id as codeId, bc.label,
			(SELECT v.date_created FROM votes v WHERE v.ballotId = :ballotId AND v.name = rc.code LIMIT 1) as votedAt,
			(SELECT v.vote_id FROM votes v WHERE v.ballotId = :ballotId3 AND v.name = rc.code LIMIT 1) as voteId
		FROM ballot_codes bc
		JOIN random_codes rc ON rc.id = bc.random_code_id
		WHERE bc.ballot_id = :ballotId2
		ORDER BY rc.code
	");
	$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->bindValue(':ballotId2', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->bindValue(':ballotId3', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->execute();
	$data['codes'] = $sth->fetchAll(PDO::FETCH_ASSOC);
}

if (!empty($errors)) {
	$data['errors'] = $errors;
}
echo json_encode($data);
?>
