<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$apiKey = $_POST['apiKey'];
$data = [];
$errors = [];

if (empty($apiKey)) {
  $errors['apiKey'] = 'API key is required.';
} else {
  $ch = curl_init();
  // Use /api/users/ which requires auth: 401 = invalid token, 403 = valid token
  curl_setopt($ch, CURLOPT_URL, 'https://www.rcvis.com/api/users/');
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
  curl_setopt($ch, CURLOPT_HTTPHEADER, array('Authorization: Token ' . $apiKey));

  curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

  $data['valid'] = $httpCode !== 401 && $httpCode !== 0;
  $data['httpCode'] = $httpCode;
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
