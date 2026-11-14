#!/usr/bin/env bash
# Builds the production images from the current commit of main and pushes them to GHCR.
# Then deploy on the VPS with: deploy/deploy.sh   (see deploy/README.md)
#
#   pnpm release                         # checks, build, push
#   pnpm release --skip-checks           # no lint / typecheck / test
#   pnpm release --platform linux/arm64  # Hetzner CAX (ARM) servers; needs docker buildx
#
# Once: docker login ghcr.io -u <github user>   (token with write:packages)
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v pnpm >/dev/null 2>&1 && [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
fi

REGISTRY=${REGISTRY:-ghcr.io/jolivem}
SOURCE=https://github.com/jolivem/tiralarc
checks=true
platform=
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-checks) checks=false ;;
    --platform) platform=${2:?--platform needs a value}; shift ;;
    *) echo "Unknown option: $1 (use --skip-checks, --platform <os/arch>)" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
die() { printf '\033[1;31m✗   %s\033[0m\n' "$1" >&2; exit 1; }

step "Sources"
[ -z "$(git status --porcelain)" ] || die "Uncommitted changes: commit or stash them first."
[ "$(git branch --show-current)" = main ] || die "Not on main: images are built from main only."
git fetch --quiet origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
  die "main differs from origin/main: push (or pull) first, the VPS deploys what GitHub has."
# Same length as deploy.sh, so both sides name the images alike.
TAG=$(git rev-parse --short=12 HEAD)
echo "Commit $TAG: $(git log -1 --format=%s)"

if $checks; then
  step "Checks (lint, typecheck, test)"
  pnpm turbo run lint typecheck test
fi

build_args=()
if [ -f deploy/build.env ]; then
  set -a
  . deploy/build.env
  set +a
fi
for name in NEXT_PUBLIC_GOOGLE_CLIENT_ID NEXT_PUBLIC_APPLE_CLIENT_ID NEXT_PUBLIC_APPLE_REDIRECT_URI; do
  build_args+=(--build-arg "$name=${!name:-}")
done

# Without buildx, plain `docker build` makes images for this machine's platform.
if [ -n "$platform" ]; then
  docker buildx version >/dev/null 2>&1 || die "--platform needs docker buildx."
  build() { docker buildx build --platform "$platform" --push "$@" .; }
else
  build() { docker build "$@" .; }
fi

images=()
image() { # <name> <docker build args...>
  local name=$1
  shift
  step "Image $name"
  build --label "org.opencontainers.image.source=$SOURCE" \
    --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
    -t "$REGISTRY/$name:$TAG" -t "$REGISTRY/$name:latest" "$@"
  images+=("$REGISTRY/$name")
}
image tiralarc-api -f apps/api/Dockerfile --target runtime
image tiralarc-api-migrate -f apps/api/Dockerfile --target migrate
image tiralarc-web -f apps/web/Dockerfile "${build_args[@]}"

if [ -z "$platform" ]; then
  step "Push to ${REGISTRY%%/*}"
  for repo in "${images[@]}"; do
    docker push --quiet "$repo:$TAG"
    docker push --quiet "$repo:latest"
  done
fi

step "Images $TAG pushed"
echo "Deploy on the VPS: ssh <vps> /opt/tiralarc/deploy/deploy.sh"
