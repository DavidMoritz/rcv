<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);
$errors = array();
$data = array();

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (!empty($errors)) {
	echo json_encode(['errors' => $errors]);
	exit;
}

$now = gmdate('Y-m-d H:i:s');

$sth = $dbh->prepare("
	UPDATE ballots
	SET voteCutoff = :now, resultsRelease = :now2
	WHERE id = :ballotId AND createdBy = :createdBy
");
$sth->bindValue(':now', $now, PDO::PARAM_STR);
$sth->bindValue(':now2', $now, PDO::PARAM_STR);
$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
$sth->execute();

$data['success'] = $sth->rowCount() > 0;
echo json_encode($data);
?>
