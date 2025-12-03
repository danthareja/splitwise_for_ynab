#!/bin/bash

# Script to restore database from a dump file
# Usage: npm run db:restore [dump_file] [target_database_url]

set -e

# Get dump file from argument or use most recent backup
if [ -z "$1" ]; then
  # Find the most recent backup file
  DUMP_FILE=$(ls -t backup_*.dump 2>/dev/null | head -1)
  if [ -z "$DUMP_FILE" ]; then
    echo "❌ Error: No backup files found"
    echo ""
    echo "Usage:"
    echo "  npm run db:restore [dump_file] [target_database_url]"
    echo ""
    echo "Examples:"
    echo "  npm run db:restore                                    # Restore latest to local dev"
    echo "  npm run db:restore backup_20250117.dump               # Restore specific to local dev"
    echo "  npm run db:restore backup_20250117.dump 'postgresql://user:pass@host/db'  # Restore to remote"
    echo ""
    echo "First create a backup with: npm run db:dump"
    exit 1
  fi
  echo "Using most recent backup: $DUMP_FILE"
else
  DUMP_FILE="$1"
  if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Error: Dump file not found: $DUMP_FILE"
    echo ""
    echo "Usage:"
    echo "  npm run db:restore [dump_file] [target_database_url]"
    echo ""
    echo "Available dump files:"
    ls -1 backup_*.dump 2>/dev/null || echo "  (none found)"
    exit 1
  fi
fi

# Get target database URL (default to local dev)
TARGET_DB_URL="${2:-postgresql://postgres:postgres@localhost:6969/dev}"

# Determine if this is a local or remote database
if [[ "$TARGET_DB_URL" == *"localhost:6969"* ]]; then
  IS_LOCAL=true
  DB_NAME="dev"
else
  IS_LOCAL=false
fi

echo "🔄 Restoring database from $DUMP_FILE..."
echo "   Target: $TARGET_DB_URL"
echo ""

if [ "$IS_LOCAL" = true ]; then
  echo "⚠️  This will clear existing data in the local 'dev' database!"
else
  echo "⚠️  This will clear existing data in the remote database!"
fi

read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Restoring..."

if [ "$IS_LOCAL" = true ]; then
  # Local restore: use docker-compose exec (faster, no network issues)
  docker cp "$DUMP_FILE" splitwise_for_ynab-postgres-1:/tmp/restore.dump

  docker-compose exec -T postgres psql -U postgres -c "DROP DATABASE $DB_NAME"
  docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE $DB_NAME"
  
  docker-compose exec -T postgres pg_restore \
    -U postgres \
    -d "$DB_NAME" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    -v \
    /tmp/restore.dump
  
  docker-compose exec -T postgres rm /tmp/restore.dump
else
  # Remote restore: use docker run
  docker run --rm \
    -v "$(pwd):/backup" \
    postgres:17 \
    pg_restore \
    -d "$TARGET_DB_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-acl \
    -v \
    "/backup/$DUMP_FILE"
fi

echo ""
echo "✅ Database restore complete!"
echo ""
if [ "$IS_LOCAL" = true ]; then
  echo "Your local 'dev' database has been restored."
else
  echo "The remote database has been restored."
fi

