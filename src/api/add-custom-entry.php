<?php
require_once("config.php");

$entry = $_GET['entry'];
$key = $_GET['key'];

if(!empty($key)) {

  // checking for blank values.
	$checkQ = "
		SELECT
			*
		FROM
			`ballots`
		WHERE
			`key` = :key
    AND
      `allowCustom` = 1;
  ";
	$sth = $dbh->prepare($checkQ);
	$sth->bindValue(':key', $key, PDO::PARAM_STR);
	$sth->execute();
	$check=$sth->fetchAll(PDO::FETCH_ASSOC);

  if(strlen(json_encode($check)) > 5 && !empty($entry)) {
    $id = $check[0]['id'];

    $query = "
      INSERT INTO
        entries (`ballotId`, `name`, `image`, `hyperlink`)
      VALUES (:ballotId, :name, '', '');
    ";

    $sth = $dbh->prepare($query);
    $sth->bindValue(':ballotId', $id, PDO::PARAM_INT);
    $sth->bindValue(':name', $entry, PDO::PARAM_STR);
    $sth->execute();

    // checking for blank values.
    $query2 = "
      SELECT
        *
      FROM
        `entries`
      ORDER BY
        entry_id DESC
      LIMIT
        1;";
    $sth = $dbh->prepare($query2);
    $sth->execute();
    $results=$sth->fetchAll(PDO::FETCH_ASSOC);
    print json_encode($results);
  } else {
    echo 'None found';
  }
} else {
  echo 'Please provde id and key';
}
?>
