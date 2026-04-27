<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
$_POST = json_decode(file_get_contents('php://input'), true);
$key = $_POST['key'];
$id = $_POST['id'];

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

if (empty($id)) {
  // Need to fetch ballot id from key using secure parameterized query
  $subQuery = "SELECT id FROM ballots WHERE `key` = :key";
  $subSth = $dbh->prepare($subQuery);
  $subSth->bindValue(':key', $key, PDO::PARAM_STR);
  $subSth->execute();
  $result = $subSth->fetch(PDO::FETCH_ASSOC);
  $id = $result['id'];
}

$fingerprint = isset($_POST['fingerprint']) ? substr($_POST['fingerprint'], 0, 64) : '';
$userId = isset($_POST['userId']) ? $_POST['userId'] : '';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	// Fetch ballot settings
	$ballotQuery = $dbh->prepare("SELECT oneDeviceOneVote, isSecure, createdBy, voteCutoff FROM ballots WHERE id = :id");
	$ballotQuery->bindValue(':id', $id, PDO::PARAM_INT);
	$ballotQuery->execute();
	$ballotRow = $ballotQuery->fetch(PDO::FETCH_ASSOC);

	if ($ballotRow && $ballotRow['voteCutoff'] < date('Y-m-d H:i:s')) {
		echo json_encode(['errors' => ['closed' => 'Voting has closed.']]);
		exit;
	}

	if ($ballotRow && $ballotRow['oneDeviceOneVote'] && !empty($fingerprint)) {
		// Skip check if voter is the ballot creator (kiosk whitelist)
		$isCreator = ($userId && $userId == $ballotRow['createdBy']);
		if (!$isCreator) {
			$dupQuery = $dbh->prepare("SELECT vote_id FROM votes WHERE ballotId = :ballotId AND fingerprint = :fingerprint LIMIT 1");
			$dupQuery->bindValue(':ballotId', $id, PDO::PARAM_INT);
			$dupQuery->bindValue(':fingerprint', $fingerprint, PDO::PARAM_STR);
			$dupQuery->execute();
			if ($dupQuery->fetch()) {
				echo json_encode(['errors' => ['duplicate' => 'This device has already voted on this ballot.']]);
				exit;
			}
		}
	}

	// Secure ballot: validate voter code server-side
	if ($ballotRow && $ballotRow['isSecure']) {
		$voterCode = isset($_POST['name']) ? strtolower(strtr(trim($_POST['name']), '01', 'oi')) : '';
		$codeValid = false;

		if (strlen($voterCode) === 6) {
			// Look up code in random_codes
			$codeQuery = $dbh->prepare("SELECT id FROM random_codes WHERE code = :code");
			$codeQuery->bindValue(':code', $voterCode, PDO::PARAM_STR);
			$codeQuery->execute();
			$codeRow = $codeQuery->fetch(PDO::FETCH_ASSOC);

			if ($codeRow) {
				// Check code is assigned to this ballot
				$assignQuery = $dbh->prepare("SELECT 1 FROM ballot_codes WHERE ballot_id = :ballotId AND random_code_id = :codeId");
				$assignQuery->bindValue(':ballotId', $id, PDO::PARAM_INT);
				$assignQuery->bindValue(':codeId', $codeRow['id'], PDO::PARAM_INT);
				$assignQuery->execute();

				if ($assignQuery->fetch()) {
					// Check code hasn't been used
					$usedQuery = $dbh->prepare("SELECT 1 FROM votes WHERE ballotId = :ballotId AND name = :code LIMIT 1");
					$usedQuery->bindValue(':ballotId', $id, PDO::PARAM_INT);
					$usedQuery->bindValue(':code', $voterCode, PDO::PARAM_STR);
					$usedQuery->execute();

					if (!$usedQuery->fetch()) {
						$codeValid = true;
					}
				}
			}
		}

		if (!$codeValid) {
			echo json_encode(['errors' => ['code' => 'This code is not valid.']]);
			exit;
		}
		// Store the normalized code as the vote name
		$_POST['name'] = $voterCode;
	}

	$inFingerprint = ', `fingerprint`';
	$query = "
		INSERT INTO
			votes (`ballotId`, `date_created`, `vote`, `voteIds`, `ipAddress`$inName$inFingerprint)
		VALUES
			(:ballotId, NOW(), :vote, :voteIds, :ipAddress" . (empty($_POST['name']) ? "" : ", :name") . ", :fingerprint)
    ;
  ";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':ballotId', $id, PDO::PARAM_INT);
	$sth->bindValue(':vote', $_POST['vote'], PDO::PARAM_STR);
	$sth->bindValue(':voteIds', $_POST['voteIds'], PDO::PARAM_STR);
	$sth->bindValue(':ipAddress', $_SERVER['REMOTE_ADDR'], PDO::PARAM_STR);
	$sth->bindValue(':fingerprint', $fingerprint, PDO::PARAM_STR);
	if (!empty($_POST['name'])) {
		$sanitizedName = substr(preg_replace(array('/[^a-zA-Z0-9-]/', '/ +/', '/^-|-$/'), array(' ', ' ', ''), $_POST['name']), 0, 40);
		$sth->bindValue(':name', $sanitizedName, PDO::PARAM_STR);
	}
	$sth->execute();
}
?>
