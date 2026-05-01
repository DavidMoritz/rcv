<?php
/**
 * PHPUnit bootstrap: creates a SQLite database file and loads the schema.
 *
 * The DB path is stored in the RCV_TEST_DB environment variable so both
 * the PHPUnit process and subprocess API calls share the same database.
 */

$dbPath = sys_get_temp_dir() . '/rcv_test_' . getmypid() . '.sqlite';

// Create and initialize the database
$pdo = new PDO("sqlite:$dbPath");
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->exec('PRAGMA foreign_keys=ON');

// Load the schema
$schema = file_get_contents(__DIR__ . '/schema-sqlite.sql');
$pdo->exec($schema);

// Close the bootstrap connection so it doesn't hold locks
$pdo = null;

// Store path for prepend.php and ApiTestCase
putenv("RCV_TEST_DB=$dbPath");
$_ENV['RCV_TEST_DB'] = $dbPath;

// Clean up on exit
register_shutdown_function(function () use ($dbPath) {
    @unlink($dbPath);
    @unlink($dbPath . '-wal');
    @unlink($dbPath . '-shm');
});
