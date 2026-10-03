# Tiralarc

Monorepo contenant l'API (NestJS + MariaDB) et le site web (Next.js). Les futures applications
Android et iOS consommeront la même API, via le contrat OpenAPI versionné dans le dépôt.

```
apps/
  api/            API NestJS — REST /api/v1, Prisma + MariaDB, auth JWT
  web/            Next.js (App Router) — BFF : les jetons restent côté serveur (cookies httpOnly)
packages/
  api-client/     Client TypeScript typé, généré depuis apps/api/openapi.json
  eslint-config/  Config ESLint partagée
  tsconfig/       tsconfig de base partagés
docker/           MariaDB + Adminer pour le développement
docs/adr/         Décisions d'architecture
```

## Prérequis

- Node 22 (`nvm use`), pnpm 10 (`corepack enable`)
- Docker

## Démarrage

```bash
pnpm install
pnpm db:up                                  # MariaDB sur localhost:3307, Adminer sur :8081
cp apps/api/.env.example apps/api/.env      # puis changer JWT_ACCESS_SECRET
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @tiralarc/api db:migrate      # applique les migrations Prisma
pnpm dev                                    # API :3001, web :3000
```

- Web : http://localhost:3000
- API : http://localhost:3001/api/v1/health
- Swagger (hors production) : http://localhost:3001/api/docs

Les ports hôtes de MariaDB/Adminer se changent dans `docker/.env` (voir `docker/.env.example`).

## Commandes

| Commande                                     | Rôle                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                                   | Lance API, web et le client en mode watch                  |
| `pnpm build` / `lint` / `typecheck` / `test` | Sur tout le monorepo (Turborepo)                           |
| `pnpm --filter @tiralarc/api test:e2e`       | Tests e2e de l'API sur la base `tiralarc_test`             |
| `pnpm openapi`                               | Régénère `apps/api/openapi.json` puis le client TypeScript |
| `pnpm --filter @tiralarc/api db:migrate`     | Crée/applique une migration après modification du schéma   |
| `pnpm format`                                | Prettier                                                   |

## Faire évoluer l'API

1. Modifier `apps/api/prisma/schema.prisma` puis `pnpm --filter @tiralarc/api db:migrate`.
2. Ajouter module / contrôleur / DTO (décorateurs `@ApiProperty` pour documenter le contrat).
3. `pnpm openapi` : met à jour `openapi.json` et `packages/api-client` ; le typecheck du web
   signale alors tout écart. Commiter ces fichiers générés — la CI vérifie qu'ils sont à jour.

Conventions de l'API : routes sous `/api/v1`, toutes protégées par défaut (`@Public()` pour
les exceptions), erreurs au format RFC 9457 `application/problem+json`, dates ISO 8601 UTC,
identifiants UUID.

## Authentification

- `POST /api/v1/auth/register|login` → `{ accessToken, refreshToken, expiresIn, ... }`
- Appels authentifiés : `Authorization: Bearer <accessToken>` (JWT, 15 min)
- `POST /api/v1/auth/refresh` : jeton de rafraîchissement opaque, **à usage unique** (rotation) ;
  la réutilisation d'un jeton déjà échangé révoque toute la session.
- `POST /api/v1/auth/logout` : révoque la session.

Web : les Server Actions et `src/proxy.ts` stockent les jetons en cookies httpOnly et
rafraîchissent l'accès de façon transparente ; le navigateur ne voit jamais les jetons.
Mobile : stocker les jetons dans le Keychain (iOS) / Keystore (Android) et appeler l'API directement.

## Docker (production)

```bash
docker build -f apps/api/Dockerfile -t tiralarc-api .
docker build -f apps/api/Dockerfile --target migrate -t tiralarc-api-migrate .   # prisma migrate deploy
docker build -f apps/web/Dockerfile -t tiralarc-web .
```

Variables : voir `apps/api/.env.example` et `apps/web/.env.example`.
