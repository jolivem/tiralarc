# 0006 — Interface : Mantine

**Statut** : accepté — 2026-10-03

## Contexte

Le site doit s'adapter aux ordinateurs, tablettes et smartphones, et les fonctions de calendrier
(séances, compétitions, planning des coachs) seront centrales.

## Décision

Mantine 9 pour les composants et les styles, à la place de Tailwind (un seul système de styles).
`@mantine/schedule` (MIT) fournit les vues jour / semaine / mois / agenda, une vue mois pour mobile
et des vues par ressource (par coach, par terrain) ; `@mantine/dates` les sélecteurs de date avec
rendu personnalisé des jours (`renderDay`).

Écartés : shadcn/ui + Tailwind (pas de planning ; FullCalendar facture les vues par ressource) ;
Bootstrap (intégration React par surcouche, doublon avec Tailwind).

## Conséquences

- `@mantine/schedule` est récent (février 2026) : à surveiller, prévoir des contournements.
- Les composants Mantine sont des composants client : dans un Server Component, utiliser les
  enveloppes `ButtonLink` / `AnchorLink` pour les liens.
