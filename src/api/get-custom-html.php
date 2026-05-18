<?php
require_once("config.php");

$ballotId = $_GET['ballotId'] ?? null;
$userId = $_GET['userId'] ?? null;
$data = [];
$errors = [];

if (empty($ballotId)) {
    $errors['ballotId'] = 'Ballot ID is required';
}
if (empty($userId)) {
    $errors['userId'] = 'User ID is required';
}

if (empty($errors)) {
    $sth = $dbh->prepare("SELECT CAST(customHtml AS CHAR) AS customHtml FROM ballots WHERE id = :id AND createdBy = :userId");
    $sth->bindValue(':id', $ballotId, PDO::PARAM_INT);
    $sth->bindValue(':userId', $userId, PDO::PARAM_STR);
    $sth->execute();
    $row = $sth->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $data['customHtml'] = $row['customHtml'];
    } else {
        $errors['ballot'] = 'Ballot not found or you do not have permission';
    }
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
