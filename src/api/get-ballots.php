<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);
$createdBy = $_POST['id'];

if(!empty($createdBy)) {
	$votes = "
		SELECT
			COUNT(*)
		FROM
			votes
		WHERE
			votes.ballotId = ballots.id";
	$query = "
		SELECT
			*, ($votes) as totalVotes
		FROM
			ballots
		WHERE
			createdBy = '$createdBy'
		ORDER BY
			ballots.id DESC;";
	$sth = $dbh->prepare($query);
	$sth->execute();
	$results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if(strtolower($createdBy) == "guest") {
		echo "'guest' is not a valid entry";
	} else {
		print json_encode($results);
	}
} else {
	echo "failed to supply Created By";
}
?>