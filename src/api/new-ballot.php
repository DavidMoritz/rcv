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

if (empty($_POST['maxVotes']))
	$maxVotes = "NULL";
else
	$maxVotes = intval($_POST['maxVotes']);

if (empty($_POST['sqlVoteCutoff']))
	$errors['voteCutoff'] = 'VoteCutoff is required.';

if (empty($_POST['sqlResultsRelease']))
	$errors['resultsRelease'] = 'ResultsRelease is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();
	$query = "
		INSERT INTO
			ballots (`name`, `timeCreated`, `key`, `positions`, `createdBy`, `resultsRelease`, `voteCutoff`, `requireSignIn`, `tieBreak`, `register`, `allowCustom`, `hideNames`, `hideDetails`, `showGraph`, `maxVotes`, `kickbackUrl`, `iframeUrl`, `oneDeviceOneVote`)
		VALUES
			(:name, NOW(), :key, :positions, :createdBy, :resultsRelease, :voteCutoff, :requireSignIn, :tieBreak, :register, :allowCustom, :hideNames, :hideDetails, :showGraph, :maxVotes, :kickbackUrl, :iframeUrl, :oneDeviceOneVote)";

	$sth = $dbh->prepare($query);
	$sth->bindValue(':name', $_POST['name'], PDO::PARAM_STR);
	$sth->bindValue(':key', $_POST['key'], PDO::PARAM_STR);
	$sth->bindValue(':positions', $_POST['positions'], PDO::PARAM_STR);
	$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_STR);
	$sth->bindValue(':resultsRelease', $_POST['sqlResultsRelease'], PDO::PARAM_STR);
	$sth->bindValue(':voteCutoff', $_POST['sqlVoteCutoff'], PDO::PARAM_STR);
	$sth->bindValue(':requireSignIn', $requireSignIn, PDO::PARAM_INT);
	$sth->bindValue(':tieBreak', $tieBreak, PDO::PARAM_STR);
	$sth->bindValue(':register', $register, PDO::PARAM_INT);
	$sth->bindValue(':allowCustom', $allowCustom, PDO::PARAM_INT);
	$sth->bindValue(':hideNames', $hideNames, PDO::PARAM_INT);
	$sth->bindValue(':hideDetails', $hideDetails, PDO::PARAM_INT);
	$sth->bindValue(':showGraph', $showGraph, PDO::PARAM_INT);
	$sth->bindValue(':maxVotes', $maxVotes, ($maxVotes === "NULL" ? PDO::PARAM_NULL : PDO::PARAM_INT));
	$sth->bindValue(':kickbackUrl', $kickbackUrl, ($kickbackUrl === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
	$sth->bindValue(':iframeUrl', $iframeUrl, ($iframeUrl === null ? PDO::PARAM_NULL : PDO::PARAM_STR));
	$sth->bindValue(':oneDeviceOneVote', $oneDeviceOneVote, PDO::PARAM_INT);
	$sth->execute();
	echo $dbh->lastInsertId();
}
?>
