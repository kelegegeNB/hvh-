#!/bin/bash
# Database Update Script
# This script applies the latest schema changes to the database.

echo "Applying database schema changes..."
docker compose exec backend npm run db:push

echo "Database update completed."
