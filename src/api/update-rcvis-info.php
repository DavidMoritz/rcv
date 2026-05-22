<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$data = [];
$errors = [];

if (empty($_POST['userId'])) {
  $errors['userId'] = 'userId is required.';
}

if (!isset($_POST['rcvisInfo'])) {
  $errors['rcvisInfo'] = 'rcvisInfo is required.';
} else {
  $rcvisInfo = $_POST['rcvisInfo'];
  if (is_string($rcvisInfo)) {
    $decoded = json_decode($rcvisInfo, true);
    if ($decoded === null && $rcvisInfo !== 'null') {
      $errors['rcvisInfo'] = 'rcvisInfo must be valid JSON.';
    }
  } else {
    // If passed as object, encode it
    $rcvisInfo = json_encode($rcvisInfo);
  }
}

if (empty($errors)) {
  $query = "
    UPDATE users
    SET rcvisInfo = :rcvisInfo
    WHERE id = :userId";
  $sth = $dbh->prepare($query);
  $sth->bindValue(':rcvisInfo', $rcvisInfo, PDO::PARAM_STR);
  $sth->bindValue(':userId', $_POST['userId'], PDO::PARAM_STR);
  $sth->execute();

  $data['success'] = true;
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
