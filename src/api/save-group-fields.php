<?php
require_once("config.php");

$errors = array();
$_POST = json_decode(file_get_contents('php://input'), true);

if (empty($_POST['ballotId']))
	$errors['ballotId'] = 'Ballot ID is required.';

if (empty($_POST['createdBy']))
	$errors['createdBy'] = 'Created By is required.';

if (!empty($errors)) {
	echo json_encode(['errors' => $errors]);
} else {
	$ballotId = intval($_POST['ballotId']);
	$createdBy = $_POST['createdBy'];

	// Verify ballot ownership
	$ownerCheck = $dbh->prepare("SELECT id FROM ballots WHERE id = :ballotId AND createdBy = :createdBy");
	$ownerCheck->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
	$ownerCheck->bindValue(':createdBy', $createdBy, PDO::PARAM_STR);
	$ownerCheck->execute();
	if (!$ownerCheck->fetch()) {
		echo json_encode(['errors' => ['auth' => 'Not authorized.']]);
		exit;
	}

	// Delete existing options for this ballot's fields
	$dbh->prepare("
		DELETE FROM voter_group_options WHERE field_id IN (
			SELECT id FROM voter_group_fields WHERE ballot_id = :ballotId
		)
	")->execute([':ballotId' => $ballotId]);

	// Delete existing fields for this ballot
	$dbh->prepare("DELETE FROM voter_group_fields WHERE ballot_id = :ballotId")
		->execute([':ballotId' => $ballotId]);

	// Insert new fields and options
	$fields = isset($_POST['fields']) ? $_POST['fields'] : [];
	$insertField = $dbh->prepare("
		INSERT INTO voter_group_fields (ballot_id, title, question_text, sort_order)
		VALUES (:ballotId, :title, :questionText, :sortOrder)
	");
	$insertOption = $dbh->prepare("
		INSERT INTO voter_group_options (field_id, label, sort_order)
		VALUES (:fieldId, :label, :sortOrder)
	");

	foreach ($fields as $idx => $field) {
		$title = substr(trim($field['title'] ?? ''), 0, 64);
		$questionText = substr(trim($field['question_text'] ?? ''), 0, 256);
		if (!$title && !$questionText) continue;

		$insertField->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
		$insertField->bindValue(':title', $title, PDO::PARAM_STR);
		$insertField->bindValue(':questionText', $questionText, PDO::PARAM_STR);
		$insertField->bindValue(':sortOrder', $idx, PDO::PARAM_INT);
		$insertField->execute();
		$fieldId = $dbh->lastInsertId();

		$options = isset($field['options']) ? $field['options'] : [];
		foreach ($options as $optIdx => $option) {
			$label = substr(trim(is_array($option) ? ($option['label'] ?? '') : $option), 0, 128);
			if (!$label) continue;

			$insertOption->bindValue(':fieldId', $fieldId, PDO::PARAM_INT);
			$insertOption->bindValue(':label', $label, PDO::PARAM_STR);
			$insertOption->bindValue(':sortOrder', $optIdx, PDO::PARAM_INT);
			$insertOption->execute();
		}
	}

	echo json_encode(['data' => ['success' => true]]);
}
?>
