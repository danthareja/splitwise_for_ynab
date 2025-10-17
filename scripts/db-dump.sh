#!/bin/bash

# Script to dump production database
# Usage: npm run db:dump

set -e

PROD_DB_URL="${PROD_DATABASE_URL:-}"

if [ -z "$PROD_DB_URL" ]; then
  echo "❌ Error: PROD_DATABASE_URL environment variable is not set"
  echo ""
  echo "Usage:"
  echo "  PROD_DATABASE_URL='postgresql://user:pass@host/db' npm run db:dump"
  echo ""
  echo "Or set it in your shell:"
  echo "  export PROD_DATABASE_URL='postgresql://user:pass@host/db'"
  echo "  npm run db:dump"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.dump"

echo "📦 Dumping production database..."
echo "   Output: $BACKUP_FILE"
echo ""

docker run --rm \
  -v "$(pwd):/backup" \
  postgres:17 \
  pg_dump -Fc -v \
  -d "$PROD_DB_URL" \
  -n public \
  -f "/backup/$BACKUP_FILE"

echo ""
echo "✅ Database dump complete: $BACKUP_FILE"
echo ""
echo "To restore this dump, run:"
echo "  npm run db:restore $BACKUP_FILE"

