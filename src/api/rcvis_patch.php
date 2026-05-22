<?php
require_once("config.php");

// create a new cURL resource
$ch = curl_init();
$id = $_GET['id'];

$url = "https://www.rcvis.com/api/visualizations/$id/";

$cfile = curl_file_create($_FILES['jsonFile']['tmp_name'],$_FILES['jsonFile']['type'],'jsonFile');

// Look up the ballot creator's rcvisInfo API key
$apiKey = defined('APIKEY') ? APIKEY : '';
$keyQuery = "
  SELECT u.rcvisInfo
  FROM ballots b
  JOIN users u ON u.id = b.createdBy
  WHERE b.rcvisId = :id";
$sth = $dbh->prepare($keyQuery);
$sth->execute([':id' => $id]);
$row = $sth->fetch(PDO::FETCH_ASSOC);
if ($row && !empty($row['rcvisInfo'])) {
  $info = json_decode($row['rcvisInfo'], true);
  if ($info && !empty($info['apiKey'])) {
    $apiKey = $info['apiKey'];
  }
}

curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
// set URL and other appropriate options
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
curl_setopt($ch, CURLOPT_POSTFIELDS, array('jsonFile' => $cfile));
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . $apiKey, 'Content-Type: multipart/form-data'));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($httpCode >= 200 && $httpCode < 300) {
  // Only update graphUpdated on success
  $updateGraph = "
    UPDATE
      ballots
    SET
      graphUpdated = UTC_TIMESTAMP()
    WHERE
      rcvisId = :id;";
  $sth = $dbh->prepare($updateGraph);
  $sth->execute([':id' => $id]);

  echo $response;
} else {
  http_response_code($httpCode ?: 502);
  echo json_encode([
    'error' => 'RCVis API error (HTTP ' . $httpCode . '). Check that your API key is valid.',
    'detail' => $response,
  ]);
}

?>
