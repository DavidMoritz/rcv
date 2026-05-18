<?php
require_once("config.php");
$_POST = json_decode(file_get_contents('php://input'), true);

$ballotId = $_POST['ballotId'] ?? null;
$userId = $_POST['userId'] ?? null;
$customHtml = $_POST['customHtml'] ?? '';
$data = [];
$errors = [];

if (empty($ballotId)) {
    $errors['ballotId'] = 'Ballot ID is required';
}
if (empty($userId)) {
    $errors['userId'] = 'User ID is required';
}

if (empty($errors)) {
    $sth = $dbh->prepare("UPDATE ballots SET customHtml = :html WHERE id = :id AND createdBy = :userId");
    $sth->bindValue(':html', $customHtml, PDO::PARAM_STR);
    $sth->bindValue(':id', $ballotId, PDO::PARAM_INT);
    $sth->bindValue(':userId', $userId, PDO::PARAM_STR);
    $sth->execute();

    if ($sth->rowCount() > 0) {
        $data['success'] = true;
    } else {
        // Could be no change or no permission — check if ballot exists and is owned
        $check = $dbh->prepare("SELECT id FROM ballots WHERE id = :id AND createdBy = :userId");
        $check->bindValue(':id', $ballotId, PDO::PARAM_INT);
        $check->bindValue(':userId', $userId, PDO::PARAM_STR);
        $check->execute();
        if ($check->fetch()) {
            $data['success'] = true; // No change needed (same content)
        } else {
            $errors['ballot'] = 'Ballot not found or you do not have permission';
        }
    }
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
