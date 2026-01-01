<?php
require_once("config.php");

// create a new cURL resource
$ch = curl_init();
$id = $_GET['id'];

$url = "https://www.rcvis.com/api/visualizations/$id/";

$cfile = curl_file_create($_FILES['jsonFile']['tmp_name'],$_FILES['jsonFile']['type'],'jsonFile');

curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
// set URL and other appropriate options
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_POSTFIELDS, array('jsonFile' => $cfile));
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . APIKEY, 'Content-Type: multipart/form-data'));

$updateGraph = "
  UPDATE
    ballots
  SET
    graphUpdated = NOW()
  WHERE
    rcvisId = '$id';";
$sth = $dbh->prepare($updateGraph);
$sth->execute();
//   echo $query;

// grab URL and pass it to the browser
echo curl_exec($ch);

// close cURL resource, and free up system resources
curl_close($ch);

?>