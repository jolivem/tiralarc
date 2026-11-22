# Propositions d'amélioration — MyArcheryDiary

Liste à revoir ensemble (21 novembre 2026). Pour chaque proposition : l'idée, ce qu'elle apporte,
et une estimation de l'effort (S = quelques heures, M = une journée, L = plusieurs jours).

**À faire en premier, à mon avis** : 9 (la rubrique Fiches est encore vide).

## Compte et données

1. ~~**Supprimer son compte et récupérer ses données** — Aujourd'hui, aucun moyen de supprimer son
   compte depuis le site. C'est une obligation du RGPD, et Apple refuse dans l'App Store toute
   application avec inscription qui ne propose pas la suppression du compte. Un bouton sur la page
   Mon compte (avec confirmation) supprime le compte, les journaux, les fiches et les photos ; un
   second télécharge toutes ses données (fichier JSON + photos). _(M)_~~
   **Fait** : carte « Vos données » de la page Mon compte. « Télécharger mes données » donne une
   archive ZIP (un fichier JSON de tout le compte, les photos, les feuilles de marque) ; « Supprimer
   mon compte » demande de retaper son email (et son mot de passe s'il en a un), puis tout est
   effacé, photos comprises.

## Prise en main

2. ~~**Visite guidée de la fiche d'événement** — Les visites existent pour l'accueil, le Journal, les
   Indicateurs et le Profil, pas pour la fiche, la page la plus riche : informations, déroulé de la
   séance, bilan, ressentis, photos, partage, « Refaire cette séance ». _(S)_~~
   **Fait** : sur les fiches des entraînements, coachings et compétitions.
3. ~~**Liste « Pour bien démarrer »** — Sur l'accueil d'un nouvel archer, une petite liste à cocher
   qui disparaît une fois terminée : profil renseigné (licence, arme, catégorie), première séance
   notée, coach invité, premier mois décoré. _(S)_~~
   **Fait** : sous le calendrier de l'accueil ; chaque ligne mène à la bonne page, « Masquer cette
   liste » la retire.
4. ~~**Journal d'exemple pour les visiteurs** — Un bouton « Voir un exemple » sur la page d'accueil
   des visiteurs, qui ouvre en lecture seule un journal fictif (calendrier, fiches, indicateurs).
   On comprend le site avant de créer un compte. _(M)_~~
   **Fait** : une saison inventée autour de la date du jour (en français ou en anglais), refaite
   chaque semaine ; un bandeau « Journal d'exemple » avec « Créer mon compte », et l'API refuse
   toute modification.

## Page d'accueil

5. **Prochain concours en vedette** — « Dans 12 jours : Concours de Villepreux », avec le compte à
   rebours et un lien vers sa fiche, dès qu'un concours est dans le journal. _(S)_
6. **Encarts repliables** — La page de droite empile Régularité, Planification Concours et
   l'indicateur favori : pouvoir replier un encart (choix gardé), pour garder un accueil court. _(S)_

## Fiches d'événement

7. **Modèles de séance** — Enregistrer un déroulé comme modèle (« Technique 18 m », « Préparation
   concours ») et l'appliquer en un clic à une nouvelle séance. Utile aussi au coach, qui pourrait
   partager les siens avec ses archers. _(M)_
8. ~~**Fiche de renforcement musculaire** — Le formulaire est annoncé « bientôt disponible » : exercices,
   séries, répétitions, charge ou durée, avec la même liste à cocher que le déroulé des séances. _(M)_~~
   **Fait** : un guide construit chaque exercice en quelques clics (zone, exercice illustré, séries,
   répétitions ou durée, charge, repos), sur les fiches Renfo du classeur et sur les séances Renfo du
   journal, qui peuvent reprendre une fiche et cocher chaque exercice fait ; la durée de la séance se
   calcule d'après le programme.
9. ~~**Rubrique Fiches (technique et réglages)** — La rubrique n'a encore qu'une page de titre.
   Proposer deux sortes de fiches : les réglages du matériel (puissance, allonge, band, repères du
   viseur par distance, flèches) et des mémos techniques (consignes, points de vigilance), datées
   pour garder l'historique d'un réglage. Elles ont déjà leur chapitre dans l'extrait PDF. _(L)_~~
   **Fait** : un classeur en quatre demi-pages pastel (Technique, Réglages, Renfo, Préparation
   mentale), chacune avec son index et un « + » ; une fiche = un titre et un texte libre, datée de sa
   dernière modification, sur sa propre feuille. Le coach les lit ; elles remplissent le chapitre
   « Fiches » de l'extrait PDF. Pas encore de champs structurés (repères du viseur par distance…).
10. **Saisie volée par volée** — Noter les volées (ex. 10 × 3 flèches) avec un clavier de valeurs
    (X, 10, 9… M) : score et nombre de flèches se calculent seuls, et la moyenne par flèche devient
    plus précise. _(L)_
11. ~~**Météo récupérée automatiquement** — Ciel, vent et température se saisissent à la main ; le lieu
    de la séance est déjà situé sur la carte (géocodage), donc la météo du jour peut être proposée
    (service gratuit Open-Meteo, sans clé). L'archer garde la main pour corriger. _(M)_~~
    **Fait** : « Remplir avec la météo du jour » sous les champs météo des séances en extérieur, à
    partir du jour de la séance ; au lieu de la séance s'il s'agit d'une ville, sinon à la ville de
    départ du profil. À vérifier, puis enregistrer.
12. ~~**Dictée du bilan** — Un micro à côté des textes libres : on dicte son ressenti au pas de tir
    (reconnaissance vocale du navigateur). _(M)_~~
    **Fait** : un micro près de « Objectif », « Description et analyses » et « Next » ; il n'apparaît
    que dans les navigateurs qui savent reconnaître la voix (Chrome, Edge, Safari ; pas Firefox).

## Indicateurs

13. **Comparer deux périodes** — « Cette saison contre la précédente » ou « ce mois-ci contre le mois
    dernier » sur un même graphique (flèches, moyenne par flèche). _(M)_
14. **Ressentis et scores** — Un graphique qui croise ressenti physique ou mental et score : « je tire
    mieux quand je me sens bien » devient visible. _(M)_
15. ~~**Objectifs chiffrés suivis tout seuls** — Un objectif de score (« 550 en salle ») ou de volume
    (« 10 000 flèches cette saison ») montre sa progression, et se coche de lui-même le jour où il
    est atteint. _(M)_~~
    **Fait** : « Suivi chiffré » dans la fenêtre d'un objectif : un score à atteindre en compétition
    (discipline et distance au choix), ou un nombre de flèches depuis la date de création. Une barre
    de progression sous l'objectif ; coché tout seul, au jour où il a été atteint.

## Coach

16. ~~**Prévenir l'archer par email** — Quand le coach propose une séance ou écrit un commentaire,
    l'archer ne le voit qu'en ouvrant l'accueil. Un email (désactivable dans le profil, au plus un
    par jour) le fait revenir. _(S)_~~
    **Fait** : carte « Emails » de la page Profil pour le désactiver.
