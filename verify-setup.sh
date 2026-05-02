#!/bin/bash

# RCV Setup Verification Script
# This script checks your environment before you attempt to run the application
# Run with: bash verify-setup.sh

echo "=========================================="
echo "RCV Environment Verification"
echo "=========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check command existence
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "${RED}✗${NC} $1 is NOT installed"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to check version
check_version() {
    local cmd=$1
    local version_cmd=$2
    local version=$($version_cmd 2>&1)
    echo -e "  Version: $version"
}

echo "1. Checking required tools..."
echo "------------------------------"

# Node.js
if check_command node; then
    check_version node "node --version"
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "  ${YELLOW}⚠${NC} Warning: Node.js 18+ recommended (you have v$NODE_VERSION)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# npm
if check_command npm; then
    check_version npm "npm --version"
fi

# PHP
if check_command php; then
    check_version php "php --version | head -1"
    PHP_VERSION=$(php -r "echo PHP_VERSION;" | cut -d. -f1)
    if [ "$PHP_VERSION" -lt 7 ]; then
        echo -e "  ${YELLOW}⚠${NC} Warning: PHP 7.4+ recommended (you have $PHP_VERSION)"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# MySQL
echo ""
if check_command mysql; then
    check_version mysql "mysql --version"
else
    echo -e "  ${YELLOW}⚠${NC} Try 'mysqld' or check if MySQL is installed differently"
fi

# Check if MySQL is running
echo ""
echo "2. Checking MySQL service..."
echo "------------------------------"
if pgrep -x "mysqld" > /dev/null || pgrep -x "mysql" > /dev/null; then
    echo -e "${GREEN}✓${NC} MySQL service is running"
elif brew services list 2>/dev/null | grep -q "mysql.*started"; then
    echo -e "${GREEN}✓${NC} MySQL service is running (via Homebrew)"
elif systemctl is-active --quiet mysql 2>/dev/null || systemctl is-active --quiet mysqld 2>/dev/null; then
    echo -e "${GREEN}✓${NC} MySQL service is running (via systemd)"
else
    echo -e "${RED}✗${NC} MySQL service is NOT running"
    echo -e "  ${YELLOW}→${NC} Start it with: brew services start mysql (macOS) or systemctl start mysql (Linux)"
    ERRORS=$((ERRORS + 1))
fi

# Check port availability
echo ""
echo "3. Checking port availability..."
echo "------------------------------"

check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC} Port $port is already in use (needed for $service)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    else
        echo -e "${GREEN}✓${NC} Port $port is available (for $service)"
        return 0
    fi
}

check_port 2460 "Vite dev server"
check_port 2461 "PHP backend API"

# Check project files
echo ""
echo "4. Checking project files..."
echo "------------------------------"

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found. Run 'npm install' first"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "src/api/config.php" ]; then
    echo -e "${GREEN}✓${NC} src/api/config.php exists"
else
    echo -e "${RED}✗${NC} src/api/config.php NOT found"
    echo -e "  ${YELLOW}→${NC} Copy from config_sample.php: cp src/api/config_sample.php src/api/config.php"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json exists"
else
    echo -e "${RED}✗${NC} package.json NOT found (are you in the project root?)"
    ERRORS=$((ERRORS + 1))
fi

# Check database connection (if config exists)
echo ""
echo "5. Checking database connection..."
echo "------------------------------"

if [ -f "src/api/config.php" ]; then
    # Extract database credentials from config.php
    DB_NAME=$(grep "define('DB'" src/api/config.php | cut -d"'" -f4)
    DB_USER=$(grep "define('USERNAME'" src/api/config.php | cut -d"'" -f4)
    DB_PASS=$(grep "define('PASSWORD'" src/api/config.php | cut -d"'" -f4)

    if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
        echo "  Testing connection to database '$DB_NAME' as user '$DB_USER'..."

        # Try to connect using the password from config
        if [ -n "$DB_PASS" ]; then
            if mysql -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null | grep -q "ballots"; then
                echo -e "${GREEN}✓${NC} Database connection successful"
                echo -e "${GREEN}✓${NC} Required tables exist"
            elif mysql -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME;" 2>/dev/null; then
                echo -e "${YELLOW}⚠${NC} Database exists but tables may be missing"
                echo -e "  ${YELLOW}→${NC} See src/api/SETUP.md for complete table creation"
                WARNINGS=$((WARNINGS + 1))
            else
                echo -e "${RED}✗${NC} Cannot connect to database or database doesn't exist"
                echo -e "  ${YELLOW}→${NC} Follow the setup guide: src/api/SETUP.md"
                echo -e "  ${YELLOW}→${NC} Quick start (requires MySQL root access):"
                echo -e "      mysql -u root -p"
                echo -e "      CREATE DATABASE IF NOT EXISTS rcv_db;"
                echo -e "      CREATE USER 'rcv_user'@'localhost' IDENTIFIED BY 'rcv_password';"
                echo -e "      GRANT ALL PRIVILEGES ON rcv_db.* TO 'rcv_user'@'localhost';"
                echo -e "      FLUSH PRIVILEGES;"
                echo -e "      EXIT;"
                ERRORS=$((ERRORS + 1))
            fi
        else
            echo -e "${YELLOW}⚠${NC} Could not read password from config.php"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Could not read database credentials from config.php"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗${NC} Skipped (config.php not found)"
fi

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to start the application:"
    echo ""
    echo "  Development mode (recommended):"
    echo "    Terminal 1: npm run dev"
    echo "    Terminal 2: cd src && php -S localhost:2461"
    echo "    Then visit: http://localhost:2460"
    echo ""
    echo "  Production build:"
    echo "    npm run build"
    echo "    cd dist && php -S localhost:1337"
    echo "    Then visit: http://localhost:1337"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "You can probably still run the application, but may encounter issues."
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before attempting to run the application."
    exit 1
fi
