<?php
require_once("config.php");

$_POST = json_decode(file_get_contents('php://input'), true);

$data = [];
$errors = [];

$userId = isset($_POST['userId']) ? $_POST['userId'] : null;
$username = isset($_POST['username']) ? $_POST['username'] : null;
$confirmation = isset($_POST['confirmation']) ? $_POST['confirmation'] : null;

if (empty($userId)) {
    $errors['userId'] = 'User ID is required';
}
if (empty($username)) {
    $errors['username'] = 'Username is required';
}
if (empty($confirmation) && $confirmation !== '0') {
    $errors['confirmation'] = 'Confirmation is required';
}

if (empty($errors)) {
    // Verify user exists with matching id + username
    $sth = $dbh->prepare("SELECT id, username, password FROM users WHERE id = :id AND username = :username LIMIT 1");
    $sth->execute([':id' => $userId, ':username' => $username]);
    $user = $sth->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $errors['user'] = 'User not found';
    } else {
        // Verify confirmation: password hash for password users, username for OAuth users
        $valid = false;
        if (!empty($user['password'])) {
            // Password-based account: confirmation must match stored hash
            $valid = ($confirmation === $user['password']);
        } else {
            // OAuth account: confirmation must match username
            $valid = ($confirmation === $user['username']);
        }

        if (!$valid) {
            $errors['confirmation'] = 'Invalid confirmation';
        } else {
            // Orphan user's ballots so they remain accessible
            $sth = $dbh->prepare("UPDATE ballots SET createdBy = 'guest' WHERE createdBy = :userId");
            $sth->execute([':userId' => $userId]);

            // Delete the user
            $sth = $dbh->prepare("DELETE FROM users WHERE id = :userId");
            $sth->execute([':userId' => $userId]);

            $data['success'] = true;
        }
    }
}

echo json_encode(['data' => $data, 'errors' => $errors]);
