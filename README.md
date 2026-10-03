# Tiralarc

Monorepo contenant l'API (NestJS + MariaDB) et le site web (Next.js). Les futures applications
Android et iOS consommeront la même API, via le contrat OpenAPI versionné dans le dépôt.

```
apps/
  api/            API NestJS — REST /api/v1, Prisma + MariaDB, auth JWT
  web/            Next.js (App Router) + Mantine — BFF : les jetons restent côté serveur (cookies httpOnly)
packages/
  api-client/     Client TypeScript typé, généré depuis apps/api/openapi.json
  eslint-config/  Config ESLint partagée
  tsconfig/       tsconfig de base partagés
docker/           MariaDB, Adminer et Mailpit pour le développement
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

## Comptes et authentification

Rôles cumulables : `ARCHER`, `COACH` (choisis par l'utilisateur) et `ADMIN` (attribué par
`pnpm --filter @tiralarc/api user:make-admin <email>`). Routes réservées : `@Roles(Role.ADMIN)`.

| Route (`/api/v1`)                  | Rôle                                                         |
| ---------------------------------- | ------------------------------------------------------------ |
| `POST /auth/register`              | Inscription email + mot de passe + rôles ; envoie un lien    |
| `POST /auth/verify-email`          | Consomme le lien de confirmation et ouvre une session        |
| `POST /auth/resend-verification`   | Renvoie le lien (répond toujours 202)                        |
| `POST /auth/login`                 | `403 EMAIL_NOT_VERIFIED` tant que l'email n'est pas confirmé |
| `POST /auth/google`, `/auth/apple` | Connexion / inscription avec un ID token Google ou Apple     |
| `POST /auth/refresh`, `/logout`    | Rotation du jeton de rafraîchissement / fin de session       |
| `GET /users/me`                    | Profil, rôles, méthodes de connexion                         |
| `PUT /users/me/roles`              | Choix des rôles archer / coach (ADMIN conservé)              |
| `GET /users`                       | Liste des comptes (ADMIN)                                    |

- Jeton d'accès JWT (15 min, contient les rôles) en `Authorization: Bearer`.
- Jeton de rafraîchissement opaque, **à usage unique** ; sa réutilisation révoque la session.
- Google / Apple : l'API vérifie l'ID token (signature, émetteur, audience). Un compte existant
  avec le même email (vérifié par le fournisseur) est relié automatiquement. Configuration :
  [docs/oauth-setup.md](docs/oauth-setup.md).
- Erreurs : chaque réponse `problem+json` porte un `code` stable (`EMAIL_TAKEN`,
  `INVALID_CREDENTIALS`…, liste dans `apps/api/src/common/errors.ts`) que les clients traduisent.

Web : Server Actions et `src/proxy.ts` gardent les jetons en cookies httpOnly ; le navigateur ne
les voit jamais. Mobile : stocker les jetons dans le Keychain / Keystore et appeler l'API.

## Interface

Composants et styles : [Mantine](https://mantine.dev) 9 (`@mantine/core`, `@mantine/dates`,
`@mantine/schedule` pour les plannings), icônes [Tabler](https://tabler.io/icons). Thème dans
`apps/web/src/theme.ts`, clair / sombre automatique. Responsive « mobile d'abord » avec les
points de rupture Mantine : `xs` 576 px, `sm` 768 px (tablette), `md` 992 px (ordinateur).
Sous `sm`, la navigation passe dans un menu « burger ».

### Pages

| Route (`/fr` ou `/en` devant)                                                                                                        | Accès       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `/`, `/login`, `/register`, `/verify-email`                                                                                          | public      |
| `/account` — Mon compte (email, connexion, rôles)                                                                                    | connecté    |
| `/archer` — Accueil, `/archer/journal`, `/archer/sheets` (Fiches), `/archer/stats` (Indicateurs), `/archer/profile` (Profil sportif) | rôle ARCHER |

Espace archer : barre d'onglets en bas d'écran sur téléphone, menu latéral à partir de la
tablette. Compte et déconnexion dans le menu de l'avatar.

## Multilingue

Le site est en français et en anglais (next-intl) : toutes les pages sont sous `/fr/...` ou
`/en/...`, `/` redirige selon la langue du navigateur. Textes dans `apps/web/messages/*.json`
(clés typées : une clé manquante casse le typecheck). Pour ajouter une langue : l'ajouter à
`apps/web/src/i18n/routing.ts`, créer `messages/<langue>.json`, et l'ajouter à
`SUPPORTED_LOCALES` + aux modèles d'email côté API (`apps/api/src/mail/templates.ts`).

## Docker (production)

```bash
docker build -f apps/api/Dockerfile -t tiralarc-api .
docker build -f apps/api/Dockerfile --target migrate -t tiralarc-api-migrate .   # prisma migrate deploy
docker build -f apps/web/Dockerfile -t tiralarc-web .
```

Variables : voir `apps/api/.env.example` et `apps/web/.env.example`.
