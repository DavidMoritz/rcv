<?php
require_once("config.php");

$ballotId = isset($_GET['ballotId']) ? intval($_GET['ballotId']) : 0;

if (empty($ballotId)) {
	echo json_encode(['errors' => ['ballotId' => 'Ballot ID is required.']]);
} else {
	$fieldSth = $dbh->prepare("
		SELECT id, title, question_text, sort_order
		FROM voter_group_fields
		WHERE ballot_id = :ballotId
		ORDER BY sort_order ASC
	");
	$fieldSth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
	$fieldSth->execute();
	$fields = $fieldSth->fetchAll(PDO::FETCH_ASSOC);

	$optionSth = $dbh->prepare("
		SELECT id, label, sort_order
		FROM voter_group_options
		WHERE field_id = :fieldId
		ORDER BY sort_order ASC
	");

	foreach ($fields as &$field) {
		$optionSth->bindValue(':fieldId', $field['id'], PDO::PARAM_INT);
		$optionSth->execute();
		$field['options'] = $optionSth->fetchAll(PDO::FETCH_ASSOC);
	}

	echo json_encode($fields);
}
?>
