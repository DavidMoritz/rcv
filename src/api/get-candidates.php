<?php
require_once("config.php");

$key = $_GET['key'];
$edit = $_GET['edit'] ?? false;
$editText = $edit ? '' : 'AND NOW() < b.voteCutoff;';

if(!empty($key)) {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();
	$query = "
		SELECT
			b.id, b.key, b.name, b.positions, b.register, b.resultsRelease, b.voteCutoff, b.hideNames, b.hideDetails, b.allowCustom, b.showGraph, b.kickbackUrl, b.iframeUrl, b.oneDeviceOneVote, b.isSecure, b.createdBy, e.entry_id, e.image, e.hyperlink, e.color, e.name AS 'candidate'
		FROM
			entries e
		JOIN
			ballots b
		ON
			e.ballotId = b.id
		WHERE
			b.key = :key
		$editText
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
	} else
		print json_encode($results);
} else {
	echo "Failed to supply Shortcode";
}
?>
