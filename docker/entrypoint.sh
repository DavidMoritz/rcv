#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
attempts=0
max_attempts=30
until php -r "new PDO('mysql:host=${DB_HOST};dbname=${DB_NAME}', '${DB_USER}', '${DB_PASS}');" 2>/dev/null; do
  attempts=$((attempts + 1))
  if [ $attempts -ge $max_attempts ]; then
    echo "ERROR: MySQL not reachable after $max_attempts attempts"
    exit 1
  fi
  echo "  Attempt $attempts/$max_attempts - retrying in 2s..."
  sleep 2
done
echo "MySQL is ready!"

# Generate config.php from env vars if it doesn't already exist
if [ ! -f /app/src/api/config.php ]; then
  echo "Generating src/api/config.php from environment variables..."
  cat > /app/src/api/config.php << 'PHPEOF'
<?php
if (defined('PHPUNIT_RUNNING')) return;

define('SERVER', getenv('DB_HOST') ?: 'db');
define('USERNAME', getenv('DB_USER') ?: 'rcv_user');
define('PASSWORD', getenv('DB_PASS') ?: 'rcv_password');
define('DB', getenv('DB_NAME') ?: 'rcv_db');

$adminPassword = getenv('ADMIN_PASSWORD') ?: 'admin123';

try {
	$dbh = new PDO('mysql:host=' . SERVER . ';dbname=' . DB, USERNAME, PASSWORD, array(PDO::ATTR_PERSISTENT => true));
} catch (PDOException $e) {
	die($e->getMessage());
}
?>
PHPEOF
  echo "config.php generated."
fi

echo "Starting PHP development server on 0.0.0.0:2461..."
exec php -S 0.0.0.0:2461 -t /app/src
