<?php
require_once("config.php");

$query = "
  SELECT
    name, message, date
  FROM
    contributions
  ORDER BY
    date DESC;";
$sth = $dbh->prepare($query);
$sth->execute();
$results=$sth->fetchAll(PDO::FETCH_ASSOC);

if(empty($results))
  echo "Either shortcode is incorrect or no one has voted yet.";
else
  print json_encode($results);

?>
