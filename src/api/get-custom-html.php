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
    $dbh->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);

    // Debug: check what columns exist for this ballot
    $debugSth = $dbh->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'ballots' AND COLUMN_NAME = 'customHtml'");
    $colExists = $debugSth->fetch(PDO::FETCH_ASSOC);

    // Debug: fetch with a simple query (no prepared statement)
    $rawSth = $dbh->query("SELECT customHtml, iframeUrl, createdBy, id FROM ballots WHERE id = " . intval($ballotId));
    $rawRow = $rawSth->fetch(PDO::FETCH_ASSOC);

    // Original prepared query
    $sth = $dbh->prepare("SELECT customHtml FROM ballots WHERE id = :id AND createdBy = :userId");
    $sth->bindValue(':id', $ballotId, PDO::PARAM_INT);
    $sth->bindValue(':userId', $userId, PDO::PARAM_STR);
    $sth->execute();
    $row = $sth->fetch(PDO::FETCH_ASSOC);

    if ($row) {
        $data['customHtml'] = $row['customHtml'];
    } else {
        $errors['ballot'] = 'Ballot not found or you do not have permission';
    }

    // Attach debug info
    $data['_debug'] = [
        'columnExists' => !!$colExists,
        'rawQueryResult' => $rawRow ? [
            'id' => $rawRow['id'],
            'createdBy' => $rawRow['createdBy'],
            'iframeUrl' => $rawRow['iframeUrl'],
            'customHtmlIsNull' => is_null($rawRow['customHtml']),
            'customHtmlLength' => $rawRow['customHtml'] ? strlen($rawRow['customHtml']) : 0,
            'customHtmlFirst100' => $rawRow['customHtml'] ? substr($rawRow['customHtml'], 0, 100) : null,
        ] : 'no row found',
        'preparedRowFound' => !!$row,
        'preparedCustomHtmlIsNull' => $row ? is_null($row['customHtml']) : null,
        'inputBallotId' => $ballotId,
        'inputUserId' => $userId,
    ];
}

echo json_encode(['data' => $data, 'errors' => $errors]);
?>
