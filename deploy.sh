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

# Build first
echo "Building production assets..."
npm run build

# Deploy with rsync over SSH
echo ""
echo "Deploying to $SFTP_HOST:$SFTP_REMOTE_PATH..."

RSYNC_OPTS="-avz --exclude='.popular-cache.json' --exclude='config.php'"
SSH_OPTS="-p ${SFTP_PORT:-22}"

if [ -n "$SFTP_KEY_PATH" ]; then
    SSH_OPTS="$SSH_OPTS -i $SFTP_KEY_PATH"
fi

rsync $RSYNC_OPTS -e "ssh $SSH_OPTS" dist/ "${SFTP_USER}@${SFTP_HOST}:${SFTP_REMOTE_PATH}/"

echo ""
echo "Deploy complete!"
