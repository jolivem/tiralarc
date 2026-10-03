# 0004 — OpenAPI comme contrat entre l'API et ses clients

**Statut** : accepté — 2026-10-03

## Décision

La spec OpenAPI est générée depuis le code NestJS (`@nestjs/swagger`), écrite dans
`apps/api/openapi.json` et versionnée. Le client TypeScript (`openapi-typescript` +
`openapi-fetch`) en est dérivé ; les clients Kotlin et Swift le seront avec `openapi-generator`.
L'API est versionnée par l'URL (`/api/v1`).

## Conséquences

- La CI échoue si le contrat versionné ne correspond plus au code.
- Une rupture de compatibilité impose une `v2` : `v1` reste servie tant que des versions
  d'applications mobiles l'utilisent encore.
