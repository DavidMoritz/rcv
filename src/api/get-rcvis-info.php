<?php
require_once("config.php");

$userId = $_GET['userId'];
$data = [];
$errors = [];

if (empty($userId)) {
  $errors['userId'] = 'userId is required.';
} else {
  $query = "SELECT rcvisInfo FROM users WHERE id = :userId";
  $sth = $dbh->prepare($query);
  $sth->bindValue(':userId', $userId, PDO::PARAM_STR);
  $sth->execute();
  $row = $sth->fetch(PDO::FETCH_ASSOC);

  if ($row) {
    $data['rcvisInfo'] = $row['rcvisInfo'];
  } else {
    $errors['userId'] = 'User not found.';
  }
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
