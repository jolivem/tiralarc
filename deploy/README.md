# Déploiement (VPS Hetzner, docker compose)

Les images sont construites sur le poste de dev et publiées sur GHCR (`ghcr.io/jolivem/tiralarc-*`). Le VPS
clone ce dépôt pour le compose, la config Caddy et la page de maintenance, puis télécharge les images.

```
deploy/
  build.sh                  poste de dev : vérifie, construit et pousse les images (pnpm release)
  deploy.sh                 VPS : pull, maintenance, dump, migrations, nouveaux conteneurs
  backup.sh                 VPS ou poste de dev (--local) : base + photos dans une archive de backups/
  restore.sh                VPS ou poste de dev (--local) : remet une archive de backup.sh à la place des données
  docker-compose.prod.yml   MariaDB, Versity (photos), API, web, Caddy, migrate
  caddy/Caddyfile           HTTPS automatique, routage, maintenance
  maintenance/index.html    page affichée pendant la maintenance (503)
  .env.example              réglages de production → deploy/.env sur le VPS
  build.env.example         client IDs Google / Apple du site → deploy/build.env sur le poste de dev
  runtime/                  (VPS, non versionné) current-tag, previous-tag, maintenance.on
  backups/                  (non versionné) dumps de deploy.sh (14 jours), archives de backup.sh (7 jours)
```

Une version porte le nom de son commit : les 12 premiers caractères du hash (`git rev-parse --short=12`), par
exemple `ed4d956a1b2c`. Les scripts le calculent eux-mêmes : on ne le tape que pour revenir en arrière.

## Mettre en ligne une nouvelle version

```bash
# poste de dev, sur main, tout commité et poussé
pnpm release                     # lint + typecheck + test, build, push des 3 images
# VPS
ssh <vps> /opt/tiralarc/deploy/deploy.sh
```

`deploy.sh` :

1. `git pull` du dépôt. Si `deploy.sh` a changé, il se relance avec sa nouvelle version.
2. Vérifie `deploy/.env` : aucune variable de `.env.example` ne manque, plus aucun `change-me`.
3. Télécharge les images du commit. Si elles n'existent pas encore, il s'arrête et le site reste en ligne : lance
   `pnpm release`.
4. Affiche la page de maintenance (`runtime/maintenance.on`). Le site répond 503, l'API répond
   `{"code":"MAINTENANCE"}`.
5. Démarre MariaDB, Versity et Caddy si besoin, recharge le Caddyfile, crée le bucket des photos s'il manque.
6. Arrête l'API et le site, puis fait un dump de la base dans `backups/` et applique les migrations Prisma.
7. Démarre la nouvelle API et le nouveau site et attend leurs healthchecks, puis retire la page de maintenance.

Si une étape échoue, la page de maintenance reste affichée. Le script indique la commande de retour arrière, le
dump et la commande pour rouvrir le site.

Maintenance manuelle, sans déploiement : `deploy/deploy.sh maintenance on` / `off`.

## Revenir en arrière

```bash
cd /opt/tiralarc/deploy
cat runtime/current-tag runtime/previous-tag
```

