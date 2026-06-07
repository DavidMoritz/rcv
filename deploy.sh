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

check_paypal_donations() {
    # Skip if PayPal credentials aren't configured
    if [ -z "$PAYPAL_CLIENT_ID" ] || [ "$PAYPAL_CLIENT_ID" = "your-client-id" ] || \
       [ -z "$PAYPAL_SECRET" ] || [ "$PAYPAL_SECRET" = "your-secret" ]; then
        return 0
    fi

    echo "Checking for new donations..."

    LAST_CHECK_FILE="$(dirname "$0")/.paypal-last-check"

    # Default to 30 days ago on first run
    if [ -f "$LAST_CHECK_FILE" ]; then
        SINCE=$(cat "$LAST_CHECK_FILE")
    else
        SINCE=$(date -u -v-30d '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '30 days ago' '+%Y-%m-%dT%H:%M:%SZ')
    fi

    NOW=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    # Get OAuth token
    TOKEN_RESPONSE=$(curl -s -X POST "https://api-m.paypal.com/v1/oauth2/token" \
        -u "$PAYPAL_CLIENT_ID:$PAYPAL_SECRET" \
        -d "grant_type=client_credentials" 2>/dev/null)

    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null)

    if [ -z "$ACCESS_TOKEN" ]; then
        echo "  (Could not authenticate with PayPal — skipping)"
        echo ""
        return 0
    fi

    # Query transactions since last check
    TXN_RESPONSE=$(curl -s -G "https://api-m.paypal.com/v1/reporting/transactions" \
        --data-urlencode "start_date=$SINCE" \
        --data-urlencode "end_date=$NOW" \
        --data-urlencode "transaction_type=T0100" \
        --data-urlencode "fields=transaction_info,payer_info" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" 2>/dev/null)

    # Parse and display donations
    python3 -c "
import sys, json

try:
    data = json.loads(sys.stdin.read())
except (json.JSONDecodeError, ValueError):
    sys.exit(0)

txns = data.get('transaction_details', [])

# Filter to incoming payments (positive amounts, completed)
donations = []
for t in txns:
    info = t.get('transaction_info', {})
    payer = t.get('payer_info', {})
    amount = info.get('transaction_amount', {})
    value = float(amount.get('value', '0'))
    status = info.get('transaction_status', '')
    if value > 0 and status == 'S':
        name = payer.get('payer_name', {})
        full_name = '{} {}'.format(
            name.get('given_name', ''),
            name.get('surname', '')
        ).strip() or 'Anonymous'
        date = info.get('transaction_initiation_date', '')[:10]
        currency = amount.get('currency_code', 'USD')
        donations.append((date, full_name, currency, value))

if not donations:
    print('  No new donations.')
    print()
    sys.exit(0)

print()
print('  *** New Donations! ***')
print('  ' + '-' * 45)
for date, name, currency, value in donations:
    print('  {}  {:<22s} {} {:>7.2f}'.format(date, name, currency, value))
print('  ' + '-' * 45)
print('  Total: {} donation(s)'.format(len(donations)))
print()
" <<< "$TXN_RESPONSE"

    # Update last-check timestamp
    echo "$NOW" > "$LAST_CHECK_FILE"
}

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

# Run tests first
echo "Running tests..."
npm test

# Build
echo "Building production assets..."
npm run build

# Remove local files from dist so they never overwrite production
rm -f dist/api/config.php
rm -f dist/api/.popular-cache.json

# Deploy with rsync over SSH
echo ""
echo "Deploying to $SFTP_HOST:$SFTP_REMOTE_PATH..."

SSH_OPTS="-p ${SFTP_PORT:-22}"

if [ -n "$SFTP_KEY_PATH" ]; then
    SSH_OPTS="$SSH_OPTS -i $SFTP_KEY_PATH"
fi

rsync -avz --delete \
    --exclude='.popular-cache.json' \
    --exclude='api/config.php' \
    -e "ssh $SSH_OPTS" \
    dist/ "${SFTP_USER}@${SFTP_HOST}:${SFTP_REMOTE_PATH}/"

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

echo ""
check_paypal_donations || true

# Commit and push version bump
echo "Committing version bump..."
git add .version src/terms-of-service.html src/index.html
git commit -m "v$NEW_VERSION"
git push

echo ""
echo "Deploy complete!"
