<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);
$errors = array();

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['code']))
	$errors['code'] = 'Code is required.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (!empty($errors)) {
	echo json_encode(['errors' => $errors]);
	exit;
}

// Verify ballot ownership
$sth = $dbh->prepare("SELECT id FROM ballots WHERE id = :ballotId AND createdBy = :createdBy");
$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
$sth->execute();
if (!$sth->fetch()) {
	echo json_encode(['errors' => ['auth' => 'Not authorized.']]);
	exit;
}

// Ensure no vote exists for this code
$voteCheck = $dbh->prepare("SELECT 1 FROM votes WHERE ballotId = :ballotId AND name = :code LIMIT 1");
$voteCheck->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
$voteCheck->bindValue(':code', $_POST['code'], PDO::PARAM_STR);
$voteCheck->execute();
if ($voteCheck->fetch()) {
	echo json_encode(['errors' => ['voted' => 'Cannot delete a code that has been used to vote.']]);
	exit;
}

// Delete the code assignment (not the random_code itself)
$sth = $dbh->prepare("
	DELETE FROM ballot_codes
	WHERE ballot_id = :ballotId
	AND random_code_id = (SELECT id FROM random_codes WHERE code = :code)
");
$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
$sth->bindValue(':code', $_POST['code'], PDO::PARAM_STR);
$sth->execute();

echo json_encode(['success' => $sth->rowCount() > 0]);
?>
