<?php
require_once("config.php");

$errors = array();
$data = array();
$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['ballotId']) || empty($_POST['code']) || empty($_POST['createdBy'])) {
	$errors['params'] = 'Missing required fields.';
}

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
	$label = isset($_POST['label']) ? $_POST['label'] : '';
	$sth = $dbh->prepare("
		UPDATE ballot_codes
		SET label = :label
		WHERE ballot_id = :ballotId
		AND random_code_id = (SELECT id FROM random_codes WHERE code = :code)
	");
	$sth->bindValue(':label', $label, PDO::PARAM_STR);
	$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
	$sth->bindValue(':code', $_POST['code'], PDO::PARAM_STR);
	$sth->execute();
	$data['success'] = true;
}

if (!empty($errors)) {
	$data['errors'] = $errors;
}
echo json_encode($data);
?>
