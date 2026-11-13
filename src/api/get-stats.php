<?php
require_once("config.php");

$cacheKey = 'about_stats';
$maxAge = 7 * 24 * 60 * 60; // 7 days in seconds

// Check for cached stats
$sth = $dbh->prepare("SELECT value, updated FROM cached_info WHERE `key` = :key");
$sth->execute([':key' => $cacheKey]);
$cached = $sth->fetch(PDO::FETCH_ASSOC);

if ($cached) {
    $updatedTime = strtotime($cached['updated']);
    if (time() - $updatedTime < $maxAge) {
        $value = json_decode($cached['value'], true);
        echo json_encode(['data' => $value]);
        exit;
    }
}

// Fetch fresh counts
$accounts = (int) $dbh->query("SELECT COUNT(*) FROM users")->fetchColumn();
$ballots  = (int) $dbh->query("SELECT COUNT(*) FROM ballots")->fetchColumn();
$votes    = (int) $dbh->query("SELECT COUNT(*) FROM votes")->fetchColumn();

// Year selection: current year if month >= 10, else previous year
$month = (int) gmdate('n');
$year  = (int) gmdate('Y');
if ($month < 10) {
    $year--;
}

$sth = $dbh->prepare("SELECT COUNT(*) FROM ballots WHERE YEAR(timeCreated) = :year");
$sth->bindValue(':year', $year, PDO::PARAM_INT);
$sth->execute();
$yearBallots = (int) $sth->fetchColumn();

$sth = $dbh->prepare("SELECT COUNT(*) FROM votes WHERE YEAR(date_created) = :year");
$sth->bindValue(':year', $year, PDO::PARAM_INT);
$sth->execute();
$yearVotes = (int) $sth->fetchColumn();

$sth = $dbh->prepare("SELECT COUNT(*) FROM users WHERE YEAR(createdAt) = :year");
$sth->bindValue(':year', $year, PDO::PARAM_INT);
$sth->execute();
$yearAccounts = (int) $sth->fetchColumn();

// Floor-round and format
function floorRound($n, $step = 0) {
    if ($step) {
        $rounded = (int) (floor($n / $step) * $step);
    } elseif ($n < 1000) {
        $rounded = (int) (floor($n / 100) * 100);
    } elseif ($n < 100000) {
        $rounded = (int) (floor($n / 1000) * 1000);
    } else {
        $rounded = (int) (floor($n / 10000) * 10000);
    }
    return number_format($rounded) . '+';
}

$data = [
    'accounts'     => floorRound($accounts, 100),
    'ballots'      => floorRound($ballots),
    'votes'        => floorRound($votes),
    'year'         => $year,
    'yearBallots'  => floorRound($yearBallots),
    'yearVotes'    => floorRound($yearVotes),
    'yearAccounts' => floorRound($yearAccounts, 100),
];

// Upsert cache (REPLACE works in both MySQL and SQLite)
$json = json_encode($data);
$sth = $dbh->prepare("REPLACE INTO cached_info (`key`, value, updated) VALUES (:key, :value, :now)");
$sth->execute([
    ':key'   => $cacheKey,
    ':value' => $json,
    ':now'   => gmdate('Y-m-d H:i:s'),
]);

echo json_encode(['data' => $data]);