17. **Tableau de bord du coach** — Tous ses archers sur une page : dernière séance, séances proposées
    à venir, bilans en retard, aucune séance depuis 10 jours. _(M)_
18. ~~**Planifier pour un groupe** — Les groupes existent : proposer la même séance à tous les archers
    d'un groupe en une fois. _(M)_~~
    **Fait** : « Planifier à nouveau » sur la fiche d'un entraînement ou d'un cours vue par le coach :
    il choisit le jour et les archers (un par un, ou tout un groupe d'un clic ; ceux dont il n'a
    qu'un accès en lecture ne sont pas proposés). Chacun reçoit une séance proposée par le coach,
    avec le même programme ; la fenêtre dit ensuite pour qui c'est fait, et pourquoi pas pour les
    autres (journal terminé avant ce jour, jour déjà complet).

## Compétitions

19. ~~**Rappel avant un concours** — Un email la semaine d'un concours inscrit au journal (lieu, lien
    du mandat), désactivable dans le profil. _(M)_~~
    **Fait** : un email par archer listant ses concours des 7 prochains jours (lieu, lien vers la
    page FFTA du concours, lien vers sa fiche) ; désactivable dans la même carte « Emails ».
20. ~~**Agenda du téléphone** — Un lien d'abonnement (iCal) à ajouter à Google Agenda ou à l'agenda de
    l'iPhone : les séances et concours du journal y apparaissent tout seuls. _(M)_~~
    **Fait** : carte « Agenda du téléphone » de la page Profil ; le lien ne s'affiche qu'une fois, un
    nouveau lien désactive l'ancien.

## Fiabilité

21. ~~**Surveiller ianseo comme la FFTA** — Si le site de la FFTA change, une alerte part par email ;
    rien de tel pour ianseo, d'où viennent les feuilles de marque : une refonte de ianseo passerait
    inaperçue. Même mécanisme, mêmes trois échecs d'affilée. _(S)_~~
    **Fait** : la liste des compétitions de l'année est vérifiée à chaque recherche.
22. ~~**Tests de bout en bout du site** — L'API est testée de bout en bout, le site seulement par
    morceaux. Quelques parcours joués dans un vrai navigateur (inscription, première séance,
    décoration, extrait PDF) éviteraient les régressions avant chaque mise en ligne. _(M)_~~
    **Fait (en partie)** : `pnpm --filter @tiralarc/web test:e2e`, avec `pnpm dev` lancé : le journal
    d'exemple, et inscription → premier journal → séance → suppression du compte. Restent la
    décoration et l'extrait PDF.

## Accessibilité et visibilité

23. **Accessibilité des calendriers et des fiches** — Navigation au clavier dans les calendriers,
    contrastes des icônes grisées, lecture par les lecteurs d'écran des étoiles et des ressentis.
    _(M)_
24. ~~**Avis mis en avant** — Les avis publiés défilent sous la FAQ ; en placer deux ou trois près de
    la phrase d'accroche, là où le visiteur décide de s'inscrire. _(S)_~~
    **Fait** : jusqu'à trois avis courts de 4 ou 5 étoiles sous la phrase d'accroche, avec la moyenne.
25. **Offre pour les clubs** — Un espace club où l'entraîneur suit ses licenciés, avec une invitation
    groupée ; un bon moyen de faire connaître le site. _(L)_
