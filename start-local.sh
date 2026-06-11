#!/bin/bash
# Local development startup script for RCV app
# Usage: ./start-local.sh [--reset-db]

set -e

cd "$(dirname "$0")"

MYSQL="${MYSQL:-$(command -v mysql || true)}"
if [ -z "$MYSQL" ] && [ -x "/usr/local/mysql/bin/mysql" ]; then
  MYSQL="/usr/local/mysql/bin/mysql"
fi
if [ -z "$MYSQL" ]; then
  echo "Could not find mysql. Install MySQL or set MYSQL=/path/to/mysql."
  exit 1
fi
DB_USER="rcv_user"
DB_PASS="rcv_password"
DB_NAME="rcv_db"

# ─── Database setup ───────────────────────────────────────────
setup_db() {
  echo "Setting up database..."
  # Need root to create user/db
  sudo "$MYSQL" < src/api/setup-database-prod.sql
  echo "Seeding data..."
  "$MYSQL" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < src/api/seed-data.sql
  echo "Database ready."
}

# Check if database exists
if ! "$MYSQL" -u "$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME" 2>/dev/null; then
  echo "Database not found. Running first-time setup..."
  setup_db
elif [ "$1" = "--reset-db" ]; then
  echo "Resetting database..."
  setup_db
fi

# ─── Install dependencies if needed ──────────────────────────
if [ ! -d "node_modules" ]; then
  echo "Installing npm dependencies..."
  npm install
fi

# ─── Start servers ────────────────────────────────────────────
echo ""
echo "Starting PHP server on http://localhost:2461 ..."
(cd src && php -S localhost:2461) &
PHP_PID=$!

echo "Starting Vite dev server on http://localhost:3000 ..."
npm run dev &
VITE_PID=$!

echo ""
echo "──────────────────────────────────────"
echo "  Open http://localhost:2460"
echo "  PHP API: http://localhost:2461/api/"
echo "  Press Ctrl+C to stop both servers"
echo "──────────────────────────────────────"

# Clean up both servers on exit
trap "kill $PHP_PID $VITE_PID 2>/dev/null; exit" INT TERM
wait
