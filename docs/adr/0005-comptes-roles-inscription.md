# 0005 — Comptes, rôles et inscription

**Statut** : accepté — 2026-10-03

## Décision

- Rôles **cumulables** (table `user_roles`) : `ARCHER` et `COACH` choisis par l'utilisateur,
  `ADMIN` attribué hors application (commande `user:make-admin`). Les rôles voyagent dans le JWT
  d'accès : un changement prend effet au prochain rafraîchissement (≤ 15 min).
- Trois façons de s'inscrire : email + mot de passe (lien de confirmation obligatoire), Google,
  Apple. Comptes externes dans `user_identities` (fournisseur + `sub`), plusieurs par utilisateur.
- Google / Apple : le client envoie l'ID token, l'API le vérifie (JWKS du fournisseur, audience =
  nos client IDs). Même route pour le web et les apps natives.
- Liaison automatique à un compte existant uniquement si le fournisseur garantit l'email. Si ce
  compte n'avait jamais confirmé son email, son mot de passe est supprimé (protection contre la
  pré-création d'un compte par un tiers).
- Un compte créé via Google / Apple depuis la page de connexion n'a pas encore de rôle : le web
  affiche alors l'étape « onboarding » (`PUT /users/me/roles`).
- Le lien de confirmation ouvre une page avec un bouton (POST) : les antivirus de messagerie qui
  « visitent » les liens ne consomment pas le jeton.

## Conséquences

- Envoi d'emails requis (SMTP) ; Mailpit en développement.
- Apple impose HTTPS et un domaine déclaré : non testable sur `localhost` sans tunnel.
