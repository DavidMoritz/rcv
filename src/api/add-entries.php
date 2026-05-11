<?php
require_once("config.php");

$errors = array();
$data = array();
// Getting posted data and decoding json
$_POST = json_decode(file_get_contents('php://input'), true);

// checking for blank values.
$ballotId = intval($_POST['ballotId']);

if (!empty($_POST['entries'])) {
	$total = count($_POST['entries']);
	$imgTotal = count($_POST['images']);
	if ($total < 2)
		$errors['entryInput'] = 'At least two entries are required.';
  if ($total != $imgTotal)
		$errors['imgTotal'] = 'Must be as many images as entries.'; 
} else {
	$errors['entryInput'] = 'Entries are required.';
}

if (empty($ballotId))
	$errors['ballotId'] = 'Ballot ID is required.';

function sanitizeName($name) {
	$name = html_entity_decode($name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
	$name = preg_replace(
		'/["\'\x{2018}\x{2019}\x{201C}\x{201D}\x{2032}\x{2033}\x{2036}\x{FF02}]/u',
		'',
		$name
	);
	return $name;
}

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$entryIds = isset($_POST['entryIds']) ? $_POST['entryIds'] : array();
	$hasExisting = false;
	foreach ($entryIds as $id) {
		if ($id !== null && $id !== '') { $hasExisting = true; break; }
	}

	if ($hasExisting) {
		// Edit flow: upsert entries in-place to preserve entry_ids

		// 1. Collect IDs being kept (non-null entryIds)
		$keepIds = array();
		foreach ($entryIds as $id) {
			if ($id !== null && $id !== '') {
				$keepIds[] = intval($id);
			}
		}

		// 2. Delete entries for this ballot that are no longer in the list
		if (!empty($keepIds)) {
			$placeholders = implode(',', array_fill(0, count($keepIds), '?'));
			$delQuery = "DELETE FROM entries WHERE ballotId = ? AND entry_id NOT IN ($placeholders)";
			$delParams = array_merge(array($ballotId), $keepIds);
			$sth = $dbh->prepare($delQuery);
			$sth->execute($delParams);
		}

		// 3. Loop through entries: UPDATE existing, INSERT new
		$colors = isset($_POST['colors']) ? $_POST['colors'] : array();
		for ($i = 0; $i < $total; $i++) {
			$name = sanitizeName($_POST['entries'][$i]);
			$image = $_POST['images'][$i];
			$hyperlink = $_POST['hyperlinks'][$i];
			$color = isset($colors[$i]) && $colors[$i] !== '' ? $colors[$i] : null;
			$eid = $entryIds[$i];

			if ($eid !== null && $eid !== '') {
				// Update existing entry
				$sth = $dbh->prepare("UPDATE entries SET name = ?, image = ?, hyperlink = ?, color = ? WHERE entry_id = ? AND ballotId = ?");
				$sth->execute(array($name, $image, $hyperlink, $color, intval($eid), $ballotId));
			} else {
				// Insert new entry
				$sth = $dbh->prepare("INSERT INTO entries (ballotId, name, image, hyperlink, color) VALUES (?, ?, ?, ?, ?)");
				$sth->execute(array($ballotId, $name, $image, $hyperlink, $color));
			}
		}
		echo "Success";
	} else {
		// Create flow: bulk INSERT (no entryIds)
		$colors = isset($_POST['colors']) ? $_POST['colors'] : array();
		$query = "
			INSERT INTO
				entries (`ballotId`, `name`, `image`, `hyperlink`, `color`)
			VALUES ";
		$params = array();
		for ($i=0; $i < $total; $i++) {
			$name = sanitizeName($_POST['entries'][$i]);
			$color = isset($colors[$i]) && $colors[$i] !== '' ? $colors[$i] : null;
			$query .= "(?, ?, ?, ?, ?),";
			$params[] = $ballotId;
			$params[] = $name;
			$params[] = $_POST['images'][$i];
			$params[] = $_POST['hyperlinks'][$i];
			$params[] = $color;
		}
		$query = substr($query, 0, -1) . ";";
		$sth = $dbh->prepare($query);
		$sth->execute($params);
		echo "Success";
	}
}
?>
