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
pnpm db:up            # MariaDB (:3307), Adminer (:8081), Mailpit (:8025), stockage S3 (:9000)
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

## Photos des événements (stockage S3)

Les photos jointes aux événements du journal sont rangées dans un stockage objet « compatible
S3 », privé ; la base ne garde que leur fiche.

- **En développement** : `pnpm db:up` démarre un service S3 local (Versity Gateway) sur
  http://localhost:9000. L'API y crée son bucket `tiralarc` au démarrage. Rien à configurer : les
  valeurs par défaut de `apps/api/.env.example` (`S3_…`) correspondent.
- **Voir les fichiers** : `docker exec tiralarc-s3-1 find /data/tiralarc -type f`. Ils sont rangés
  par archer puis par événement (`<archer>/<événement>/<photo>.webp` et `…-thumb.webp`).
- **En production** : créer un bucket **privé** chez l'hébergeur choisi et renseigner `S3_ENDPOINT`,
  `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` (et `S3_FORCE_PATH_STYLE=false` si
  l'hébergeur le demande). Le bucket doit être joignable depuis le navigateur des archers : les
  photos sont lues par des liens signés valables 10 minutes.
- **Limites** : 10 photos par événement, 10 Mo par envoi, JPEG / PNG / WebP. Chaque photo est
  redimensionnée (2000 px au plus, plus une vignette) et ses métadonnées (dont le GPS) sont
  retirées ; l'original n'est pas conservé.

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

## Ajouter un décor de calendrier (thème)

Un thème est un jeu d'images posées autour du calendrier du journal. Chaque mois d'un journal peut avoir
le sien : l'archer le choisit sur la page Journal, avec le bouton « Décor du mois ».

### 1. Préparer les images

| Fichier         | Rôle                                               | Proportions      | Taille conseillée |
| --------------- | -------------------------------------------------- | ---------------- | ----------------- |
| `top`           | bande au-dessus (obligatoire, seule sur téléphone) | 5 : 1 (paysage)  | 2000 × 400 px     |
| `bottom`        | bande en dessous (facultatif, dès la tablette)     | 5 : 1 (paysage)  | 2000 × 400 px     |
| `left`, `right` | colonnes latérales (facultatif, écrans ≥ 1200 px)  | 1 : 4 (portrait) | 300 × 1200 px     |
| `thumb`         | vignette du sélecteur (obligatoire)                | 4 : 3            | 400 × 300 px      |

- Trait **noir pur sur fond blanc**, sans gris ni dégradé, formes bien fermées : le
  coloriage (bouton « Colorier ») remplit la zone fermée sous le clic, et une forme ouverte
  laisserait la couleur « fuir » dans tout le fond.
- Format **SVG**, ou **PNG / WebP sans perte**. Pas de JPEG. Même format pour tous les fichiers
  d'un thème.
- Laisser dégagé le bord de la bande qui touche le calendrier.
- Vérifier que la licence des images autorise l'usage dans une application.

### 2. Déposer les images

Dans un dossier au nom du thème — identifiant en minuscules, chiffres et tirets, 30 caractères
au plus (ex. `fruits`) :

```
apps/web/public/themes/fruits/top.webp
apps/web/public/themes/fruits/bottom.webp
apps/web/public/themes/fruits/thumb.webp
```

### 3. Déclarer le thème

Dans `apps/web/src/components/journal/themes.ts`, ajouter une ligne à `THEMES`, avec l'extension
des fichiers et les bandes réellement fournies :

```ts
export const THEMES = {
  archery: { ext: 'svg', bands: ['top', 'bottom', 'left', 'right'] },
  fruits: { ext: 'webp', bands: ['top', 'bottom'] },
} as const satisfies …
```

### 4. Nommer le thème

Dans `apps/web/messages/fr.json` **et** `apps/web/messages/en.json`, sous `journals.themes` :

```json
"themes": {
  "archery": "Tir à l'arc",
  "fruits": "Fruits"
}
```

### 5. Vérifier

```bash
pnpm --filter @tiralarc/web typecheck     # signale un nom de thème oublié dans les traductions
```

Puis, avec `pnpm dev` : page Journal → bouton « Décor du mois » → choisir le nouveau décor.
Contrôler sur ordinateur, sur téléphone et en mode sombre (les traits y passent en blanc).

Pas de migration ni de `pnpm openapi` : l'API ne stocke que l'identifiant du thème. Si un thème
est retiré plus tard, les journaux qui l'utilisaient s'affichent simplement sans décor.

## En cas de problème

- **Le front affiche « API indisponible »** : le backend ne tourne pas, ou `API_URL` est faux
  dans `apps/web/.env.local`.
- **Le backend refuse de démarrer (« Invalid environment variables »)** : il manque
  `apps/api/.env`, ou `JWT_ACCESS_SECRET` fait moins de 32 caractères.
- **Erreur de connexion à la base** : `pnpm db:up` n'a pas été lancé ; vérifier avec
  `docker compose -f docker/docker-compose.yml ps`.
- **Port déjà utilisé** : changer `MARIADB_PORT` / `ADMINER_PORT` dans `docker/.env`, ou `PORT`
  dans `apps/api/.env` (et `API_URL` côté web en conséquence).
- **L'envoi d'une photo échoue** : vérifier que le stockage tourne (`pnpm db:up`, conteneur
  `tiralarc-s3-1`) ; l'API affiche « Storage unavailable » au démarrage s'il est injoignable.
- **Pas d'email de confirmation** : vérifier que Mailpit tourne (`pnpm db:up`) et regarder
  http://localhost:8025.
- **Après modification de `prisma/schema.prisma`** : `pnpm --filter @tiralarc/api db:migrate`.
- **Après modification d'un contrôleur ou DTO de l'API** : `pnpm openapi` pour mettre à jour
  le client utilisé par le front.
