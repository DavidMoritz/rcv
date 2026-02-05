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
			`key` = '$key'
    AND
      `allowCustom` = 1;
  ";
	$sth = $dbh->prepare($checkQ);
	$sth->execute();
	$check=$sth->fetchAll(PDO::FETCH_ASSOC);
  
  if(strlen(json_encode($check)) > 5 && !empty($entry)) {
    $id = $check[0]['id'];
    
    $query = "
      INSERT INTO
        entries (`ballotId`, `name`, `image`, `hyperlink`)
      VALUES ('$id', '$entry', '', '');
    ";

    $sth = $dbh->prepare($query);
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