- **La version ratée n'avait pas de migration** : `./deploy.sh --no-pull $(cat runtime/previous-tag)`.
- **Elle avait une migration** (les migrations Prisma ne s'annulent pas) : restaurer le dump pris juste avant,
  puis redéployer l'ancienne version :

  ```bash
  ./deploy.sh maintenance on
  docker compose -f docker-compose.prod.yml stop api web
  gunzip -c backups/tiralarc-<date>-<ancienne version>.sql.gz |
    docker compose -f docker-compose.prod.yml exec -T mariadb sh -c 'exec mariadb -uroot -p"$MARIADB_ROOT_PASSWORD"'
  ./deploy.sh --no-pull $(cat runtime/previous-tag)
  ```

  Le dump supprime puis recrée la base : les tables ajoutées par la migration ratée disparaissent. Ce
  redéploiement fait lui-même un nouveau dump avant de démarrer.

## Installation initiale du VPS

1. Ubuntu + Docker et son plugin compose :
   `curl -fsSL https://get.docker.com | sh`. Pare-feu Hetzner : ouvrir 22, 80, 443 (TCP) et 443 (UDP).
2. DNS : deux enregistrements `A` (et `AAAA`) vers l'IP du VPS, pour `<domaine>` et `s3.<domaine>`. Les photos
   sont lues par URL signée sur `s3.<domaine>`.
3. Code : `git clone https://github.com/jolivem/tiralarc /opt/tiralarc` (si le dépôt est privé : une clé de
   déploiement en lecture seule).
4. Images : `docker login ghcr.io -u jolivem`, avec un token GitHub `read:packages`. Inutile si les paquets GHCR
   sont publics.
5. Réglages : `cp deploy/.env.example deploy/.env` et `chmod 600 deploy/.env`, puis remplir chaque valeur. Les
   secrets se génèrent avec `openssl rand -hex 32`. `SMTP_URL` doit pointer vers un vrai fournisseur d'e-mails :
   il n'y a pas de Mailpit en production.
6. Premier déploiement : `deploy/deploy.sh`. Ensuite, inscris-toi sur le site et confirme l'e-mail, puis donne-toi
   le rôle admin :
   `docker compose -f deploy/docker-compose.prod.yml run --rm --no-deps api node dist/cli/make-admin.js <email>`.

Sur le poste de dev, une seule fois : `docker login ghcr.io -u jolivem` avec un token `write:packages`. Si le
site propose la connexion Google / Apple, copier aussi `build.env.example` en `deploy/build.env` et le remplir.
Pour un serveur ARM (Hetzner CAX) : `pnpm release --platform linux/arm64`, qui demande `docker buildx`.

## Exploitation

```bash
cd /opt/tiralarc/deploy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail 100 api web
docker compose -f docker-compose.prod.yml exec mariadb sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" tiralarc'
```

## Données : sauvegarde et restauration

`backup.sh` met la base (dump cohérent, le site reste en ligne) et les photos (copiées par l'API S3 avec rclone,
dans un conteneur jetable) dans une seule archive : `backups/tiralarc-data-<date>.tar`. `restore.sh <archive>`
la remet à la place des données actuelles, après confirmation. Sur le VPS, il sauvegarde d'abord les données
actuelles, affiche la page de maintenance, arrête l'API et le site, restaure, applique les migrations de la
version en ligne (une archive plus ancienne rattrape le schéma), puis redémarre tout. Les photos absentes de
l'archive sont supprimées. Sur le poste de dev, ajouter `--local` (conteneurs de `pnpm db:up`).

**Envoyer les données du poste de dev sur le VPS** (une fois, après un premier `deploy.sh`) :

```bash
# poste de dev
deploy/backup.sh --local
scp deploy/backups/tiralarc-data-<date>.tar <vps>:/opt/tiralarc/deploy/backups/
# VPS
/opt/tiralarc/deploy/restore.sh /opt/tiralarc/deploy/backups/tiralarc-data-<date>.tar
```

**Sauvegarde quotidienne** sur le VPS (`crontab -e`, utilisateur du groupe `docker`) :

```
30 3 * * * /opt/tiralarc/deploy/backup.sh >>/opt/tiralarc/deploy/backups/backup.log 2>&1
```

Ces archives restent **sur le VPS** : elles protègent d'une erreur, pas de la perte du serveur. Rapatrie-les
régulièrement ailleurs, par exemple depuis le poste de dev :

```bash
rsync -av <vps>:/opt/tiralarc/deploy/backups/ ~/tiralarc-backups/
```

Pour récupérer les données de production sur le poste de dev : la même archive, puis
`deploy/restore.sh --local <archive>` (et `pnpm --filter @tiralarc/api exec prisma migrate deploy` si le code
local est plus récent).
