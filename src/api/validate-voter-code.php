<?php
require_once("config.php");

$data = array('valid' => false);

if (!empty($_GET['code']) && !empty($_GET['ballotId'])) {
	$code = strtolower(strtr($_GET['code'], '01', 'oi'));
	$ballotId = intval($_GET['ballotId']);

	// Look up the code in random_codes
	$sth = $dbh->prepare("SELECT id FROM random_codes WHERE code = :code");
	$sth->bindValue(':code', $code, PDO::PARAM_STR);
	$sth->execute();
	$codeRow = $sth->fetch(PDO::FETCH_ASSOC);

	if ($codeRow) {
		// Check that this code is assigned to this ballot
		$sth = $dbh->prepare("SELECT 1 FROM ballot_codes WHERE ballot_id = :ballotId AND random_code_id = :codeId");
		$sth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
		$sth->bindValue(':codeId', $codeRow['id'], PDO::PARAM_INT);
		$sth->execute();

		if ($sth->fetch()) {
			// Check that the code hasn't already been used to vote
			$sth = $dbh->prepare("SELECT 1 FROM votes WHERE ballotId = :ballotId AND name = :code LIMIT 1");
			$sth->bindValue(':ballotId', $ballotId, PDO::PARAM_INT);
			$sth->bindValue(':code', $code, PDO::PARAM_STR);
			$sth->execute();

			if (!$sth->fetch()) {
				$data['valid'] = true;
			}
		}
	}
}

echo json_encode($data);
?>
