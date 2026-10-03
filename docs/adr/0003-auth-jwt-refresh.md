# 0003 — Authentification JWT + jetons de rafraîchissement rotatifs

**Statut** : accepté — 2026-10-03

## Contexte

L'authentification doit fonctionner pour le web et pour des applications mobiles natives.

## Décision

- Jeton d'accès : JWT HS256 de courte durée (15 min), envoyé en `Authorization: Bearer`.
- Jeton de rafraîchissement : valeur aléatoire opaque (256 bits), stockée hachée (SHA-256) en base,
  à usage unique. Chaque connexion crée une « famille » (une session par appareil) ; présenter un
  jeton déjà échangé révoque toute la famille (détection de vol).
- L'API n'utilise aucun cookie. Le web passe par Next.js (BFF) qui garde les jetons en cookies
  httpOnly ; les apps mobiles les stockent dans le Keychain / Keystore.

## Conséquences

- Les requêtes concurrentes d'un même client doivent mutualiser le rafraîchissement (fait dans
  `apps/web/src/proxy.ts`, en mémoire par instance). Avec plusieurs instances web, prévoir un
  verrou partagé ou une courte période de grâce côté API.
- Le BFF transmet `X-Forwarded-For` ; l'API doit faire confiance à ce saut (`TRUST_PROXY`) pour
  que la limitation de débit s'applique par utilisateur final.
