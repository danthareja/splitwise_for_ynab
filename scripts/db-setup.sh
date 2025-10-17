#!/bin/bash

# Database setup script - creates dev and test databases if they don't exist

set -e

POSTGRES_URL="postgresql://postgres:postgres@localhost:6969/postgres"
DATABASES=("dev" "test")

echo "🔧 Setting up local databases..."
echo ""

# Check if PostgreSQL is running
if ! docker-compose ps postgres | grep -q "Up"; then
  echo "❌ PostgreSQL is not running"
  echo "   Start it with: docker-compose up -d"
  exit 1
fi

echo "✓ PostgreSQL is running"

# Create databases if they don't exist
for DB_NAME in "${DATABASES[@]}"; do
  # Check if database exists by trying to connect
  if docker-compose exec -T postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "✓ Database already exists: $DB_NAME"
  else
    docker-compose exec -T postgres psql -U postgres -c "CREATE DATABASE $DB_NAME"
    echo "✓ Created database: $DB_NAME"
  fi
done

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Make sure your .env file has:"
echo "  DATABASE_URL=\"postgresql://postgres:postgres@localhost:6969/dev\""
echo ""
echo "Next steps:"
echo "  1. Run migrations: npm run db:migrate"
echo "  2. (Optional) Restore from prod: npm run db:restore"
echo ""

