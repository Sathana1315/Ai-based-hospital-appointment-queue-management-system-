#!/bin/bash
# Restore Script for Q-Med System

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_folder_path>"
    exit 1
fi

BACKUP_DIR=$1

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Backup directory $BACKUP_DIR does not exist."
    exit 1
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '#' | awk '/=/ {print $1}')
fi

echo "Restoring Database..."
if [ -z "$MONGODB_URI" ]; then
    echo "MONGODB_URI not found in .env.production!"
    exit 1
fi

mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_DIR/db_dump/qmed"
echo "Database Restore Complete."

echo "Restoring Uploads..."
if [ -f "$BACKUP_DIR/uploads_backup.tar.gz" ]; then
    tar -xzvf "$BACKUP_DIR/uploads_backup.tar.gz" -C ./backend
    echo "Uploads Restore Complete."
else
    echo "No uploads backup found in $BACKUP_DIR."
fi

echo "Restore process finished successfully."
