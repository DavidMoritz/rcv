<?php
require_once("config.php");

$key = $_GET['key'];

if(!empty($key)) {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();

	// Fetch ballot metadata separately
	$ballotQuery = "
		SELECT
			id, name AS 'ballotName', positions, register, resultsRelease, voteCutoff,
			hideNames, hideDetails, allowCustom, showGraph, tieBreak, graphUpdated,
			isSecure, allowGrouping, createdBy, rcvisId, rcvisSlug
		FROM ballots
		WHERE `key` = :key
	";
	$ballotSth = $dbh->prepare($ballotQuery);
	$ballotSth->bindValue(':key', $key, PDO::PARAM_STR);
	$ballotSth->execute();
	$ballot = $ballotSth->fetch(PDO::FETCH_ASSOC);

	if (!$ballot) {
		echo "Shortcode not found.";
	} else {
		$ballotId = $ballot['id'];

		// Fetch votes (vote data only, no ballot metadata on each row)
		$voteQuery = "
			SELECT vote_id, voteIds, name, date_created, group_answers
			FROM votes
			WHERE ballotId = :ballotId
			ORDER BY " . ($ballot['isSecure'] == 1 ? "name" : "vote_id") . " ASC
		";
		$voteSth = $dbh->prepare($voteQuery);
		$voteSth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
		$voteSth->execute();
		$votes = $voteSth->fetchAll(PDO::FETCH_ASSOC);

		if (empty($votes)) {
			echo "No one has voted yet on this ballot.";
		} else {
			// Fetch entries
			$entrySth = $dbh->prepare("SELECT entry_id, name, image, color, hyperlink FROM entries WHERE ballotId = :ballotId");
			$entrySth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
			$entrySth->execute();
			$entries = $entrySth->fetchAll(PDO::FETCH_ASSOC);

			// Fetch group fields if grouping is enabled
			$groupFields = [];
			if ($ballot['allowGrouping'] == 1) {
				$fieldSth = $dbh->prepare("SELECT id, title, question_text, type, required, sort_order FROM voter_group_fields WHERE ballot_id = :ballotId ORDER BY sort_order ASC");
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

			print json_encode([
				'ballot' => $ballot,
				'votes' => $votes,
				'entries' => $entries,
				'groupFields' => $groupFields
			]);
		}
	}
} else {
	echo "Failed to supply key";
}
?>
