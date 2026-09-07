#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENV_FILE=${ENV_FILE:-"$PROJECT_DIR/.env.production"}
BACKUP_ROOT=${BACKUP_DIR:-"$PROJECT_DIR/backups"}
RETENTION_DAYS=${RETENTION_DAYS:-14}
COMPOSE_FILE="$PROJECT_DIR/docker-compose.production.yml"

if [ ! -f "$ENV_FILE" ]; then
    echo "Environment file not found: $ENV_FILE" >&2
    exit 1
fi

case "$RETENTION_DAYS" in
    *[!0-9]*|"")
        echo "RETENTION_DAYS must be a non-negative integer" >&2
        exit 1
        ;;
esac

mkdir -p "$BACKUP_ROOT"
BACKUP_ROOT=$(CDPATH= cd -- "$BACKUP_ROOT" && pwd -P)

case "$BACKUP_ROOT" in
    ""|"/"|"$PROJECT_DIR")
        echo "Unsafe backup directory: $BACKUP_ROOT" >&2
        exit 1
        ;;
esac

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$BACKUP_ROOT/$timestamp"
temporary="$target.tmp.$$"

umask 077
mkdir -p "$temporary"
trap 'rm -rf -- "$temporary"' EXIT HUP INT TERM

cd "$PROJECT_DIR"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
    sh -c 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" "$POSTGRES_DB"' \
    > "$temporary/database.dump"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T db \
    pg_restore --list < "$temporary/database.dump" > /dev/null

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T backend \
    sh -c 'cd /var/www/media && exec tar -czf - .' \
    > "$temporary/media.tar.gz"

test -s "$temporary/database.dump"
sha256sum "$temporary/database.dump" "$temporary/media.tar.gz" > "$temporary/SHA256SUMS"
mv "$temporary" "$target"
trap - EXIT HUP INT TERM

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '????????T??????Z' \
    -mtime "+$RETENTION_DAYS" -exec rm -rf -- {} +

echo "Backup created: $target"
