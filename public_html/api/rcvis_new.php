<?php
require_once("config.php");

// create a new cURL resource
$ch = curl_init();
$id = $_GET['id'];

$selectGraph = "
  SELECT
    *
  FROM
    ballots
  WHERE
    id = '$id'
  AND
    rcvisId IS NULL;";
$sth = $dbh->prepare($selectGraph);
$sth->execute();
$results=$sth->fetchAll(PDO::FETCH_ASSOC);

if (empty($results)) {
	header("HTTP/1.1 500 ERROR");
} else {
  $updateGraph = "
    UPDATE
      ballots
    SET
      rcvisId = 123
    WHERE
      id = '$id';";
  $sth = $dbh->prepare($updateGraph);
  $sth->execute();

  // // Create a file
  $cfile = curl_file_create($_FILES['jsonFile']['tmp_name'],$_FILES['jsonFile']['type'],'jsonFile');

  // set URL and other appropriate options
  curl_setopt($ch, CURLOPT_URL, "https://www.rcvis.com/api/visualizations/");
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, array('jsonFile' => $cfile));
  curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . APIKEY, 'Content-Type: multipart/form-data'));

  // grab URL and pass it to the browser
  echo curl_exec($ch);

  // echo '{"slug":"basic-ballot-creation-test-1","id":5782,"movieHorizontal":null,"movieVertical":null,"movieGenerationStatus":0,"numRounds":1,"numCandidates":1,"title":"Basic Ballot creation test","jsonFile":"https://rcvjsons-prod-us-east-1.s3.amazonaws.com/jsonFile?AWSAccessKeyId=AKIA4WE7J45B2W6TDHXU&Signature=clFhsx8LbTEBNWTGXgeIHjX78Uo%3D&Expires=1691356818","owner":"https://www.rcvis.com/api/users/656/","visualizeUrl":"https://www.rcvis.com/v/basic-ballot-creation-test-1","embedUrl":"https://www.rcvis.com/vo/basic-ballot-creation-test-1/bar","embedSankeyUrl":"https://www.rcvis.com/vo/basic-ballot-creation-test-1/sankey","embedTableUrl":"https://www.rcvis.com/vo/basic-ballot-creation-test-1/table","oembedEndpointUrl":"https://www.rcvis.com/oembed?url=https://www.rcvis.com/v/basic-ballot-creation-test-1"}1';

  // close cURL resource, and free up system resources
  curl_close($ch);
}

?>