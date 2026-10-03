# Mémo — lancer le backend et le frontend

> **Toutes les commandes de ce mémo se lancent depuis la racine du projet**
> (`/home/michel/github/tiralarc`), y compris `pnpm install`.
>
> C'est un monorepo pnpm : `pnpm-workspace.yaml` déclare `apps/*` et `packages/*`, donc un seul
> `pnpm install` à la racine installe les dépendances de toutes les applications (API, web,
> client partagé) avec un unique `pnpm-lock.yaml`. Pour viser une seule application sans changer
> de dossier, on utilise `--filter` (ex. `pnpm --filter @tiralarc/api dev`).

## Première fois seulement

```bash
cd /home/michel/github/tiralarc               # racine du projet
nvm use                                       # Node 22
corepack enable                               # active pnpm
pnpm install                                  # installe tout (et génère le client Prisma)

cp apps/api/.env.example apps/api/.env        # puis mettre un vrai JWT_ACCESS_SECRET :
                                              #   openssl rand -base64 48
cp apps/web/.env.example apps/web/.env.local

pnpm db:up                                    # démarre MariaDB et Mailpit (Docker)
pnpm --filter @tiralarc/api db:migrate        # crée les tables
```

## Au quotidien

### 1. Démarrer la base de données

```bash
pnpm db:up            # MariaDB (:3307), Adminer (:8081), Mailpit (:8025)
```

### 2a. Tout lancer d'un coup (recommandé)

```bash
pnpm dev
```

Lance en parallèle, avec rechargement automatique :

- le backend → http://localhost:3001
- le frontend → http://localhost:3000
- le client API partagé (`packages/api-client`) en mode watch

`Ctrl+C` pour tout arrêter.

### 2b. Ou lancer chaque partie séparément (deux terminaux)

```bash
pnpm --filter @tiralarc/api-client build      # une fois, le front en a besoin

# Terminal 1 — backend
pnpm --filter @tiralarc/api dev

# Terminal 2 — frontend
pnpm --filter @tiralarc/web dev
```

### 3. Arrêter la base de données

```bash
pnpm db:down          # les données sont conservées (volume Docker)
```

## Adresses utiles

| Quoi                     | URL                                 |
| ------------------------ | ----------------------------------- |
| Site web                 | http://localhost:3000               |
| API — état de santé      | http://localhost:3001/api/v1/health |
| API — documentation      | http://localhost:3001/api/docs      |
| Adminer (explorer la BD) | http://localhost:8081               |
| Mailpit (emails de dev)  | http://localhost:8025               |

Adminer : serveur `mariadb`, utilisateur `tiralarc`, mot de passe `tiralarc`, base `tiralarc`.

## Comptes utilisateurs

- **Inscription par email** : un lien de confirmation est envoyé. En développement, aucun email
  ne part vraiment : ils arrivent tous dans **Mailpit**, http://localhost:8025. Cliquer sur le
  lien, puis sur « Confirmer mon email ».
- **Google / Apple** : boutons masqués tant que les identifiants ne sont pas configurés, voir
  [docs/oauth-setup.md](docs/oauth-setup.md).
- **Rendre quelqu'un administrateur** (la personne doit d'abord s'être inscrite) :

  ```bash
  pnpm --filter @tiralarc/api build      # si pas déjà fait
  pnpm --filter @tiralarc/api user:make-admin jane@example.com
  ```

  Effectif à sa prochaine connexion (ou au plus tard 15 min).

## En cas de problème

- **Le front affiche « API indisponible »** : le backend ne tourne pas, ou `API_URL` est faux
  dans `apps/web/.env.local`.
- **Le backend refuse de démarrer (« Invalid environment variables »)** : il manque
  `apps/api/.env`, ou `JWT_ACCESS_SECRET` fait moins de 32 caractères.
- **Erreur de connexion à la base** : `pnpm db:up` n'a pas été lancé ; vérifier avec
  `docker compose -f docker/docker-compose.yml ps`.
- **Port déjà utilisé** : changer `MARIADB_PORT` / `ADMINER_PORT` dans `docker/.env`, ou `PORT`
  dans `apps/api/.env` (et `API_URL` côté web en conséquence).
- **Pas d'email de confirmation** : vérifier que Mailpit tourne (`pnpm db:up`) et regarder
  http://localhost:8025.
- **Après modification de `prisma/schema.prisma`** : `pnpm --filter @tiralarc/api db:migrate`.
- **Après modification d'un contrôleur ou DTO de l'API** : `pnpm openapi` pour mettre à jour
  le client utilisé par le front.
