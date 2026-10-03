# Build from the repository root:
#   docker build -f apps/api/Dockerfile -t tiralarc-api .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiralarc/api...
RUN pnpm --filter @tiralarc/api build
RUN pnpm --filter @tiralarc/api deploy --legacy --prod --ignore-scripts /out

# Runs pending migrations, e.g. as a release job before starting the new version:
#   docker build -f apps/api/Dockerfile --target migrate -t tiralarc-api-migrate .
#   docker run --rm -e DATABASE_URL=... tiralarc-api-migrate
FROM build AS migrate
WORKDIR /repo/apps/api
CMD ["pnpm", "exec", "prisma", "migrate", "deploy"]

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/package.json ./package.json
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
