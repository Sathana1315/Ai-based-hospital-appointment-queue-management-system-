#!/bin/bash
# Backup Script for Q-Med System
# Backs up MongoDB Atlas (or local) and the uploads directory

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '#' | awk '/=/ {print $1}')
fi

BACKUP_DIR="./backups/$(date +'%Y-%m-%d_%H-%M-%S')"
mkdir -p "$BACKUP_DIR"

echo "Starting Database Backup..."
if [ -z "$MONGODB_URI" ]; then
    echo "MONGODB_URI not found in .env.production!"
    exit 1
fi

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/db_dump"
echo "Database Backup Complete."

echo "Starting Uploads Backup..."
if [ -d "./backend/uploads" ]; then
    tar -czvf "$BACKUP_DIR/uploads_backup.tar.gz" -C ./backend uploads
    echo "Uploads Backup Complete."
else
    echo "No uploads directory found to backup."
fi

# Retention policy: Keep only last 7 backups
echo "Applying retention policy (keeping last 7 days)..."
ls -dt ./backups/* | tail -n +8 | xargs -I {} rm -rf {}

echo "Backup process finished successfully. Stored in $BACKUP_DIR"
