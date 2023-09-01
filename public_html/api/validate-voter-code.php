<?php
require_once("config.php");

if(!empty($_GET['code'])) {
// checking for blank values.
  $code = $_GET["code"];
	$query = "
		SELECT
      1 as 'true'
    FROM
			random_codes
		WHERE
			`code` = '$code'
    AND
      `code` NOT IN (
         SELECT
            SUBSTRING(`name`, 1, 6) AS 'code'
         FROM
            votes
         WHERE
            ballotId = 27713
      )
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	if ($results)
    echo $code;
}
?>
