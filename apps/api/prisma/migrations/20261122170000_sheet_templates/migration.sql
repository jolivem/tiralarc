-- CreateTable
CREATE TABLE `sheet_templates` (
    `id` CHAR(36) NOT NULL,
    `category` ENUM('TECHNIQUE', 'SETTINGS', 'STRENGTH', 'MENTAL') NOT NULL,
    `locale` VARCHAR(10) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `body` TEXT NOT NULL,
    `position` SMALLINT NOT NULL DEFAULT 0,

    INDEX `sheet_templates_category_locale_idx`(`category`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The first templates: lines to fill in ("\n" = a new line).
INSERT INTO `sheet_templates` (`id`, `category`, `locale`, `title`, `body`, `position`) VALUES
-- Settings
('5e7a0000-0000-4000-8000-000000000001', 'SETTINGS', 'fr', 'Ma corde',
 'Date de montage :\nMatériau (Dacron, BCY 8125, Fast Flight…) :\nNombre de brins :\nLongueur :\nCouleur / tranche-fil :\nBand (hauteur de corde) :\nPoint d''encochage (au-dessus de l''équerre) :\nTours de torsion :\nRepère de nock / kisser :\nFlèches tirées depuis le montage :\nRemarques :', 1),
('5e7a0000-0000-4000-8000-000000000002', 'SETTINGS', 'fr', 'Mes flèches',
 'Modèle de tube :\nSpine :\nLongueur (fond d''encoche → bout du tube) :\nPointes (modèle, grains) :\nEncoches (modèle, taille) :\nEmpennage (plumes / vanes, taille, angle) :\nPoids total (grains) :\nFOC (équilibrage avant) :\nNombre de flèches, numéros :\nRemarques :', 2),
('5e7a0000-0000-4000-8000-000000000003', 'SETTINGS', 'fr', 'Mon arc',
 'Poignée (modèle, taille) :\nBranches (modèle, puissance nominale, longueur) :\nAllonge :\nPuissance à l''allonge :\nTiller haut / bas :\nBand :\nRepose-flèche :\nBerger button (tension, position) :\nClicker :\nStabilisation (central, latéraux, V-bar, poids) :\nViseur :\nRemarques :', 3),
('5e7a0000-0000-4000-8000-000000000004', 'SETTINGS', 'fr', 'Repères du viseur',
 'Viseur et extension :\n\n18 m :\n20 m :\n25 m :\n30 m :\n40 m :\n50 m :\n60 m :\n70 m :\n90 m :\n\nRéglés le :\nAvec (flèches, corde) :', 4),
('5e7a0000-0000-4000-8000-000000000011', 'SETTINGS', 'en', 'My string',
 'Fitted on:\nMaterial (Dacron, BCY 8125, Fast Flight…):\nNumber of strands:\nLength:\nColour / serving:\nBrace height:\nNocking point (above square):\nTwists:\nNock / kisser mark:\nArrows shot since fitting:\nNotes:', 1),
('5e7a0000-0000-4000-8000-000000000012', 'SETTINGS', 'en', 'My arrows',
 'Shaft model:\nSpine:\nLength (nock groove → shaft end):\nPoints (model, grains):\nNocks (model, size):\nFletching (feathers / vanes, size, angle):\nTotal weight (grains):\nFOC:\nNumber of arrows, numbers:\nNotes:', 2),
('5e7a0000-0000-4000-8000-000000000013', 'SETTINGS', 'en', 'My bow',
 'Riser (model, size):\nLimbs (model, rated weight, length):\nDraw length:\nWeight at draw:\nTiller top / bottom:\nBrace height:\nArrow rest:\nPlunger (tension, position):\nClicker:\nStabilisers (long rod, side rods, V-bar, weights):\nSight:\nNotes:', 3),
('5e7a0000-0000-4000-8000-000000000014', 'SETTINGS', 'en', 'Sight marks',
 'Sight and extension:\n\n18 m:\n20 m:\n25 m:\n30 m:\n40 m:\n50 m:\n60 m:\n70 m:\n90 m:\n\nSet on:\nWith (arrows, string):', 4),
-- Technique
('5e7a0000-0000-4000-8000-000000000021', 'TECHNIQUE', 'fr', 'Point technique',
 'Ce que je travaille :\nPourquoi :\n\nLes sensations recherchées :\n\nMes consignes (2 ou 3, courtes) :\n- \n- \n\nÉducatifs / exercices :\n- \n\nPoints de vigilance :\n\nVu avec (coach, date) :', 1),
('5e7a0000-0000-4000-8000-000000000022', 'TECHNIQUE', 'fr', 'Ma séquence de tir',
 '1. Placement des pieds :\n2. Encochage :\n3. Prise de corde / main d''arc :\n4. Pré-armement :\n5. Armement :\n6. Ancrage :\n7. Visée / expansion :\n8. Lâcher :\n9. Accompagnement :\n10. Analyse de la flèche :', 2),
('5e7a0000-0000-4000-8000-000000000031', 'TECHNIQUE', 'en', 'Technique point',
 'What I am working on:\nWhy:\n\nThe feelings I look for:\n\nMy cues (2 or 3, short):\n- \n- \n\nDrills / exercises:\n- \n\nWatch out for:\n\nSeen with (coach, date):', 1),
('5e7a0000-0000-4000-8000-000000000032', 'TECHNIQUE', 'en', 'My shot sequence',
 '1. Stance:\n2. Nocking:\n3. Hook / bow hand:\n4. Set-up:\n5. Draw:\n6. Anchor:\n7. Aiming / expansion:\n8. Release:\n9. Follow-through:\n10. Shot analysis:', 2),
-- Strength
('5e7a0000-0000-4000-8000-000000000041', 'STRENGTH', 'fr', 'Séance de renfo',
 'Objectif de la séance :\nDurée :\n\nÉchauffement :\n\nExercices (séries × répétitions — charge — récupération) :\n1. \n2. \n3. \n4. \n5. \n\nRetour au calme / étirements :\n\nRemarques :', 1),
('5e7a0000-0000-4000-8000-000000000042', 'STRENGTH', 'fr', 'Gainage et épaules',
 'Gainage face : 3 × 30 s\nGainage latéral : 3 × 20 s de chaque côté\nRotations externes à l''élastique : 3 × 15\nTirage élastique (dos) : 3 × 15\nY-T-W au sol : 2 × 10\nTenue de l''arc à l''ancrage : 5 × 20 s\n\nRécupération entre les séries :\nRemarques :', 2),
('5e7a0000-0000-4000-8000-000000000051', 'STRENGTH', 'en', 'Strength session',
 'Goal of the session:\nDuration:\n\nWarm-up:\n\nExercises (sets × reps — load — rest):\n1. \n2. \n3. \n4. \n5. \n\nCool-down / stretching:\n\nNotes:', 1),
('5e7a0000-0000-4000-8000-000000000052', 'STRENGTH', 'en', 'Core and shoulders',
 'Front plank: 3 × 30 s\nSide plank: 3 × 20 s each side\nBand external rotations: 3 × 15\nBand rows (back): 3 × 15\nY-T-W on the floor: 2 × 10\nHolding at anchor: 5 × 20 s\n\nRest between sets:\nNotes:', 2),
-- Mental preparation
('5e7a0000-0000-4000-8000-000000000061', 'MENTAL', 'fr', 'Ma routine de tir',
 'Avant la volée :\n- Respiration :\n- Ce que je me dis :\n\nPendant chaque flèche :\n- Ma consigne unique :\n\nAprès une mauvaise flèche :\n- \n\nEntre les volées :\n- ', 1),
('5e7a0000-0000-4000-8000-000000000062', 'MENTAL', 'fr', 'Préparer un concours',
 'La veille (matériel, sac, sommeil) :\n\nLe matin (repas, trajet, horaires) :\n\nÉchauffement :\n\nMon objectif du jour (sur la technique, pas le score) :\n\nMes phrases-clés :\n- \n- \n\nSi le stress monte :\n\nAprès le concours, ce que je retiens :', 2),
('5e7a0000-0000-4000-8000-000000000071', 'MENTAL', 'en', 'My shot routine',
 'Before the end:\n- Breathing:\n- What I tell myself:\n\nDuring each arrow:\n- My single cue:\n\nAfter a bad arrow:\n- \n\nBetween ends:\n- ', 1),
('5e7a0000-0000-4000-8000-000000000072', 'MENTAL', 'en', 'Preparing a competition',
 'The day before (equipment, bag, sleep):\n\nIn the morning (meal, journey, times):\n\nWarm-up:\n\nMy goal of the day (on technique, not the score):\n\nMy key phrases:\n- \n- \n\nIf stress rises:\n\nAfter the competition, what I keep:', 2);
