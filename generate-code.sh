#!/bin/bash
# Quick Redemption Code Generator
# Usage: ./generate-code.sh [OPTIONS]

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
ADMIN_TOKEN="${DEBUG_ENDPOINTS_TOKEN:-test-alpha-2025}"

# Default values
TIER="lifetime"
MAX_USES=1
EXPIRES_IN_DAYS="null"
CODE_PREFIX="RUG"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tier)
      TIER="$2"
      shift 2
      ;;
    --max-uses)
      MAX_USES="$2"
      shift 2
      ;;
    --expires)
      EXPIRES_IN_DAYS="$2"
      shift 2
      ;;
    --prefix)
      CODE_PREFIX="$2"
      shift 2
      ;;
    --url)
      API_URL="$2"
      shift 2
      ;;
    --token)
      ADMIN_TOKEN="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./generate-code.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --tier <tier>          Tier: lifetime, individual, or group (default: lifetime)"
      echo "  --max-uses <number>    Max uses (default: 1, use 'null' for unlimited)"
      echo "  --expires <days>       Expires in X days (default: null for never)"
      echo "  --prefix <prefix>      Code prefix (default: RUG)"
      echo "  --url <url>            API URL (default: http://localhost:3000)"
      echo "  --token <token>        Admin token (default: from DEBUG_ENDPOINTS_TOKEN env)"
      echo ""
      echo "Examples:"
      echo "  ./generate-code.sh"
      echo "  ./generate-code.sh --tier lifetime --max-uses 10"
      echo "  ./generate-code.sh --prefix PROMO --expires 30"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build JSON payload
if [ "$MAX_USES" = "null" ]; then
  MAX_USES_JSON="null"
else
  MAX_USES_JSON="$MAX_USES"
fi

if [ "$EXPIRES_IN_DAYS" = "null" ]; then
  EXPIRES_JSON="null"
else
  EXPIRES_JSON="$EXPIRES_IN_DAYS"
fi

# Generate code
echo "Generating redemption code..."
echo "Tier: $TIER"
echo "Max Uses: $MAX_USES"
echo "Expires: $EXPIRES_IN_DAYS days"
echo "Prefix: $CODE_PREFIX"
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}/api/admin/codes/generate?token=${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"tier\": \"${TIER}\",
    \"maxUses\": ${MAX_USES_JSON},
    \"expiresInDays\": ${EXPIRES_JSON},
    \"codePrefix\": \"${CODE_PREFIX}\"
  }")

# Check if successful
if echo "$RESPONSE" | grep -q "success.*true"; then
  CODE=$(echo "$RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Success!"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "   CODE: $CODE"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Share this code with users to redeem:"
  echo "  Website: https://your-site.com/subscription"
  echo "  Telegram: /redeem $CODE"
  echo "  Discord: /redeem $CODE"
else
  echo "❌ Error generating code:"
  echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
  exit 1
fi
