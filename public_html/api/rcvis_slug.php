<?php
require_once("config.php");

$badSlug = empty($_GET['slug']) || $_GET['slug'] == 'undefined';

if(!empty($_GET['key']) && !$badSlug && !empty($_GET['id'])) {

// code=' + $s.shortCode + '&slug=' + $s.rcvisSlug + '&id=' + $s.rcvisId
// checking for blank values.
  $key = $_GET['key'];
  $slug = $_GET['slug'];
  $id = $_GET['id'];
	$query = "
		UPDATE
      ballots
    SET
      rcvisSlug = '$slug',
      rcvisId = '$id'
		WHERE
			`key` = '$key'
  ";
	$sth = $dbh->prepare($query);
	$sth->execute();
  $results=$sth->fetchAll(PDO::FETCH_ASSOC);

	print json_encode($results);
}
?>