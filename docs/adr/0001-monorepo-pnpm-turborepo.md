# 0001 — Monorepo pnpm + Turborepo

**Statut** : accepté — 2026-10-03

## Contexte

Une API NestJS, un site Next.js, et plus tard des applications Android et iOS doivent partager un
contrat d'API stable.

## Décision

Un seul dépôt géré par pnpm workspaces et Turborepo (`apps/*`, `packages/*`). Les types de l'API
sont partagés via `packages/api-client`, généré depuis la spec OpenAPI.

## Conséquences

- Une modification d'API et son impact sur le web sont visibles dans la même PR.
- Une app React Native pourrait rejoindre `apps/mobile` ; des apps natives peuvent vivre dans des
  dépôts séparés et consommer `apps/api/openapi.json`.
