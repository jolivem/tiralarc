#!/usr/bin/env bash
# Deploys Tiralarc on the VPS (see deploy/README.md): git pull, images, maintenance page,
# database dump + migrations, new containers.
#
#   deploy/deploy.sh                    # the latest commit of main (images built by `pnpm release`)
#   deploy/deploy.sh <tag>              # a given commit, e.g. a rollback: $(cat deploy/runtime/previous-tag)
#   deploy/deploy.sh --no-pull [<tag>]  # without git pull
#   deploy/deploy.sh maintenance on|off # show / hide the maintenance page, nothing else
set -Eeuo pipefail

DEPLOY_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_DIR=$(dirname "$DEPLOY_DIR")
cd "$DEPLOY_DIR"
mkdir -p runtime backups
FLAG=runtime/maintenance.on

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m!   %s\033[0m\n' "$1"; }
die() { printf '\033[1;31m✗   %s\033[0m\n' "$1" >&2; exit 1; }
compose() { docker compose -f docker-compose.prod.yml "$@"; }

if [ "${1:-}" = maintenance ]; then
  case "${2:-}" in
    on) touch "$FLAG" && echo "Maintenance page shown." ;;
    off) rm -f "$FLAG" && echo "Site open." ;;
    *) die "Usage: deploy.sh maintenance on|off" ;;
  esac
  exit 0
fi

pull=true
TAG=
for arg in "$@"; do
  case "$arg" in
    --no-pull) pull=false ;;
    -*) die "Unknown option: $arg (use --no-pull, or maintenance on|off)" ;;
    *) TAG=$arg ;;
  esac
done

# One deployment at a time. The lock is kept when the script restarts itself (below).
if [ -z "${DEPLOY_LOCKED:-}" ]; then
  exec 9>runtime/deploy.lock
  flock -n 9 || die "Another deployment is running."
  export DEPLOY_LOCKED=1
fi

step "Sources (GitHub)"
if $pull && [ -z "${DEPLOY_PULLED:-}" ]; then
  before=$(sha1sum deploy.sh)
  git -C "$REPO_DIR" pull --ff-only --quiet
  git -C "$REPO_DIR" log -1 --format='%h %s'
  if [ "$(sha1sum deploy.sh)" != "$before" ]; then
    echo "deploy.sh changed: restarting with the new version."
    DEPLOY_PULLED=1 exec bash "$DEPLOY_DIR/deploy.sh" "$@"
  fi
else
  echo "Skipped."
fi
# Same length as build.sh.
TAG=${TAG:-$(git -C "$REPO_DIR" rev-parse --short=12 HEAD)}
export TAG
PREVIOUS=$(cat runtime/current-tag 2>/dev/null || echo none)
echo "Deploying $TAG (online: $PREVIOUS)"

step "Configuration (.env)"
[ -f .env ] || die "deploy/.env is missing: cp deploy/.env.example deploy/.env, then fill it in."
missing=$(comm -23 <(grep -oE '^[A-Z0-9_]+=' .env.example | sort -u) \
  <(grep -oE '^[A-Z0-9_]+=' .env | sort -u) | tr -d '=' | tr '\n' ' ')
[ -z "$missing" ] || die "deploy/.env lacks: $missing(see .env.example)"
! grep -qE '^[A-Z0-9_]+=.*change-me' .env || die "deploy/.env still has change-me values."
echo OK

step "Images $TAG"
compose --profile tools pull --quiet api web migrate ||
  die "Images $TAG not found on GHCR: run \`pnpm release\` on the dev machine (site untouched)."

# From here on, a failure leaves the maintenance page up.
DUMP=
on_error() {
  printf '\n\033[1;31m✗   Deployment of %s failed: the maintenance page stays up.\033[0m\n' "$TAG" >&2
  echo "    Logs:             docker compose -f $DEPLOY_DIR/docker-compose.prod.yml logs --tail 100" >&2
  [ "$PREVIOUS" = none ] || echo "    Previous version: $0 $PREVIOUS" >&2
  [ -z "$DUMP" ] || echo "    Database dump:    $DEPLOY_DIR/$DUMP (taken before the migrations)" >&2
  echo "    Reopen the site:  $0 maintenance off" >&2
}
trap on_error ERR

step "Maintenance page on"
touch "$FLAG"

step "Database, storage, proxy"
compose up -d --wait mariadb s3 caddy
# Picks up a Caddyfile changed by the pull (no effect otherwise).
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --force >/dev/null 2>&1 ||
  warn "Caddy reload failed (old configuration kept)."
# The photos' bucket, created on the first deployment (the API only does it in development).
compose run --rm --no-deps -T -e S3_ENDPOINT=http://s3:9000 api node --input-type=module -e '
  import { CreateBucketCommand, HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
  const env = process.env;
  const s3 = new S3Client({
    endpoint: env.S3_ENDPOINT, region: env.S3_REGION, forcePathStyle: true,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
  });
  const Bucket = env.S3_BUCKET;
  try { await s3.send(new HeadBucketCommand({ Bucket })); }
  catch { await s3.send(new CreateBucketCommand({ Bucket })); console.log(`Bucket ${Bucket} created`); }
'

step "Stopping the site"
# The old code must not run on the new schema.
compose stop api web

step "Database dump"
umask 077
DUMP=backups/tiralarc-$(date +%Y%m%d-%H%M%S)-$PREVIOUS.sql.gz
compose exec -T mariadb sh -c \
  'exec mariadb-dump -uroot -p"$MARIADB_ROOT_PASSWORD" --single-transaction --routines --triggers --add-drop-database --databases tiralarc' |
  gzip >"$DUMP"
echo "$DUMP ($(du -h "$DUMP" | cut -f1))"
find backups -name 'tiralarc-*.sql.gz' -mtime +14 -delete

step "Database migrations"
compose --profile tools run --rm -T migrate

step "Containers"
compose up -d --wait --wait-timeout 180 api web

step "Maintenance page off"
rm -f "$FLAG"
trap - ERR
if [ "$PREVIOUS" != "$TAG" ]; then
  [ "$PREVIOUS" = none ] || echo "$PREVIOUS" >runtime/previous-tag
  echo "$TAG" >runtime/current-tag
fi
docker image prune -f >/dev/null

step "Online: $TAG"
