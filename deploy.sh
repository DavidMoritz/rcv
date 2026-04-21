#!/bin/bash
set -e

# Load config
CONFIG_FILE="$(dirname "$0")/.deploy-config"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: .deploy-config not found. Copy from template and fill in your credentials."
    exit 1
fi
source "$CONFIG_FILE"

# Validate config
if [ "$SFTP_HOST" = "your-host.com" ] || [ -z "$SFTP_HOST" ]; then
    echo "Error: Please configure .deploy-config with your SFTP credentials."
    exit 1
fi

# Bump version number
VERSION_FILE="$(dirname "$0")/.version"
CURRENT_VERSION=$(cat "$VERSION_FILE")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

if [[ "$1" == "--minor" ]]; then
    MINOR=$((MINOR + 1))
    PATCH=0
else
    PATCH=$((PATCH + 1))
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "$NEW_VERSION" > "$VERSION_FILE"
sed -i '' "s/Version [0-9]*\.[0-9]*\.[0-9]*/Version $NEW_VERSION/" src/terms-of-service.html
echo "Version: $CURRENT_VERSION → $NEW_VERSION"

# Update copyright year to current year
CURRENT_YEAR=$(date +%Y)
sed -i '' "s/2016-[0-9]\{4\}/2016-$CURRENT_YEAR/" src/index.html
echo "Updated copyright year to $CURRENT_YEAR"

# Build first
echo "Building production assets..."
npm run build

# Remove local files from dist so they never overwrite production
rm -f dist/api/config.php
rm -f dist/api/.popular-cache.json

# Deploy with rsync over SSH
echo ""
echo "Deploying to $SFTP_HOST:$SFTP_REMOTE_PATH..."

RSYNC_OPTS="-avz --exclude='.popular-cache.json' --exclude='api/config.php'"
SSH_OPTS="-p ${SFTP_PORT:-22}"

if [ -n "$SFTP_KEY_PATH" ]; then
    SSH_OPTS="$SSH_OPTS -i $SFTP_KEY_PATH"
fi

rsync $RSYNC_OPTS -e "ssh $SSH_OPTS" dist/ "${SFTP_USER}@${SFTP_HOST}:${SFTP_REMOTE_PATH}/"

echo ""

# Verify site is healthy after deploy
echo "Verifying site health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://rankedchoices.com/" 2>/dev/null)
API_RESPONSE=$(curl -s "https://rankedchoices.com/api/get-settings.php" 2>/dev/null | head -c 20)

if [ "$HTTP_STATUS" != "200" ]; then
    echo "WARNING: Site returned HTTP $HTTP_STATUS — check https://rankedchoices.com immediately!"
elif echo "$API_RESPONSE" | grep -qi "SQLSTATE"; then
    echo "WARNING: API is returning database errors — config.php may have been overwritten!"
else
    echo "Site is healthy (HTTP $HTTP_STATUS, API responding)."
fi

# Commit and push version bump
echo "Committing version bump..."
git add .version src/terms-of-service.html src/index.html
git commit -m "v$NEW_VERSION"
git push

echo ""
echo "Deploy complete!"
