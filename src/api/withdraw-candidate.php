<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);
$errors = array();
$data = array();

if (empty($_POST['entryId']))
	$errors['entryId'] = 'Entry ID is required.';

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (!isset($_POST['withdraw']))
	$errors['withdraw'] = 'Withdraw flag is required.';

if ($_POST['withdraw'] && empty($_POST['reason']))
	$errors['reason'] = 'Reason is required.';

if (!empty($errors)) {
	echo json_encode(['errors' => $errors]);
	exit;
}

// Verify ballot exists and createdBy matches
$sth = $dbh->prepare("SELECT id, createdBy, resultsRelease FROM ballots WHERE id = :ballotId");
$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
$sth->execute();
$ballot = $sth->fetch(PDO::FETCH_ASSOC);

if (!$ballot || $ballot['createdBy'] !== $_POST['createdBy']) {
	$errors['ballotId'] = 'Ballot not found or not owned by you.';
	echo json_encode(['errors' => $errors]);
	exit;
}

// Verify results NOT released: resultsRelease must be non-null AND in the future
$now = gmdate('Y-m-d H:i:s');
if ($ballot['resultsRelease'] === null || $ballot['resultsRelease'] <= $now) {
	$errors['resultsRelease'] = 'Results have already been released.';
	echo json_encode(['errors' => $errors]);
	exit;
}

// Verify entry belongs to the ballot
$sth = $dbh->prepare("SELECT entry_id FROM entries WHERE entry_id = :entryId AND ballotId = :ballotId");
$sth->bindValue(':entryId', $_POST['entryId'], PDO::PARAM_INT);
$sth->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
$sth->execute();
if (!$sth->fetch()) {
	$errors['entryId'] = 'Entry not found on this ballot.';
	echo json_encode(['errors' => $errors]);
	exit;
}

if ($_POST['withdraw']) {
	$reason = mb_substr(trim($_POST['reason']), 0, 256);
	$sth = $dbh->prepare("UPDATE entries SET withdrawnAt = :now, withdrawnReason = :reason WHERE entry_id = :entryId");
	$sth->bindValue(':now', $now, PDO::PARAM_STR);
	$sth->bindValue(':reason', $reason, PDO::PARAM_STR);
	$sth->bindValue(':entryId', $_POST['entryId'], PDO::PARAM_INT);
	$sth->execute();
} else {
	$sth = $dbh->prepare("UPDATE entries SET withdrawnAt = NULL, withdrawnReason = '' WHERE entry_id = :entryId");
	$sth->bindValue(':entryId', $_POST['entryId'], PDO::PARAM_INT);
	$sth->execute();
}

$data['success'] = true;
echo json_encode(['data' => $data]);
?>
