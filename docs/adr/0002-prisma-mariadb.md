# 0002 — Prisma 7 avec MariaDB

**Statut** : accepté — 2026-10-03

## Décision

Prisma 7 (provider `mysql`, driver adapter `@prisma/adapter-mariadb`), schéma déclaratif dans
`apps/api/prisma/schema.prisma`, migrations SQL versionnées. Tables et colonnes en `snake_case`
(`@@map` / `@map`), identifiants UUID (`CHAR(36)`), dates `DATETIME(3)` en UTC.

## Conséquences

- Client entièrement typé, généré dans `apps/api/src/generated` (non versionné).
- En production, `prisma migrate deploy` s'exécute via la cible Docker `migrate`, avant le
  déploiement de la nouvelle version.
