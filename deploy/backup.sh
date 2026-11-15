#!/usr/bin/env bash
# Backs up Tiralarc's data — the database and the photos — into one archive:
# deploy/backups/tiralarc-data-<date>.tar (db.sql.gz, photos/, INFO). Restore it with restore.sh.
#
#   deploy/backup.sh               # on the VPS (docker-compose.prod.yml), keeps 7 days of archives
#   deploy/backup.sh --keep 14     # ... keeps 14 days (0 = deletes none)
#   deploy/backup.sh --local       # on the dev machine (docker/docker-compose.yml, `pnpm db:up`)
#
# The site stays up: the dump is a consistent snapshot (--single-transaction), the photos are copied
# through the S3 gateway (rclone in a throwaway container), so their metadata comes back on restore.
# Daily on the VPS (crontab -e):
#   30 3 * * * /opt/tiralarc/deploy/backup.sh >>/opt/tiralarc/deploy/backups/backup.log 2>&1
set -Eeuo pipefail

DEPLOY_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_DIR=$(dirname "$DEPLOY_DIR")
RCLONE_IMAGE=${RCLONE_IMAGE:-rclone/rclone:1.76.0}

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
die() { printf '\033[1;31m✗   %s\033[0m\n' "$1" >&2; exit 1; }

local_mode=false
keep=
while [ $# -gt 0 ]; do
  case "$1" in
    --local) local_mode=true ;;
    --keep) keep=${2:?--keep needs a number of days}; shift ;;
    *) die "Unknown option: $1 (use --local, --keep <days>)" ;;
  esac
  shift
done

if $local_mode; then
  compose() { docker compose -f "$REPO_DIR/docker/docker-compose.yml" "$@"; }
  BUCKET=${S3_BUCKET:-tiralarc}
  keep=${keep:-0}
else
  [ -f "$DEPLOY_DIR/.env" ] || die "deploy/.env is missing (on the dev machine, use --local)."
  # Only mariadb and s3 are used, but the compose file needs a TAG to be read.
  TAG=${TAG:-$(cat "$DEPLOY_DIR/runtime/current-tag" 2>/dev/null || echo none)}
  export TAG
  compose() { docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" "$@"; }
  BUCKET=$(sed -n 's/^S3_BUCKET=//p' "$DEPLOY_DIR/.env" | tr -d "\"'")
  keep=${keep:-7}
fi
[ -n "$BUCKET" ] || die "S3_BUCKET is empty."

running() { # <service> → its container id, or dies
  local id
  id=$(compose ps -q --status running "$1")
  [ -n "$id" ] || die "The $1 container isn't running."
  echo "$id"
}

# rclone against the compose file's S3 gateway, sharing its network (127.0.0.1:9000), with the
# gateway's own root keys. $WORK is mounted at /work; files are written as the current user.
store() {
  local id key secret
  id=$(running s3)
  key=$(docker exec "$id" printenv ROOT_ACCESS_KEY)
  secret=$(docker exec "$id" printenv ROOT_SECRET_KEY)
  RCLONE_CONFIG_STORE_ACCESS_KEY_ID=$key RCLONE_CONFIG_STORE_SECRET_ACCESS_KEY=$secret \
    docker run --rm --network "container:$id" --user "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -e RCLONE_CONFIG_STORE_TYPE=s3 -e RCLONE_CONFIG_STORE_PROVIDER=Other \
    -e RCLONE_CONFIG_STORE_ENDPOINT=http://127.0.0.1:9000 -e RCLONE_CONFIG_STORE_REGION=us-east-1 \
    -e RCLONE_CONFIG_STORE_FORCE_PATH_STYLE=true \
    -e RCLONE_CONFIG_STORE_ACCESS_KEY_ID -e RCLONE_CONFIG_STORE_SECRET_ACCESS_KEY \
    -v "$WORK:/work" "$RCLONE_IMAGE" --config "" "$@"
}

mkdir -p "$DEPLOY_DIR/backups"
umask 077
NAME=tiralarc-data-$(date +%Y%m%d-%H%M%S)
ARCHIVE=$DEPLOY_DIR/backups/$NAME.tar
WORK=$(mktemp -d "$DEPLOY_DIR/backups/.$NAME.XXXXXX")
trap 'rm -rf "$WORK" "$ARCHIVE.part"' EXIT
echo "$(date '+%F %T') backup of $($local_mode && echo 'the dev machine' || echo 'the VPS')"

step "Database"
running mariadb >/dev/null
compose exec -T mariadb sh -c \
  'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers --add-drop-database --databases tiralarc' |
  gzip >"$WORK/db.sql.gz"
echo "db.sql.gz ($(du -h "$WORK/db.sql.gz" | cut -f1))"

step "Photos (bucket $BUCKET)"
mkdir "$WORK/photos"
store copy "store:$BUCKET" /work/photos --log-level NOTICE
echo "$(find "$WORK/photos" -type f | wc -l) files ($(du -sh "$WORK/photos" | cut -f1))"

step "Archive"
{
  echo "date: $(date -Iseconds)"
  echo "source: $($local_mode && echo local || echo vps) ($(hostname))"
  echo "commit: $(git -C "$REPO_DIR" rev-parse --short=12 HEAD 2>/dev/null || echo unknown)"
} >"$WORK/INFO"
tar -C "$WORK" -cf "$ARCHIVE.part" INFO db.sql.gz photos
mv "$ARCHIVE.part" "$ARCHIVE"
echo "$ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

if [ "$keep" -gt 0 ]; then
  find "$DEPLOY_DIR/backups" -maxdepth 1 -name 'tiralarc-data-*.tar' -mtime +"$keep" -print -delete |
    sed 's/^/deleted (older than '"$keep"' days): /'
fi
