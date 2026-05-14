<?php
require_once("config.php");

session_start();

header('Content-Type: application/json');

set_error_handler(function($errno, $errstr, $errfile, $errline) {
    throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
});

set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(['errors' => ['server' => $e->getMessage() . ' on line ' . $e->getLine()]]);
    exit;
});

$_POST = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? $_POST['action'] ?? '';

$data = [];
$errors = [];

// Validate admin token for all actions except login
if ($action !== 'login') {
    $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';
    if (empty($token) || !isset($_SESSION['admin_token']) || $token !== $_SESSION['admin_token']) {
        http_response_code(401);
        echo json_encode(['errors' => ['auth' => 'Unauthorized']]);
        exit;
    }
}

switch ($action) {
    case 'login':
        $password = $_POST['password'] ?? '';
        if ($password === $adminPassword) {
            $token = bin2hex(random_bytes(32));
            $_SESSION['admin_token'] = $token;
            $data['token'] = $token;
            $data['success'] = true;
        } else {
            $errors['password'] = 'Invalid password';
        }
        break;

    case 'stats':
        $stmt = $dbh->query("SELECT COUNT(*) as count FROM ballots");
        $data['totalBallots'] = (int)$stmt->fetchColumn();

        $stmt = $dbh->query("SELECT COUNT(*) as count FROM votes");
        $data['totalVotes'] = (int)$stmt->fetchColumn();

        $stmt = $dbh->query("SELECT COUNT(*) as count FROM users");
        $data['totalUsers'] = (int)$stmt->fetchColumn();

        $stmt = $dbh->query("SELECT COUNT(*) as count FROM entries");
        $data['totalEntries'] = (int)$stmt->fetchColumn();

        $stmt = $dbh->query("SELECT * FROM ballots ORDER BY timeCreated DESC LIMIT 5");
        $data['recentBallots'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $data['success'] = true;
        break;

    case 'ballots':
        $search = $_POST['search'] ?? '';
        $page = max(1, (int)($_POST['page'] ?? 1));
        $limit = 50;
        $offset = ($page - 1) * $limit;

        if (!empty($search)) {
            $stmt = $dbh->prepare("
                SELECT b.*, u.username as ownerName,
                    (SELECT COUNT(*) FROM votes v WHERE v.ballotId = b.id) as voteCount,
                    (SELECT COUNT(*) FROM entries e WHERE e.ballotId = b.id) as entryCount
                FROM ballots b
                LEFT JOIN users u ON b.createdBy = u.id
                WHERE b.name LIKE :search OR b.`key` LIKE :search2
                ORDER BY b.timeCreated DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmt->bindValue(':search', "%$search%");
            $stmt->bindValue(':search2', "%$search%");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
        } else {
            $stmt = $dbh->prepare("
                SELECT b.*, u.username as ownerName,
                    (SELECT COUNT(*) FROM votes v WHERE v.ballotId = b.id) as voteCount,
                    (SELECT COUNT(*) FROM entries e WHERE e.ballotId = b.id) as entryCount
                FROM ballots b
                LEFT JOIN users u ON b.createdBy = u.id
                ORDER BY b.timeCreated DESC
                LIMIT :limit OFFSET :offset
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
        }

        $data['ballots'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get total count
        if (!empty($search)) {
            $countStmt = $dbh->prepare("SELECT COUNT(*) FROM ballots WHERE name LIKE :search OR `key` LIKE :search2");
            $countStmt->bindValue(':search', "%$search%");
            $countStmt->bindValue(':search2', "%$search%");
            $countStmt->execute();
        } else {
            $countStmt = $dbh->query("SELECT COUNT(*) FROM ballots");
        }
        $data['totalCount'] = (int)$countStmt->fetchColumn();
        $data['page'] = $page;
        $data['totalPages'] = ceil($data['totalCount'] / $limit);
        $data['success'] = true;
        break;

    case 'users':
        $stmt = $dbh->query("
            SELECT u.id, u.username, u.email, u.role, u.clearance,
                COUNT(b.id) as ballotCount
            FROM users u
            LEFT JOIN ballots b ON b.createdBy = u.id
            GROUP BY u.id, u.username, u.email, u.role, u.clearance
            HAVING ballotCount > 9
            ORDER BY ballotCount DESC
        ");
        $data['users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $data['success'] = true;
        break;

    case 'user-ballots':
        $userId = $_POST['userId'] ?? '';
        if (empty($userId)) {
            $errors['userId'] = 'User ID is required';
            break;
        }

        $stmt = $dbh->prepare("
            SELECT b.id, b.name, b.`key`, b.timeCreated,
                COUNT(v.vote_id) as voteCount
            FROM ballots b
            LEFT JOIN votes v ON v.ballotId = b.id
            WHERE b.createdBy = :userId
              AND LOWER(b.name) NOT LIKE '%% test %%'
              AND LOWER(b.name) NOT LIKE 'test %%'
              AND LOWER(b.name) NOT LIKE '%% test'
              AND LOWER(b.name) != 'test'
            GROUP BY b.id
            ORDER BY b.timeCreated DESC
        ");
        $stmt->execute([':userId' => $userId]);
        $data['ballots'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get user info
        $stmt = $dbh->prepare("SELECT id, username, email, role FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $data['user'] = $stmt->fetch(PDO::FETCH_ASSOC);

        $data['success'] = true;
        break;

    case 'delete-ballot':
        $ballotId = (int)($_POST['ballotId'] ?? 0);
        if ($ballotId <= 0) {
            $errors['ballotId'] = 'Invalid ballot ID';
            break;
        }

        $dbh->beginTransaction();
        try {
            $stmt = $dbh->prepare("DELETE FROM votes WHERE ballotId = :id");
            $stmt->execute([':id' => $ballotId]);

            $stmt = $dbh->prepare("DELETE FROM entries WHERE ballotId = :id");
            $stmt->execute([':id' => $ballotId]);

            $stmt = $dbh->prepare("DELETE FROM ballots WHERE id = :id");
            $stmt->execute([':id' => $ballotId]);

            $dbh->commit();
            $data['success'] = true;
        } catch (Exception $e) {
            $dbh->rollBack();
            $errors['db'] = 'Failed to delete ballot: ' . $e->getMessage();
        }
        break;

    case 'delete-votes':
        $ballotId = (int)($_POST['ballotId'] ?? 0);
        if ($ballotId <= 0) {
            $errors['ballotId'] = 'Invalid ballot ID';
            break;
        }

        $stmt = $dbh->prepare("DELETE FROM votes WHERE ballotId = :id");
        $stmt->execute([':id' => $ballotId]);
        $data['deletedCount'] = $stmt->rowCount();
        $data['success'] = true;
        break;

    case 'transfer-ballot':
        $ballotId = (int)($_POST['ballotId'] ?? 0);
        $newOwnerId = $_POST['newOwnerId'] ?? '';
        if ($ballotId <= 0) {
            $errors['ballotId'] = 'Invalid ballot ID';
            break;
        }
        if (empty($newOwnerId)) {
            $errors['newOwnerId'] = 'New owner ID is required';
            break;
        }

        // Verify user exists
        $stmt = $dbh->prepare("SELECT id FROM users WHERE id = :id");
        $stmt->execute([':id' => $newOwnerId]);
        if (!$stmt->fetch()) {
            $errors['newOwnerId'] = 'User not found';
            break;
        }

        $stmt = $dbh->prepare("UPDATE ballots SET createdBy = :owner WHERE id = :id");
        $stmt->execute([':owner' => $newOwnerId, ':id' => $ballotId]);
        $data['success'] = true;
        break;

    case 'popular':
        $cacheFile = __DIR__ . '/.popular-cache.json';
        $cache = file_exists($cacheFile) ? json_decode(file_get_contents($cacheFile), true) : null;

        if ($cache && !empty($cache['topBallots'])) {
            // Check new ballots since last check
            $stmt = $dbh->prepare("
                SELECT b.id, b.name, b.`key`, b.createdBy, b.timeCreated,
                    b.positions, b.register, b.voteCutoff, b.resultsRelease,
                    b.oneDeviceOneVote, b.isSecure, b.allowCustom, b.allowGrouping, b.orderedEntries, b.kickbackUrl, b.iframeUrl, b.showGraph,
                    u.username as ownerName,
                    COUNT(v.vote_id) as voteCount,
                    COALESCE(ec.entryCount, 0) as entryCount,
                    COALESCE(ec.hasImage, 0) as hasImage,
                    COALESCE(ec.hasColor, 0) as hasColor,
                    COALESCE(ec.hasHyperlink, 0) as hasHyperlink
                FROM ballots b
                LEFT JOIN users u ON b.createdBy = u.id
                LEFT JOIN votes v ON v.ballotId = b.id
                LEFT JOIN (
                    SELECT ballotId, COUNT(*) as entryCount,
                        SUM(image != '') as hasImage,
                        SUM(color IS NOT NULL AND color != '') as hasColor,
                        SUM(hyperlink != '') as hasHyperlink
                    FROM entries GROUP BY ballotId
                ) ec ON ec.ballotId = b.id
                WHERE b.timeCreated > :lastChecked
                GROUP BY b.id
                HAVING voteCount > 0
            ");
            $stmt->execute([':lastChecked' => $cache['lastChecked']]);
            $newBallots = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Merge new ballots with cached top, sort, take top 10
            $minVoteCount = end($cache['topBallots'])['voteCount'];
            $candidates = array_filter($newBallots, function($b) use ($minVoteCount) {
                return $b['voteCount'] > $minVoteCount;
            });

            if (!empty($candidates)) {
                // Fetch full data for cached IDs to merge with new candidates
                $cachedIds = array_column($cache['topBallots'], 'id');
                $placeholders = implode(',', array_fill(0, count($cachedIds), '?'));
                $stmt = $dbh->prepare("
                    SELECT b.id, b.name, b.`key`, b.createdBy, b.timeCreated,
                        b.positions, b.register, b.voteCutoff, b.resultsRelease,
                        b.oneDeviceOneVote, b.isSecure, b.allowCustom, b.allowGrouping, b.orderedEntries, b.kickbackUrl, b.iframeUrl, b.showGraph,
                        u.username as ownerName,
                        COUNT(v.vote_id) as voteCount,
                        COALESCE(ec.entryCount, 0) as entryCount,
                        COALESCE(ec.hasImage, 0) as hasImage,
                        COALESCE(ec.hasColor, 0) as hasColor,
                        COALESCE(ec.hasHyperlink, 0) as hasHyperlink
                    FROM ballots b
                    LEFT JOIN users u ON b.createdBy = u.id
                    LEFT JOIN votes v ON v.ballotId = b.id
                    LEFT JOIN (
                        SELECT ballotId, COUNT(*) as entryCount,
                            SUM(image != '') as hasImage,
                            SUM(color IS NOT NULL AND color != '') as hasColor,
                            SUM(hyperlink != '') as hasHyperlink
                        FROM entries GROUP BY ballotId
                    ) ec ON ec.ballotId = b.id
                    WHERE b.id IN ($placeholders)
                    GROUP BY b.id
                    ORDER BY voteCount DESC
                ");
                $stmt->execute($cachedIds);
                $cached = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $all = array_merge($cached, $candidates);
                $byId = [];
                foreach ($all as $b) { $byId[$b['id']] = $b; }
                usort($byId, function($a, $b) { return $b['voteCount'] - $a['voteCount']; });
                $top = array_slice(array_values($byId), 0, 10);
            } else {
                // No new challengers — return cached data directly
                $cachedIds = array_column($cache['topBallots'], 'id');
                $placeholders = implode(',', array_fill(0, count($cachedIds), '?'));
                $stmt = $dbh->prepare("
                    SELECT b.id, b.name, b.`key`, b.createdBy, b.timeCreated,
                        b.positions, b.register, b.voteCutoff, b.resultsRelease,
                        b.oneDeviceOneVote, b.isSecure, b.allowCustom, b.allowGrouping, b.orderedEntries, b.kickbackUrl, b.iframeUrl, b.showGraph,
                        u.username as ownerName,
                        COUNT(v.vote_id) as voteCount,
                        COALESCE(ec.entryCount, 0) as entryCount,
                        COALESCE(ec.hasImage, 0) as hasImage,
                        COALESCE(ec.hasColor, 0) as hasColor,
                        COALESCE(ec.hasHyperlink, 0) as hasHyperlink
                    FROM ballots b
                    LEFT JOIN users u ON b.createdBy = u.id
                    LEFT JOIN votes v ON v.ballotId = b.id
                    LEFT JOIN (
                        SELECT ballotId, COUNT(*) as entryCount,
                            SUM(image != '') as hasImage,
                            SUM(color IS NOT NULL AND color != '') as hasColor,
                            SUM(hyperlink != '') as hasHyperlink
                        FROM entries GROUP BY ballotId
                    ) ec ON ec.ballotId = b.id
                    WHERE b.id IN ($placeholders)
                    GROUP BY b.id
                    ORDER BY voteCount DESC
                ");
                $stmt->execute($cachedIds);
                $top = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
        } else {
            // First run: full scan
            $stmt = $dbh->query("
                SELECT b.id, b.name, b.`key`, b.createdBy, b.timeCreated,
                    b.positions, b.register, b.voteCutoff, b.resultsRelease,
                    b.oneDeviceOneVote, b.isSecure, b.allowCustom, b.allowGrouping, b.orderedEntries, b.kickbackUrl, b.iframeUrl, b.showGraph,
                    u.username as ownerName,
                    COUNT(v.vote_id) as voteCount,
                    COALESCE(ec.entryCount, 0) as entryCount,
                    COALESCE(ec.hasImage, 0) as hasImage,
                    COALESCE(ec.hasColor, 0) as hasColor,
                    COALESCE(ec.hasHyperlink, 0) as hasHyperlink
                FROM ballots b
                LEFT JOIN users u ON b.createdBy = u.id
                LEFT JOIN votes v ON v.ballotId = b.id
                LEFT JOIN (
                    SELECT ballotId, COUNT(*) as entryCount,
                        SUM(image != '') as hasImage,
                        SUM(color IS NOT NULL AND color != '') as hasColor,
                        SUM(hyperlink != '') as hasHyperlink
                    FROM entries GROUP BY ballotId
                ) ec ON ec.ballotId = b.id
                GROUP BY b.id
                HAVING voteCount > 0
                ORDER BY voteCount DESC
                LIMIT 10
            ");
            $top = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Update cache
        if (!empty($top)) {
            file_put_contents($cacheFile, json_encode([
                'lastChecked' => date('Y-m-d H:i:s'),
                'topBallots' => array_map(function($b) { return ['id' => $b['id'], 'voteCount' => (int)$b['voteCount']]; }, $top)
            ]));
        }

        $data['ballots'] = $top;
        $data['cachedAt'] = $cache['lastChecked'] ?? 'fresh';
        $data['success'] = true;
        break;

    case 'recent-active':
        $stmt = $dbh->query("
            SELECT * FROM (
                SELECT b.*, u.username as ownerName,
                    (SELECT COUNT(*) FROM votes v WHERE v.ballotId = b.id) as voteCount,
                    COALESCE(ec.entryCount, 0) as entryCount,
                    COALESCE(ec.hasImage, 0) as hasImage,
                    COALESCE(ec.hasColor, 0) as hasColor,
                    COALESCE(ec.hasHyperlink, 0) as hasHyperlink
                FROM ballots b
                LEFT JOIN users u ON b.createdBy = u.id
                LEFT JOIN (
                    SELECT ballotId, COUNT(*) as entryCount,
                        SUM(image != '') as hasImage,
                        SUM(color IS NOT NULL AND color != '') as hasColor,
                        SUM(hyperlink != '') as hasHyperlink
                    FROM entries GROUP BY ballotId
                ) ec ON ec.ballotId = b.id
                WHERE LOWER(b.name) NOT LIKE '% test %'
                  AND LOWER(b.name) NOT LIKE 'test %'
                  AND LOWER(b.name) NOT LIKE '% test'
                  AND LOWER(b.name) != 'test'
                ORDER BY b.timeCreated DESC
            ) sub WHERE voteCount >= 3
            LIMIT 50
        ");
        $data['ballots'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $data['success'] = true;
        break;

    default:
        $errors['action'] = 'Unknown action';
        break;
}

echo json_encode(['data' => $data, 'errors' => $errors]);
