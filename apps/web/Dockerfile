# Build from the repository root:
#   docker build -f apps/web/Dockerfile -t tiralarc-web .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiralarc/web...
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo run build --filter=@tiralarc/web

FROM node:22-alpine AS runtime
# Chromium prints the journal's PDF extract (src/lib/pdf.ts); fonts for any text the site's
# own web fonts don't cover.
RUN apk add --no-cache chromium font-noto
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    CHROMIUM_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
