<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decodeing json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
$ballotId = intval($_POST['ballotId']);
$duplicateBallotId = intval($_POST['duplicateBallotId']);

if (empty($ballotId))
	$errors['ballotId'] = 'Ballot ID is required.';
if (empty($duplicateBallotId))
	$errors['duplicateBallotId'] = 'Duplicate Ballot ID is required.';

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			entries (`ballotId`, `name`, `image`)
     SELECT
		 	?,
			`name`,
      `image`
     FROM entries
		 WHERE `ballotId` = ?";
	$sth = $dbh->prepare($query);
	$sth->execute(array($ballotId, $duplicateBallotId));

	// Duplicate voter group fields and options
	$fieldSth = $dbh->prepare("SELECT id, title, question_text, sort_order FROM voter_group_fields WHERE ballot_id = ? ORDER BY sort_order ASC");
	$fieldSth->execute(array($duplicateBallotId));
	$fields = $fieldSth->fetchAll(PDO::FETCH_ASSOC);

	if (!empty($fields)) {
		$insertField = $dbh->prepare("INSERT INTO voter_group_fields (ballot_id, title, question_text, sort_order) VALUES (?, ?, ?, ?)");
		$insertOption = $dbh->prepare("INSERT INTO voter_group_options (field_id, label, sort_order) VALUES (?, ?, ?)");
		$optionSth = $dbh->prepare("SELECT label, sort_order FROM voter_group_options WHERE field_id = ? ORDER BY sort_order ASC");

		foreach ($fields as $field) {
			$insertField->execute(array($ballotId, $field['title'], $field['question_text'], $field['sort_order']));
			$newFieldId = $dbh->lastInsertId();

			$optionSth->execute(array($field['id']));
			$options = $optionSth->fetchAll(PDO::FETCH_ASSOC);
			foreach ($options as $option) {
				$insertOption->execute(array($newFieldId, $option['label'], $option['sort_order']));
			}
		}
	}

	echo "Success";
}
?>
