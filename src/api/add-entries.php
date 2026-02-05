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

if (!empty($errors)) {
	$data['errors']  = $errors;
	$data['post'] = $_POST;
	echo json_encode($data);
} else {
	$query = "
		INSERT INTO
			entries (`ballotId`, `name`, `image`, `hyperlink`)
		VALUES ";
	for ($i=0; $i < $total; $i++) {
    $name = $_POST['entries'][$i];
    // 1) Normalize and decode HTML entities so “&quot;” becomes a real character.
    $name = html_entity_decode($name, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    // 2) Remove common ASCII + Unicode quote characters.
    $name = preg_replace(
        '/["\'\x{2018}\x{2019}\x{201C}\x{201D}\x{2032}\x{2033}\x{2036}\x{FF02}]/u',
        '',
        $name
    );
		$query .= "($ballotId,'". $name ."','". $_POST['images'][$i] ."','". $_POST['hyperlinks'][$i] ."'),";
	}
	$query = substr($query, 0, -1) . ";";
	$sth = $dbh->prepare($query);
	$sth->execute();
	echo "Success";
}
?>
