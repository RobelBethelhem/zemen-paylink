#!/usr/bin/env bash
# Dumps the database. Nothing else backs it up.
#
#   bash scripts/backup.sh                  → ./backups/paylink-<date>.sql.gz
#   crontab -e
#   15 2 * * * cd /opt/paylink && bash scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

KEEP_DAYS=${KEEP_DAYS:-14}
DIR=${BACKUP_DIR:-backups}
STAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
FILE="$DIR/paylink-$STAMP.sql.gz"

mkdir -p "$DIR"
umask 077

# --single-transaction takes a consistent snapshot without locking writers out,
# so a backup running at 2am cannot block a late payment.
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db \
  sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction \
           --routines --triggers --databases paylink' \
  | gzip > "$FILE"

# A dump that failed halfway still produces a file, so check it decompresses
# and reaches the end marker before trusting it or deleting anything older.
if ! gzip -t "$FILE" 2>/dev/null; then
  rm -f "$FILE"
  echo "backup failed: the dump is not a valid archive" >&2
  exit 1
fi
if ! zcat "$FILE" | tail -5 | grep -q "Dump completed"; then
  rm -f "$FILE"
  echo "backup failed: the dump is truncated" >&2
  exit 1
fi

echo "$(date -u +%FT%TZ) wrote $FILE ($(du -h "$FILE" | cut -f1))"

# Only now that a good backup exists is it safe to expire old ones.
find "$DIR" -name 'paylink-*.sql.gz' -mtime "+$KEEP_DAYS" -print -delete

cat <<'NOTE'
    Reminder: the dump is useless on its own. PAYLINK_ENCRYPTION_KEY from
    .env.production is what makes the stored MPGS credentials readable — keep a
    copy of it somewhere separate from these files.
NOTE
