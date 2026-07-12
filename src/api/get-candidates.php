<?php
require_once("config.php");

$key = $_GET['key'] ?? null;
$edit = $_GET['edit'] ?? false;
if(!empty($key)) {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();

	// Fetch ballot metadata separately
	$ballotQuery = "
		SELECT
			b.id, b.key, b.name, b.positions, b.register, b.resultsRelease, b.voteCutoff,
			b.hideNames, b.hideDetails, b.allowCustom, b.showGraph, b.kickbackUrl, b.iframeUrl,
			b.oneDeviceOneVote, b.isSecure, b.orderedEntries, b.allowGrouping, b.createdBy,
			CASE WHEN b.iframeUrl = 'custom' THEN CAST(b.customHtml AS CHAR) ELSE NULL END AS customHtml
		FROM ballots b
		WHERE b.key = :key
	";
	$ballotSth = $dbh->prepare($ballotQuery);
	$ballotSth->bindValue(':key', $key, PDO::PARAM_STR);
	$ballotSth->execute();
	$ballot = $ballotSth->fetch(PDO::FETCH_ASSOC);

	if (!$ballot) {
		echo "Shortcode not found.";
	} else {
		// Check voting cutoff for non-edit requests
		if (!$edit) {
			$cutoffSth = $dbh->prepare("SELECT 1 FROM ballots WHERE id = :id AND (voteCutoff IS NULL OR UTC_TIMESTAMP() < voteCutoff)");
			$cutoffSth->bindValue(':id', $ballot['id'], PDO::PARAM_INT);
			$cutoffSth->execute();
			if (!$cutoffSth->fetch()) {
				echo json_encode(['status' => 'closed', 'resultsRelease' => $ballot['resultsRelease']]);
				exit;
			}
		}

		// Fetch candidates (entries only)
		$entryQuery = "
			SELECT entry_id, name AS 'candidate', image, hyperlink, color
			FROM entries
			WHERE ballotId = :ballotId
			ORDER BY entry_id ASC
		";
		$entrySth = $dbh->prepare($entryQuery);
		$entrySth->bindValue(':ballotId', $ballot['id'], PDO::PARAM_INT);
		$entrySth->execute();
		$candidates = $entrySth->fetchAll(PDO::FETCH_ASSOC);

		if (empty($candidates) && !$edit) {
			echo "This ballot has no candidates and cannot accept votes.";
			exit;
		}

		// Fetch group fields if grouping is enabled
		$groupFields = [];
		if ($ballot['allowGrouping'] == 1) {
			$fieldSth = $dbh->prepare("SELECT id, title, question_text, type, required, sort_order FROM voter_group_fields WHERE ballot_id = :ballotId ORDER BY sort_order ASC");
			$fieldSth->bindValue(':ballotId', $ballot['id'], PDO::PARAM_INT);
			$fieldSth->execute();
			$groupFields = $fieldSth->fetchAll(PDO::FETCH_ASSOC);

			$optionSth = $dbh->prepare("SELECT id, label, sort_order FROM voter_group_options WHERE field_id = :fieldId ORDER BY sort_order ASC");
			foreach ($groupFields as &$field) {
				$optionSth->bindValue(':fieldId', $field['id'], PDO::PARAM_INT);
				$optionSth->execute();
				$field['options'] = $optionSth->fetchAll(PDO::FETCH_ASSOC);
			}
		}

		print json_encode([
			'ballot' => $ballot,
			'candidates' => $candidates,
			'groupFields' => $groupFields
		]);
	}
} else {
	echo "Failed to supply Shortcode";
}
?>
