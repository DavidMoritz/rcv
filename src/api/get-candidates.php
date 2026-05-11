<?php
require_once("config.php");

$key = $_GET['key'];
$edit = $_GET['edit'] ?? false;
$editText = $edit ? '' : 'AND NOW() < b.voteCutoff';

if(!empty($key)) {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();
	$query = "
		SELECT
			b.id, b.key, b.name, b.positions, b.register, b.resultsRelease, b.voteCutoff, b.hideNames, b.hideDetails, b.allowCustom, b.showGraph, b.kickbackUrl, b.iframeUrl, b.oneDeviceOneVote, b.isSecure, b.orderedEntries, b.allowGrouping, b.createdBy, e.entry_id, e.image, e.hyperlink, e.color, e.name AS 'candidate'
		FROM
			entries e
		JOIN
			ballots b
		ON
			e.ballotId = b.id
		WHERE
			b.key = :key
		$editText
		ORDER BY e.entry_id ASC
  ";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':key', $key, PDO::PARAM_STR);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results) && !$edit) {
		$sth2 = $dbh->prepare("SELECT id, voteCutoff, resultsRelease FROM ballots WHERE `key` = :key");
		$sth2->bindValue(':key', $key, PDO::PARAM_STR);
		$sth2->execute();
		$ballot = $sth2->fetch(PDO::FETCH_ASSOC);
		if($ballot) {
			echo json_encode(['status' => 'closed', 'resultsRelease' => $ballot['resultsRelease']]);
		} else {
			echo "Shortcode not found.";
		}
	} else {
		// If allowGrouping is enabled, include group fields and options
		$groupFields = [];
		if (!empty($results) && $results[0]['allowGrouping'] == 1) {
			$ballotId = $results[0]['id'];
			$fieldSth = $dbh->prepare("SELECT id, title, question_text, sort_order FROM voter_group_fields WHERE ballot_id = :ballotId ORDER BY sort_order ASC");
			$fieldSth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
			$fieldSth->execute();
			$groupFields = $fieldSth->fetchAll(PDO::FETCH_ASSOC);

			$optionSth = $dbh->prepare("SELECT id, label, sort_order FROM voter_group_options WHERE field_id = :fieldId ORDER BY sort_order ASC");
			foreach ($groupFields as &$field) {
				$optionSth->bindValue(':fieldId', $field['id'], PDO::PARAM_INT);
				$optionSth->execute();
				$field['options'] = $optionSth->fetchAll(PDO::FETCH_ASSOC);
			}
		}
		print json_encode(['candidates' => $results, 'groupFields' => $groupFields]);
	}
} else {
	echo "Failed to supply Shortcode";
}
?>
