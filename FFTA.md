# FFTA — accès aux données pour une synchronisation vers Tiralarc

Recherche du 8 octobre 2026, faite à partir de sources publiques (liens en bas de page).

**Conclusion : la FFTA ne propose pas d'API publique documentée.** Les données existent en ligne,
mais un accès propre pour les synchroniser passe par un accord avec la fédération.

## Les sites de la FFTA

| Site                | Pour qui           | Données                                                           |
| ------------------- | ------------------ | ----------------------------------------------------------------- |
| `ffta.fr`           | public             | calendrier des épreuves, mandats, résultats, classements, clubs   |
| `monespace.ffta.fr` | licencié connecté  | ses compétitions, scores retenus, classement national, licence    |
| `dirigeant.ffta.fr` | dirigeants de club | gestion du club, licences, droits                                 |
| `extranet.ffta.fr`  | organisateurs      | dépôt des mandats (avant) et des résultats (après la compétition) |

Ces sites sont opérés par le prestataire **Exalto / e-Licence**, qui équipe une quarantaine de
fédérations sportives françaises.

Les résultats arrivent dans la base fédérale par un fichier texte produit par les logiciels de
gestion de concours (**Result'Arc**, fourni par la FFTA, ou **Ianseo**) et déposé par
l'organisateur ; ils sont publiés sur `ffta.fr`, en général sous 48 heures.

## Accès et authentification

- **Pas de clé d'API ni d'inscription développeur** : ni documentation, ni portail, ni open data
  trouvés.
- **Une API existe côté prestataire** : e-Licence propose un module « API interopérable » et une
  connexion unique (SSO) pour les licenciés. Ils s'ouvrent fédération par fédération, par contrat
  (exemple : la plateforme de formation Apolearn, connectée en SSO).
- **Un précédent pour le tir à l'arc** : Sportsregions (éditeur de sites de clubs) affiche
  automatiquement le calendrier, les résultats du week-end et les actualités FFTA. Cela repose sur
  une « collaboration » avec la fédération, une offre payante, et la saisie du numéro fédéral du
  club. Le mécanisme technique n'est pas publié.
- **Les pages publiques ne sont pas une API** : c'est du HTML. `ffta.fr` a refusé une requête
  automatique (erreur 403), signe d'une protection anti-robot. Les projets libres qui aspiraient
  le calendrier (`ffta.fr/evenements/liste`) datent de 2021-2022 et ne sont plus maintenus.

## Données utiles à Tiralarc

| Donnée FFTA                 | Usage dans Tiralarc                                                           | Où elle se trouve                       |
| --------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| Calendrier des compétitions | événements du journal ; options « niveau départemental / régional » du profil | `ffta.fr` (public)                      |
| Résultats de l'archer       | score des événements « Compétition »                                          | `ffta.fr` (public), `monespace.ffta.fr` |
| Classement national         | indicateurs                                                                   | `ffta.fr`, `monespace.ffta.fr`          |
| Licence, catégorie, club    | profil (le numéro de licence y est déjà saisi)                                | `monespace.ffta.fr` (connecté)          |

Le numéro de licence, déjà présent dans le profil Tiralarc, est la clé naturelle pour retrouver
les résultats d'un archer.

## Ce qui est déconseillé

- **Demander à l'archer son mot de passe FFTA** pour lire son espace à sa place. Les plateformes
  de licences du sport français ont subi des fuites massives depuis 2024 (la FFTA figure parmi les
  fédérations citées) ; stocker ces identifiants exposerait Tiralarc, et c'est très probablement
  contraire aux conditions d'utilisation.
- **Aspirer les résultats nominatifs sans accord** : ils relèvent du droit des bases de données et
  du RGPD.

## Pistes, par ordre de préférence

1. **Demander un accès partenaire à la FFTA**, en citant le précédent Sportsregions. C'est la
   seule voie durable. Demande ciblée : calendrier des compétitions, et résultats d'un archer à
   partir de son numéro de licence.
2. **Import par l'archer, sans attendre la fédération** : saisie manuelle de ses compétitions, ou
   import d'un fichier de résultats au format FFTA (celui que produisent Result'Arc et Ianseo ;
   le projet libre `arc-distinctions-ffta` sait déjà le relire).
3. **Lecture du calendrier public seul**, sans données personnelles. Faisable techniquement mais
   fragile (blocage anti-robot, mise en page qui change), et à valider avec la fédération.

## Points non vérifiés

- Le contenu exact de l'« API interopérable » d'e-Licence et ses conditions d'accès.
- Le format précis du fichier de résultats FFTA (colonnes, encodage).
- Les conditions d'utilisation de `ffta.fr` concernant la réutilisation des données.
- La structure actuelle des pages d'épreuves (filtres par département ou région).
- L'existence d'un interlocuteur technique à la FFTA pour ce type de demande.

## Sources

- [Gérez les résultats avec Result'Arc — FFTA](https://www.ffta.fr/vie-sportive/resultats/gerez-les-resultats-avec-resultarc)
- [dirigeant.ffta.fr, nouveau site septembre 2023 — Arc Occitanie](https://arc-occitanie.fr/dirigeant-ffta-fr-2023/)
- [IANSEO FFTA — Arc Occitanie](https://arc-occitanie.fr/ianseo-ffta/)
- [Espace licencié — Les Archers du Château d'Eybens](https://lesarchersdeybens.fr/ffta-espace-licencie/)
- [Fonctionnalités spécifiques FFTA — Sportsregions](https://aide.sportsregions.fr/tutoriel/fonctionnalites-specifiques-federation-francaise-de-tir-a-larc/)
- [Le tir à l'arc confirme avec e-licence](https://e-licence.fr/actualites/tir-a-larc-confirme-e-licence/)
- [E-Licence : présentation](https://e-licence.fr/presentation/)
- [Interconnexion Apolearn / e-Licence (SSO)](https://apolearn.com/federations-sportives-formations-interconnexion-lms-apolearn-elicence/)
- [Le sport français piraté — FrenchBreaches](https://frenchbreaches.com/blog/le-sport-francais-pirate-plus-de-40-federations-touchees-des-millions-de-donnees-exposees)
- [Neofox/ffta-events-api — GitHub](https://github.com/Neofox/ffta-events-api)
- [mat-chartier/arc-distinctions-ffta — GitHub](https://github.com/mat-chartier/arc-distinctions-ffta)
