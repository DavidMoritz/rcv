<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['name']))
	$errors['name'] = 'Name is required.';

if (empty($_POST['key']))
	$errors['key'] = 'Key is required.';

if (empty($_POST['positions']))
	$errors['positions'] = 'Positions is required.';
else if (intval($_POST['positions']) < 1)
	$errors['positions'] = 'Positions must be a valid number.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (empty($_POST['requireSignIn']))
	$requireSignIn = "0";
else
	$requireSignIn = "1";

if (!empty($_POST['tieBreak']))
	$tieBreak = $_POST['tieBreak'];
else
	$tieBreak = "random";

if (!empty($_POST['register']))
	$register = intval($_POST['register']);
else
	$register = 0;

if (!empty($_POST['allowCustom']))
	$allowCustom = intval($_POST['allowCustom']);
else
	$allowCustom = 0;

if (!empty($_POST['hideNames']))
	$hideNames = intval($_POST['hideNames']);
else
	$hideNames = 0;

if (!empty($_POST['hideDetails']))
	$hideDetails = intval($_POST['hideDetails']);
else
	$hideDetails = 0;

if (!empty($_POST['showGraph']))
	$showGraph = intval($_POST['showGraph']);
else
	$showGraph = 0;

if (!empty($_POST['kickbackUrl']))
	$kickbackUrl = $_POST['kickbackUrl'];
else
	$kickbackUrl = null;

if (!empty($_POST['iframeUrl']))
	$iframeUrl = $_POST['iframeUrl'];
else
	$iframeUrl = null;

if (!empty($_POST['oneDeviceOneVote']))
	$oneDeviceOneVote = intval($_POST['oneDeviceOneVote']);
else
	$oneDeviceOneVote = 0;

if (!empty($_POST['isSecure']))
	$isSecure = 1;
else
	$isSecure = 0;

if (!empty($_POST['orderedEntries']))
	$orderedEntries = intval($_POST['orderedEntries']);
else
	$orderedEntries = 0;

if (!empty($_POST['allowGrouping']))
	$allowGrouping = 1;
else
	$allowGrouping = 0;

$codeCount = 0;
if ($isSecure && !empty($_POST['codeCount']))
	$codeCount = min(intval($_POST['codeCount']), 500);

if (empty($_POST['maxVotes']))
	$maxVotes = 0;
else
	$maxVotes = intval($_POST['maxVotes']);

$sqlVoteCutoff = !empty($_POST['sqlVoteCutoff']) ? $_POST['sqlVoteCutoff'] : null;
$sqlResultsRelease = !empty($_POST['sqlResultsRelease']) ? $_POST['sqlResultsRelease'] : null;

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();
	$query = "
		INSERT INTO
			ballots (`name`, `timeCreated`, `key`, `positions`, `createdBy`, `resultsRelease`, `voteCutoff`, `requireSignIn`, `tieBreak`, `register`, `allowCustom`, `hideNames`, `hideDetails`, `showGraph`, `maxVotes`, `kickbackUrl`, `iframeUrl`, `oneDeviceOneVote`, `isSecure`, `orderedEntries`, `allowGrouping`)
		VALUES
			(:name, UTC_TIMESTAMP(), :key, :positions, :createdBy, :resultsRelease, :voteCutoff, :requireSignIn, :tieBreak, :register, :allowCustom, :hideNames, :hideDetails, :showGraph, :maxVotes, :kickbackUrl, :iframeUrl, :oneDeviceOneVote, :isSecure, :orderedEntries, :allowGrouping)";

	$sth = $dbh->prepare($query);
	$sth->bindValue(':name', $_POST['name'], PDO::PARAM_STR);
	$sth->bindValue(':key', $_POST['key'], PDO::PARAM_STR);
	$sth->bindValue(':positions', $_POST['positions'], PDO::PARAM_INT);
	$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
	$sth->bindValue(':resultsRelease', $sqlResultsRelease, ($sqlResultsRelease === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
	$sth->bindValue(':voteCutoff', $sqlVoteCutoff, ($sqlVoteCutoff === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
	$sth->bindValue(':requireSignIn', $requireSignIn, PDO::PARAM_INT);
	$sth->bindValue(':tieBreak', $tieBreak, PDO::PARAM_STR);
	$sth->bindValue(':register', $register, PDO::PARAM_INT);
	$sth->bindValue(':allowCustom', $allowCustom, PDO::PARAM_INT);
	$sth->bindValue(':hideNames', $hideNames, PDO::PARAM_INT);
	$sth->bindValue(':hideDetails', $hideDetails, PDO::PARAM_INT);
	$sth->bindValue(':showGraph', $showGraph, PDO::PARAM_INT);
	$sth->bindValue(':maxVotes', $maxVotes, PDO::PARAM_INT);
	$sth->bindValue(':kickbackUrl', $kickbackUrl, ($kickbackUrl === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
	$sth->bindValue(':iframeUrl', $iframeUrl, ($iframeUrl === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
	$sth->bindValue(':oneDeviceOneVote', $oneDeviceOneVote, PDO::PARAM_INT);
	$sth->bindValue(':isSecure', $isSecure, PDO::PARAM_INT);
	$sth->bindValue(':orderedEntries', $orderedEntries, PDO::PARAM_INT);
	$sth->bindValue(':allowGrouping', $allowGrouping, PDO::PARAM_INT);
	$sth->execute();
	$ballotId = $dbh->lastInsertId();

	// Assign voter codes for secure ballots
	if ($isSecure && $codeCount > 0) {
		// Exclude codes used by any ballot created in the last 6 months
		$codeSth = $dbh->prepare("
			SELECT id FROM random_codes
			WHERE id NOT IN (
				SELECT bc.random_code_id FROM ballot_codes bc
				JOIN ballots b ON b.id = bc.ballot_id
				WHERE b.timeCreated > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 MONTH)
			)
			ORDER BY RAND() LIMIT :count
		");
		$codeSth->bindValue(':count', $codeCount, PDO::PARAM_INT);
		$codeSth->execute();
		$codes = $codeSth->fetchAll(PDO::FETCH_ASSOC);

		$insertCode = $dbh->prepare("INSERT INTO ballot_codes (ballot_id, random_code_id) VALUES (:ballotId, :codeId)");
		foreach ($codes as $code) {
			$insertCode->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
			$insertCode->bindValue(':codeId', $code['id'], PDO::PARAM_INT);
			$insertCode->execute();
		}
	}

	echo $ballotId;
}
?>
