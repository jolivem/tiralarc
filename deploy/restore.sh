#!/usr/bin/env bash
# Restores an archive made by backup.sh: REPLACES the database and the photos with the archive's.
#
#   deploy/restore.sh backups/tiralarc-data-<date>.tar           # on the VPS
#   deploy/restore.sh --local backups/tiralarc-data-<date>.tar   # on the dev machine (`pnpm db:up`)
#   add -y to skip the confirmation
#
# On the VPS: a backup of the current data first (backup.sh), the maintenance page, API and site
# stopped, the archive restored, the migrations of the version online applied (an older archive
# catches up), then everything back up. Photos are mirrored: those missing from the archive are deleted.
# First move of the dev data to the VPS: see deploy/README.md ("Données").
set -Eeuo pipefail

DEPLOY_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_DIR=$(dirname "$DEPLOY_DIR")
RCLONE_IMAGE=${RCLONE_IMAGE:-rclone/rclone:1.76.0}

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
die() { printf '\033[1;31m✗   %s\033[0m\n' "$1" >&2; exit 1; }

local_mode=false
yes=false
ARCHIVE=
while [ $# -gt 0 ]; do
  case "$1" in
    --local) local_mode=true ;;
    -y | --yes) yes=true ;;
    -*) die "Unknown option: $1 (use --local, -y)" ;;
    *) ARCHIVE=$1 ;;
  esac
  shift
done
[ -n "$ARCHIVE" ] || die "Usage: restore.sh [--local] [-y] <tiralarc-data-….tar>"
[ -f "$ARCHIVE" ] || die "No such file: $ARCHIVE"
ARCHIVE=$(cd "$(dirname "$ARCHIVE")" && pwd)/$(basename "$ARCHIVE")
tar -tf "$ARCHIVE" | grep -x 'db.sql.gz' >/dev/null || die "$ARCHIVE isn't an archive of backup.sh (no db.sql.gz)."

if $local_mode; then
  compose() { docker compose -f "$REPO_DIR/docker/docker-compose.yml" "$@"; }
  BUCKET=${S3_BUCKET:-tiralarc}
  TARGET="the dev machine"
else
  cd "$DEPLOY_DIR"
  [ -f .env ] || die "deploy/.env is missing (on the dev machine, use --local)."
  TAG=${TAG:-$(cat runtime/current-tag 2>/dev/null || true)}
  [ -n "$TAG" ] || die "Nothing deployed yet: run deploy.sh first (it creates the database and the bucket)."
  export TAG
  compose() { docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" "$@"; }
  BUCKET=$(sed -n 's/^S3_BUCKET=//p' .env | tr -d "\"'")
  TARGET="the VPS"
  # Not while a deployment runs (same lock as deploy.sh).
  exec 9>runtime/deploy.lock
  flock -n 9 || die "A deployment is running."
fi
[ -n "$BUCKET" ] || die "S3_BUCKET is empty."

running() { # <service> → its container id, or dies
  local id
  id=$(compose ps -q --status running "$1")
  [ -n "$id" ] || die "The $1 container isn't running."
  echo "$id"
}

# Same as in backup.sh: rclone on the gateway's network, with its root keys; $WORK at /work.
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
    -v "$WORK:/work:ro" "$RCLONE_IMAGE" --config "" "$@"
}

running mariadb >/dev/null
running s3 >/dev/null

echo "Archive:"
tar -xOf "$ARCHIVE" INFO 2>/dev/null | sed 's/^/  /' || true
if ! $yes; then
  printf '\nThis REPLACES the database and the photos of %s. Type "yes" to go on: ' "$TARGET"
  read -r answer
  [ "$answer" = yes ] || die "Cancelled, nothing changed."
fi

mkdir -p "$DEPLOY_DIR/backups"
WORK=$(mktemp -d "$DEPLOY_DIR/backups/.restore.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
step "Unpacking"
tar -C "$WORK" -xf "$ARCHIVE"
mkdir -p "$WORK/photos"
chmod -R a+rX "$WORK"

if ! $local_mode; then
  step "Backup of the current data"
  "$DEPLOY_DIR/backup.sh" --keep 0
  SAFETY=$(ls -t "$DEPLOY_DIR"/backups/tiralarc-data-*.tar | head -1)

  on_error() {
    printf '\n\033[1;31m✗   Restore failed: the maintenance page stays up.\033[0m\n' >&2
    echo "    Data before the restore: $SAFETY" >&2
    echo "    Put it back:             $0 $SAFETY" >&2
    echo "    Reopen the site:         $DEPLOY_DIR/deploy.sh maintenance off" >&2
  }
  trap on_error ERR

  step "Maintenance page on, API and site stopped"
  touch runtime/maintenance.on
  compose stop api web
fi

step "Database"
gunzip -c "$WORK/db.sql.gz" |
  compose exec -T mariadb sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'
echo OK

step "Photos (bucket $BUCKET)"
store sync /work/photos "store:$BUCKET" --log-level NOTICE
echo "$(find "$WORK/photos" -type f | wc -l) files"

if $local_mode; then
  step "Restored on the dev machine"
  echo "If the archive comes from an older version: pnpm --filter @tiralarc/api exec prisma migrate deploy"
  exit 0
fi

step "Database migrations ($TAG)"
compose --profile tools run --rm -T migrate

step "API and site"
compose up -d --wait --wait-timeout 180 api web
rm -f runtime/maintenance.on
trap - ERR

step "Restored on the VPS"
echo "Data before the restore: $SAFETY"
