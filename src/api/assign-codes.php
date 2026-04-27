<?php
require_once("config.php");

$errors = array();
$data = array();
$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['count']) || intval($_POST['count']) < 1)
	$errors['count'] = 'Count must be at least 1.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

$count = min(intval($_POST['count'] ?? 0), 500);

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
	// Pick random codes not used by any ballot created in the last 6 months
	$sth = $dbh->prepare("
		SELECT id, code FROM random_codes
		WHERE id NOT IN (
			SELECT bc.random_code_id FROM ballot_codes bc
			JOIN ballots b ON b.id = bc.ballot_id
			WHERE b.timeCreated > DATE_SUB(NOW(), INTERVAL 6 MONTH)
		)
		ORDER BY RAND() LIMIT :count
	");
	$sth->bindValue(':count', $count, PDO::PARAM_INT);
	$sth->execute();
	$codes = $sth->fetchAll(PDO::FETCH_ASSOC);

	if (count($codes) < $count) {
		$errors['codes'] = 'Not enough available codes.';
	} else {
		$insert = $dbh->prepare("INSERT INTO ballot_codes (ballot_id, random_code_id) VALUES (:ballotId, :codeId)");
		foreach ($codes as $code) {
			$insert->bindValue(':ballotId', $_POST['ballotId'], PDO::PARAM_INT);
			$insert->bindValue(':codeId', $code['id'], PDO::PARAM_INT);
			$insert->execute();
		}
		$data['codes'] = array_map(function($c) { return $c['code']; }, $codes);
		$data['count'] = count($codes);
	}
}

if (!empty($errors)) {
	$data['errors'] = $errors;
}
echo json_encode($data);
?>
