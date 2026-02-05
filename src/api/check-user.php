<?php
require_once("config.php");

if(!empty($_GET['user'])) {
// checking for blank values.
  $user = $_GET["user"];
	$query = "
		SELECT
      1 as 'true'
    FROM
			users
		WHERE
			username = :username
  ";
	$sth = $dbh->prepare($query);
	$sth->bindValue(':username', $user, PDO::PARAM_STR);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
}
?>
