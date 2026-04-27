<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
if (empty($_POST['id']) || empty($_POST['key']))
	$errors['key'] = 'Key is required';

if (empty($_POST['name']))
	$errors['name'] = 'Name is required.';

if (empty($_POST['positions']))
	$errors['positions'] = 'Positions is required.';
else if (intval($_POST['positions']) < 1)
	$errors['positions'] = 'Positions must be a valid number.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

// Build SET clause parts dynamically with parameters
$setParts = array();
$setParts[] = "name = :name";
$setParts[] = "positions = :positions";
$setParts[] = "resultsRelease = :resultsRelease";
$setParts[] = "voteCutoff = :voteCutoff";

if (!empty($_POST['key']))
	$setParts[] = "`key` = :key";

if (!empty($_POST['tieBreak']))
	$setParts[] = "tieBreak = :tieBreak";

if (!empty($_POST['register']))
	$setParts[] = "register = :register";

if (!empty($_POST['hideNames']))
	$setParts[] = "hideNames = :hideNames";

if (!empty($_POST['hideDetails']))
	$setParts[] = "hideDetails = :hideDetails";

if (!empty($_POST['allowCustom']))
	$setParts[] = "allowCustom = :allowCustom";

if (!empty($_POST['requireSignIn']))
	$setParts[] = "requireSignIn = :requireSignIn";

if (!empty($_POST['showGraph']))
	$setParts[] = "showGraph = :showGraph";

if (isset($_POST['kickbackUrl']))
	$setParts[] = "kickbackUrl = :kickbackUrl";

if (isset($_POST['iframeUrl']))
	$setParts[] = "iframeUrl = :iframeUrl";

if (isset($_POST['oneDeviceOneVote']))
	$setParts[] = "oneDeviceOneVote = :oneDeviceOneVote";

if (isset($_POST['isSecure']))
	$setParts[] = "isSecure = :isSecure";

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		UPDATE
			ballots
		SET
			" . implode(",\n\t\t\t", $setParts) . "
		WHERE
			createdBy = :createdBy
		AND
			id = :id;";

	$sth = $dbh->prepare($query);
	$sth->bindValue(':name', $_POST['name'], PDO::PARAM_STR);
	$sth->bindValue(':positions', $_POST['positions'], PDO::PARAM_INT);
	$sth->bindValue(':resultsRelease', empty($_POST['sqlResultsRelease']) ? null : $_POST['sqlResultsRelease'], PDO::PARAM_STR);
	$sth->bindValue(':voteCutoff', empty($_POST['sqlVoteCutoff']) ? null : $_POST['sqlVoteCutoff'], PDO::PARAM_STR);

	if (!empty($_POST['key']))
		$sth->bindValue(':key', $_POST['key'], PDO::PARAM_STR);

	if (!empty($_POST['tieBreak']))
		$sth->bindValue(':tieBreak', $_POST['tieBreak'], PDO::PARAM_STR);

	if (!empty($_POST['register']))
		$sth->bindValue(':register', $_POST['register'], PDO::PARAM_INT);

	if (!empty($_POST['hideNames']))
		$sth->bindValue(':hideNames', $_POST['hideNames'], PDO::PARAM_INT);

	if (!empty($_POST['hideDetails']))
		$sth->bindValue(':hideDetails', $_POST['hideDetails'], PDO::PARAM_INT);

	if (!empty($_POST['allowCustom']))
		$sth->bindValue(':allowCustom', $_POST['allowCustom'], PDO::PARAM_INT);

	if (!empty($_POST['requireSignIn']))
		$sth->bindValue(':requireSignIn', $_POST['requireSignIn'], PDO::PARAM_INT);

	if (!empty($_POST['showGraph']))
		$sth->bindValue(':showGraph', $_POST['showGraph'], PDO::PARAM_INT);

	if (isset($_POST['kickbackUrl']))
		$sth->bindValue(':kickbackUrl', empty($_POST['kickbackUrl']) ? null : $_POST['kickbackUrl'], empty($_POST['kickbackUrl']) ? PDO::PARAM_NULL : PDO::PARAM_STR);

	if (isset($_POST['iframeUrl']))
		$sth->bindValue(':iframeUrl', empty($_POST['iframeUrl']) ? null : $_POST['iframeUrl'], empty($_POST['iframeUrl']) ? PDO::PARAM_NULL : PDO::PARAM_STR);

	if (isset($_POST['oneDeviceOneVote']))
		$sth->bindValue(':oneDeviceOneVote', intval($_POST['oneDeviceOneVote']), PDO::PARAM_INT);

	if (isset($_POST['isSecure']))
		$sth->bindValue(':isSecure', intval($_POST['isSecure']), PDO::PARAM_INT);

	$sth->bindValue(':createdBy', $_POST['createdBy'], PDO::PARAM_INT);
	$sth->bindValue(':id', $_POST['id'], PDO::PARAM_INT);

	$sth->execute();
	echo $query;
}
?>
