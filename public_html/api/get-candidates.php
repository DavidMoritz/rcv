<?php
require_once("config.php");

$key = $_GET['key'];
$edit = $_GET['edit'];
$editText = $edit ? '' : 'AND NOW() < b.voteCutoff;';

if(!empty($key)) {
	$sth = $dbh->prepare("SET time_zone = '+0:00'");
	$sth->execute();
	$query = "
		SELECT
			b.key, b.name, b.positions, b.register, b.voteCutoff, b.allowCustom, e.entry_id, e.image, e.color, e.name AS 'candidate'
		FROM
			entries e
		JOIN
			ballots b
		ON
			e.ballotId = b.id
		WHERE
			b.key = '$key'
		$editText
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(empty($results) && !$edit)
		echo "Either shortcode is incorrect or voting has already been cutoff.";
	else
		print json_encode($results);
} else {
	echo "Failed to supply Shortcode";
}
?>
