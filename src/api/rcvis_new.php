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
    id = :id
  AND
    rcvisId IS NULL;";
$sth = $dbh->prepare($selectGraph);
$sth->bindValue(':id', $id, PDO::PARAM_STR);
$sth->execute();
$results=$sth->fetchAll(PDO::FETCH_ASSOC);

if (empty($results)) {
	header("HTTP/1.1 500 ERROR");
  echo json_encode(['error' => 'Ballot already has a visualization or was not found.']);
} else {
  $updateGraph = "
    UPDATE
      ballots
    SET
      rcvisId = 123
    WHERE
      id = :id;";
  $sth = $dbh->prepare($updateGraph);
  $sth->bindValue(':id', $id, PDO::PARAM_STR);
  $sth->execute();

  // Look up the ballot creator's rcvisInfo API key
  $apiKey = defined('APIKEY') ? APIKEY : '';
  $keyQuery = "
    SELECT u.rcvisInfo
    FROM ballots b
    JOIN users u ON u.id = b.createdBy
    WHERE b.id = :id";
  $sth = $dbh->prepare($keyQuery);
  $sth->execute([':id' => $id]);
  $row = $sth->fetch(PDO::FETCH_ASSOC);
  if ($row && !empty($row['rcvisInfo'])) {
    $info = json_decode($row['rcvisInfo'], true);
    if ($info && !empty($info['apiKey'])) {
      $apiKey = $info['apiKey'];
    }
  }

  // Create a file
  $cfile = curl_file_create($_FILES['jsonFile']['tmp_name'],$_FILES['jsonFile']['type'],'jsonFile');

  // set URL and other appropriate options
  curl_setopt($ch, CURLOPT_URL, "https://www.rcvis.com/api/visualizations/");
  curl_setopt($ch, CURLOPT_POST, 1);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($ch, CURLOPT_POSTFIELDS, array('jsonFile' => $cfile));
  curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . $apiKey, 'Content-Type: multipart/form-data'));

  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

  if ($httpCode >= 200 && $httpCode < 300) {
    // Set graphUpdated now so the ballot is consistent even before the frontend callback
    $updateTime = "UPDATE ballots SET graphUpdated = UTC_TIMESTAMP() WHERE id = :id";
    $sth = $dbh->prepare($updateTime);
    $sth->bindValue(':id', $id, PDO::PARAM_STR);
    $sth->execute();

    echo $response;
  } else {
    // Roll back the placeholder rcvisId so the user can retry
    $rollback = "UPDATE ballots SET rcvisId = NULL WHERE id = :id";
    $sth = $dbh->prepare($rollback);
    $sth->bindValue(':id', $id, PDO::PARAM_STR);
    $sth->execute();

    http_response_code($httpCode ?: 502);
    echo json_encode([
      'error' => 'RCVis API error (HTTP ' . $httpCode . '). Check that your API key is valid.',
      'detail' => $response,
    ]);
  }
}

?>
