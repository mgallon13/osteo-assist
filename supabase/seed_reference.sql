-- Généré par supabase/reference/cards.py — ne pas modifier à la main.
-- Référentiel de pratiques de départ (global). validated = false : à relire cliniquement.
delete from public.reference_cards where organization_id is null;
insert into public.reference_cards (organization_id, motif, keywords, section, content, source_label, sort_order) values
  (null, 'Transversal', array['tous motifs', 'général']::text[], 'red_flags', '- Fièvre ou altération de l''état général (asthénie, anorexie, amaigrissement) : séance contre-indiquée, réorienter.
- Traumatisme récent avec suspicion de fracture (palpation très douloureuse, diapason positif) : réorienter pour imagerie.
- Déficit neurologique moteur et sensitif, ou d''aggravation rapide : réorienter.
- Douleur thoracique, du bras gauche ou de la mâchoire avec essoufflement ou malaise : urgence.
- Cadre légal : nourrisson de moins de 6 mois sans avis médical, manipulations cervicales structurelles sans certificat médical.', 'Référentiel clinique général', 1),
  (null, 'Transversal', array['tous motifs', 'général']::text[], 'approach', '- Tester avant de traiter : repérer la plus grosse dysfonction, celle que l''on sent le plus sous les mains, et la traiter en priorité.
- Tester en actif puis en passif pour distinguer une limitation musculaire d''une limitation articulaire.
- Noter un mouvement de référence en début de séance et le refaire après chaque étape pour mesurer l''effet.
- Ne pas rester loco-régional : chercher à distance (viscéral, thorax, articulation voisine) ce qui verrouille la zone douloureuse.
- Commencer par le musculaire / tissulaire sur une zone très sensible, puis l''articulaire.', 'Pratique de terrain (ostéopathe pilote, 2026)', 3),
  (null, 'Transversal', array['tous motifs', 'général']::text[], 'if_no_improvement', '- Relire l''anamnèse : un élément négligé (alimentation, stress, respiration, ancien traumatisme) oriente souvent vers une autre zone.
- Test d''inhibition : soulager manuellement une zone à distance (estomac, foie, thorax) puis refaire le mouvement limité ; s''il s''améliore, traiter cette zone d''abord.
- Élargir aux zones liées : thorax pour l''épaule et les cervicales, viscéral pour le rachis, cheville pour le genou.', 'Pratique de terrain (ostéopathe pilote, 2026)', 5),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'key_questions', '- Y a-t-il un trajet électrique qui descend dans la jambe (piste neurologique), des fourmillements (piste vasculaire) ou une sensation de muscle tiré (piste musculaire) ?
- Trajet : face postérieure ou antérieure, jusqu''où, déclenché par un effort ou une flexion ?
- Perte de force, diminution du périmètre de marche ?
- Mouvement déclencheur précis (à reproduire avant / après séance).
- Antécédents dans la zone : hernie discale, fracture, déchirure du carré des lombes ; suivi rhumatologique ?
- Signes viscéraux associés : transit, ballonnements, rythme et qualité des repas ; signes urinaires.', 'Pratique de terrain (ostéopathe pilote, 2026)', 10),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'red_flags', '- Troubles sphinctériens récents, anesthésie en selle, déficit moteur des deux jambes : syndrome de la queue de cheval, urgence.
- Lombalgie unilatérale brutale avec fièvre, brûlures mictionnelles : pyélonéphrite, réorienter en urgence.
- Douleur nocturne inflammatoire, antécédent de cancer, amaigrissement : réorienter.
- Chute récente, sujet âgé ou ostéoporotique avec douleur vertébrale vive : suspicion de fracture.
- Masse abdominale pulsatile, douleur profonde : anévrisme de l''aorte abdominale, urgence.', 'Référentiel clinique général', 11),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'tests', '- Mobilité lombaire dans les 4 mouvements (flexion, extension, rotations, inclinaisons) : mouvement douloureux et vertèbre la moins mobile.
- Si trajet électrique : réflexes rotulien (L4) et achilléen (S1), force (flexion/extension hanche et genou, marche sur pointes et talons), sensibilité comparée gauche/droite, Lasègue.
- Si fourmillements : pouls fémoral, poplité, pédieux comparés.
- Si chute récente : sonnette et diapason sur l''épineuse douloureuse.
- Palpation du psoas, test du bassin, palpation abdominale ; FABER si douleur de hanche associée.', 'Référentiel clinique général', 12),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'approach', '- Déduire du mouvement le plus douloureux le muscle qui le réalise mal ; palper ce muscle (psoas en priorité) et les zones autour (bassin).
- Zone aiguë et très sensible : détente musculaire d''abord (trigger points, massage), puis articulaire (lumbar roll sans forcer la posture), puis tissus contractés autour.
- Traiter la plus grosse dysfonction, relever le patient, refaire les mouvements qui n''allaient pas.', 'Pratique de terrain (ostéopathe pilote, 2026)', 13),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'adaptations', '- Alimentation déséquilibrée, repas pris vite : orientation plus viscérale.
- Sédentaire sans effort particulier : cause moins souvent musculaire ; après un effort ponctuel (déménagement) : muscle tendu.
- Plus de 70 ans ou fragilité osseuse : prudence articulaire, ostéodensitométrie avant tout geste structurel.
- Hernie discale connue : pas de technique articulaire sur l''étage concerné, travail tissulaire et musculaire autour.', 'Pratique de terrain (ostéopathe pilote, 2026)', 14),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'if_no_improvement', '- Explorer le viscéral (côlon, intestin grêle) et le bassin, même sans plainte digestive marquée.
- Vérifier la sacro-iliaque et la hanche ; une cheville ou un genou mal compensé peut entretenir la lombalgie.', 'Pratique de terrain (ostéopathe pilote, 2026)', 15),
  (null, 'Lombalgie', array['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré']::text[], 'advice', '- Se lever toutes les 30 à 45 minutes en position assise.
- Mobilisations lombaires quotidiennes : flexion, extension, rotations, inclinaisons.
- Porter les charges avec les jambes ; s''échauffer avant le sport si zone fragilisée.
- Prendre le temps de manger ; orienter vers un diététicien si surpoids.', 'Pratique de terrain (ostéopathe pilote, 2026)', 16),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'key_questions', '- Localisation, ancienneté, fréquence des épisodes, mouvement qui déclenche.
- Irradiation dans le bras ou la main (quel doigt ?), fourmillements, perte de force.
- Céphalées, migraines, serrage des dents ; vertiges, troubles visuels.
- Rythme et qualité des repas, ballonnements, reflux ; tabac, respiration.
- Traumatisme récent (chute, choc, accident de la route).', 'Pratique de terrain (ostéopathe pilote, 2026)', 20),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'red_flags', '- Traumatisme récent : fracture ou instabilité à éliminer avant tout geste.
- Vertiges, diplopie, troubles de la parole ou de la déglutition, chutes brutales : atteinte vasculaire, urgence.
- Troubles de la marche, maladresse des deux mains : myélopathie, réorienter.
- Fièvre avec raideur de nuque et céphalée : méningite, urgence.
- Douleur irradiant vers la mâchoire et le bras gauche : origine cardiaque possible, urgence.', 'Référentiel clinique général', 21),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'tests', '- Mobilité cervicale (rotations, inclinaisons, flexion, extension) en actif puis en passif ; noter le paramètre le moins mobile.
- Si irradiation : Jackson, compression / décompression, réflexes, force et sensibilité du membre supérieur.
- Tester le crâne et l''occiput, le complexe de l''épaule, la scapula, la dorsale haute et le thorax.', 'Référentiel clinique général', 22),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'approach', '- Torticolis fréquent : détente musculaire d''abord, puis mobilisation progressive dans tous les sens en insistant sur le paramètre limité, sans brusquer.
- Si les cervicales ne cèdent pas : libérer la dorsale haute (technique articulaire de type « dog »).
- Signes viscéraux : test d''inhibition (soulager estomac ou foie, refaire la rotation) ; si amélioration, traiter le viscéral d''abord.', 'Pratique de terrain (ostéopathe pilote, 2026)', 23),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'adaptations', '- Personne âgée : éviter les grands mouvements (ostéoporose).
- Mauvaise alimentation : commencer par le viscéral.
- Migraines : crâne souvent dense, commencer par le crâne.
- Hernie discale cervicale : éviter rotation et extension.', 'Pratique de terrain (ostéopathe pilote, 2026)', 24),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'if_no_improvement', '- Relire l''anamnèse : alimentation rapide ou déséquilibrée oriente vers estomac, côlon, intestin grêle.
- Explorer thorax et respiration, notamment chez le fumeur ou le patient stressé.', 'Pratique de terrain (ostéopathe pilote, 2026)', 25),
  (null, 'Cervicalgie', array['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales']::text[], 'advice', '- Mobilisations cervicales douces et régulières.
- Pauses écran, réglage du poste de travail.
- Manger plus lentement si signes digestifs.', 'Pratique de terrain (ostéopathe pilote, 2026)', 26),
  (null, 'Dorsalgie', array['dorsalgie', 'dorsal', 'interscapulaire', 'omoplates', 'thoracique haut', 'haut du dos']::text[], 'key_questions', '- Localisation précise, événement déclencheur, position qui soulage ou aggrave.
- Palpitations, essoufflement, douleur dans la poitrine, malaise.
- Brûlures d''estomac, reflux, difficulté à digérer les graisses.', 'Référentiel clinique général', 30),
  (null, 'Dorsalgie', array['dorsalgie', 'dorsal', 'interscapulaire', 'omoplates', 'thoracique haut', 'haut du dos']::text[], 'red_flags', '- Douleur brutale et intense, essoufflement, malaise : dissection aortique, embolie pulmonaire, pneumothorax, infarctus, urgence.
- Douleur transfixiante nocturne, raideur matinale, amaigrissement : réorienter.
- Éruption sur un trajet costal : zona.', 'Référentiel clinique général', 31),
  (null, 'Dorsalgie', array['dorsalgie', 'dorsal', 'interscapulaire', 'omoplates', 'thoracique haut', 'haut du dos']::text[], 'tests', '- Mobilité thoracique en actif puis passif, côtes associées, sonnette et diapason si chute.
- Palpation abdominale haute (estomac, foie, vésicule) si signes digestifs.', 'Référentiel clinique général', 32),
  (null, 'Dorsalgie', array['dorsalgie', 'dorsal', 'interscapulaire', 'omoplates', 'thoracique haut', 'haut du dos']::text[], 'approach', '- Même logique que la cervicalgie : tester les mouvements, faire le tour de la zone, libérer les dorsales et les côtes associées.', 'Pratique de terrain (ostéopathe pilote, 2026)', 33),
  (null, 'Dorsalgie', array['dorsalgie', 'dorsal', 'interscapulaire', 'omoplates', 'thoracique haut', 'haut du dos']::text[], 'if_no_improvement', '- Explorer le viscéral sus-mésocolique (estomac, foie, vésicule) et le diaphragme.', 'Pratique de terrain (ostéopathe pilote, 2026)', 35),
  (null, 'Épaule', array['épaule', 'omalgie', 'tendinite', 'tendinopathie', 'coiffe', 'scapula', 'bras']::text[], 'key_questions', '- Mouvements limités, ancienneté, chute ou événement déclencheur.
- Diagnostic posé (tendinopathie, échographie) ? Suivi kiné en cours ?
- Stress, respiration, migraines, palpitations (lien thoracique).', 'Pratique de terrain (ostéopathe pilote, 2026)', 40),
  (null, 'Épaule', array['épaule', 'omalgie', 'tendinite', 'tendinopathie', 'coiffe', 'scapula', 'bras']::text[], 'red_flags', '- Douleur d''épaule gauche avec essoufflement ou oppression : origine cardiaque, urgence.
- Chute avec impotence, déformation : fracture ou luxation, imagerie.
- Épaule chaude, rouge, fièvre : infection, réorienter.', 'Référentiel clinique général', 41),
  (null, 'Épaule', array['épaule', 'omalgie', 'tendinite', 'tendinopathie', 'coiffe', 'scapula', 'bras']::text[], 'tests', '- Antéflexion, rétropulsion, abduction, adduction, rotations en passif puis actif, comparés au côté sain.
- Articulation par articulation : gléno-humérale, acromio-claviculaire, sterno-claviculaire, scapulo-thoracique.
- Mobilité thoracique et costale du même côté, cervicales.', 'Référentiel clinique général', 42),
  (null, 'Épaule', array['épaule', 'omalgie', 'tendinite', 'tendinopathie', 'coiffe', 'scapula', 'bras']::text[], 'approach', '- Tendinopathie (inflammation) : éviter le travail musculaire profond sur le tendon, privilégier la détente.
- Si suivi kiné : libérer tout le pourtour (thorax, clavicule, coude, poignet, cervicales) pour que la zone cicatrise et que le kiné travaille sur une zone libre.
- Regarder systématiquement le thorax : un thorax bloqué du même côté peut verrouiller l''épaule via le fascia endothoracique.', 'Pratique de terrain (ostéopathe pilote, 2026)', 43),
  (null, 'Épaule', array['épaule', 'omalgie', 'tendinite', 'tendinopathie', 'coiffe', 'scapula', 'bras']::text[], 'if_no_improvement', '- Après 15-20 minutes sans gain sur l''épaule : prendre du recul et travailler le thorax (respiration, côtes, vertèbres associées).', 'Pratique de terrain (ostéopathe pilote, 2026)', 45),
  (null, 'Genou', array['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé']::text[], 'key_questions', '- Traumatisme : mécanisme (choc direct, torsion), gonflement immédiat, blocage, instabilité, craquement.
- Chirurgie récente du genou ; antécédents de cheville.
- Genou chaud, rouge, douleur nocturne, varices.', 'Référentiel clinique général', 50),
  (null, 'Genou', array['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé']::text[], 'red_flags', '- Impossibilité d''appui, douleur osseuse localisée après traumatisme : fracture (règles d''Ottawa du genou).
- Mollet douloureux, chaud, gonflé : phlébite, réorienter en urgence.
- Genou chaud et rouge avec fièvre : arthrite septique, urgence.', 'Référentiel clinique général', 51),
  (null, 'Genou', array['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé']::text[], 'tests', '- Flexion / extension en actif puis passif.
- Après traumatisme : tests méniscaux (McMurray, Thessaly), ligamentaires (tiroirs, valgus/varus), rotule.
- Tibia et fibula en antéro-postérieur, rotations du tibia ; cheville des deux côtés.', 'Référentiel clinique général', 52),
  (null, 'Genou', array['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé']::text[], 'approach', '- Genou gonflé post-traumatique : pompage au creux poplité pour drainer, puis accès aux articulations et traitement des dysfonctions.
- Traiter la cheville d''abord si elle est en dysfonction, puis refaire marcher le patient.', 'Pratique de terrain (ostéopathe pilote, 2026)', 53),
  (null, 'Genou', array['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé']::text[], 'adaptations', '- Opération récente : grande prudence en flexion / extension, surtout détente tissulaire.', 'Pratique de terrain (ostéopathe pilote, 2026)', 54),
  (null, 'Genou', array['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé']::text[], 'if_no_improvement', '- Si les tests du genou sont négatifs : investiguer hanche, fibula, cheville, pied, bassin et lombaires.', 'Référentiel clinique général', 55),
  (null, 'Cheville', array['cheville', 'entorse', 'pied', 'talon', 'achille']::text[], 'key_questions', '- Mécanisme (inversion, éversion), gonflement, hématome, appui possible.
- Entorses à répétition, sport pratiqué, chaussage, semelles.', 'Référentiel clinique général', 60),
  (null, 'Cheville', array['cheville', 'entorse', 'pied', 'talon', 'achille']::text[], 'red_flags', '- Appui impossible, douleur osseuse des malléoles ou du 5e métatarsien : fracture (règles d''Ottawa de la cheville).
- Mollet douloureux et gonflé : phlébite.', 'Référentiel clinique général', 61),
  (null, 'Cheville', array['cheville', 'entorse', 'pied', 'talon', 'achille']::text[], 'tests', '- Faire marcher le patient et observer.
- Flexion dorsale / plantaire, inversion / éversion, en actif puis passif : la perte de mobilité indique le mouvement et l''articulation à travailler.', 'Pratique de terrain (ostéopathe pilote, 2026)', 62),
  (null, 'Cheville', array['cheville', 'entorse', 'pied', 'talon', 'achille']::text[], 'adaptations', '- Antécédent d''entorse ou ligaments lésés : prudence en inversion / éversion.
- Sédentaire : récupérer la mobilité ; sportif soumis aux impacts : techniques de décompression.', 'Pratique de terrain (ostéopathe pilote, 2026)', 64),
  (null, 'Sacro-iliaque', array['sacro-iliaque', 'bassin', 'sacrum', 'fessier', 'glutéal', 'iliaque']::text[], 'red_flags', '- Douleur fessière nocturne avec raideur matinale prolongée chez l''adulte jeune : spondyloarthrite, réorienter.', 'Référentiel clinique général', 71),
  (null, 'Sacro-iliaque', array['sacro-iliaque', 'bassin', 'sacrum', 'fessier', 'glutéal', 'iliaque']::text[], 'tests', '- Flexion / extension de hanche en actif puis passif (musculaire ou articulaire).
- Articulation par articulation : sacrum, iliaques en antérieur / postérieur, lombaires basses en remontant.', 'Pratique de terrain (ostéopathe pilote, 2026)', 72),
  (null, 'Sacro-iliaque', array['sacro-iliaque', 'bassin', 'sacrum', 'fessier', 'glutéal', 'iliaque']::text[], 'approach', '- Articulation qui se comprime : décompressions, mobilisations de l''iliaque, pompages du sacrum.', 'Pratique de terrain (ostéopathe pilote, 2026)', 73),
  (null, 'Sacro-iliaque', array['sacro-iliaque', 'bassin', 'sacrum', 'fessier', 'glutéal', 'iliaque']::text[], 'adaptations', '- Sédentaire : douleur liée à l''immobilité et aux mauvaises positions ; sportif : tension musculaire élevée.', 'Pratique de terrain (ostéopathe pilote, 2026)', 74),
  (null, 'Sacro-iliaque', array['sacro-iliaque', 'bassin', 'sacrum', 'fessier', 'glutéal', 'iliaque']::text[], 'if_no_improvement', '- Tension résiduelle : traiter intestin grêle et côlon, qui peuvent libérer la sacro-iliaque.', 'Pratique de terrain (ostéopathe pilote, 2026)', 75),
  (null, 'Céphalées', array['céphalée', 'migraine', 'mal de tête', 'tête', 'crâne', 'mâchoire', 'bruxisme']::text[], 'key_questions', '- Localisation, fréquence, déclencheurs, suivi médical, examens, traitement et effet.
- Serrage des dents, lunettes, écrans, sommeil, stress.', 'Pratique de terrain (ostéopathe pilote, 2026)', 80),
  (null, 'Céphalées', array['céphalée', 'migraine', 'mal de tête', 'tête', 'crâne', 'mâchoire', 'bruxisme']::text[], 'red_flags', '- Céphalée brutale et intense inhabituelle (« coup de tonnerre ») : urgence.
- Fièvre avec raideur de nuque : méningite, urgence.
- Céphalée récente après 50 ans avec douleur au peigne ou à la mastication : maladie de Horton, réorienter.
- Déficit neurologique, troubles visuels persistants : réorienter.', 'Référentiel clinique général', 81),
  (null, 'Céphalées', array['céphalée', 'migraine', 'mal de tête', 'tête', 'crâne', 'mâchoire', 'bruxisme']::text[], 'tests', '- Tester le crâne (souvent dense et tendu) et la mâchoire ; cervicales hautes et occiput.', 'Pratique de terrain (ostéopathe pilote, 2026)', 82),
  (null, 'Céphalées', array['céphalée', 'migraine', 'mal de tête', 'tête', 'crâne', 'mâchoire', 'bruxisme']::text[], 'approach', '- Détendre l''ensemble des muscles et fascias du crâne, du front, des yeux et de la mâchoire.', 'Pratique de terrain (ostéopathe pilote, 2026)', 83),
  (null, 'Troubles digestifs', array['digestif', 'ballonnement', 'constipation', 'reflux', 'estomac', 'ventre', 'abdominal', 'transit', 'viscéral']::text[], 'key_questions', '- Moment d''apparition (avant / après les repas), ancienneté, aliments déclencheurs.
- Diagnostic médical, examens réalisés (fibroscopie, coloscopie).', 'Pratique de terrain (ostéopathe pilote, 2026)', 90),
  (null, 'Troubles digestifs', array['digestif', 'ballonnement', 'constipation', 'reflux', 'estomac', 'ventre', 'abdominal', 'transit', 'viscéral']::text[], 'red_flags', '- Sang dans les selles, vomissements de sang, amaigrissement, anémie : réorienter.
- Douleur abdominale aiguë avec fièvre ou défense : urgence chirurgicale possible.
- Changement récent du transit après 50 ans : réorienter pour bilan.', 'Référentiel clinique général', 91),
  (null, 'Troubles digestifs', array['digestif', 'ballonnement', 'constipation', 'reflux', 'estomac', 'ventre', 'abdominal', 'transit', 'viscéral']::text[], 'tests', '- Tester les viscères un par un et leurs attaches.', 'Pratique de terrain (ostéopathe pilote, 2026)', 92),
  (null, 'Troubles digestifs', array['digestif', 'ballonnement', 'constipation', 'reflux', 'estomac', 'ventre', 'abdominal', 'transit', 'viscéral']::text[], 'advice', '- Manger plus lentement ; tester l''éviction gluten ou lactose en l''absence de diagnostic ; automassages du ventre si soulagement.', 'Pratique de terrain (ostéopathe pilote, 2026)', 96),
  (null, 'Douleur costale', array['côte', 'costal', 'intercostal', 'thorax', 'respiration']::text[], 'key_questions', '- Quand ça fait mal : port de charge, éternuement, toux ? À l''inspiration ou à l''expiration ?
- Chute ou choc récent.', 'Pratique de terrain (ostéopathe pilote, 2026)', 100),
  (null, 'Douleur costale', array['côte', 'costal', 'intercostal', 'thorax', 'respiration']::text[], 'red_flags', '- Essoufflement, douleur thoracique brutale, crachats de sang : urgence pulmonaire.
- Choc avec douleur vive localisée : fracture de côte.
- Éruption sur le trajet : zona.', 'Référentiel clinique général', 101),
  (null, 'Douleur costale', array['côte', 'costal', 'intercostal', 'thorax', 'respiration']::text[], 'approach', '- Douleur à la compression sur le trajet de la côte : piste dorsale ; libérer la dorsale liée puis les intercostaux.', 'Pratique de terrain (ostéopathe pilote, 2026)', 103),
  (null, 'Douleur costale', array['côte', 'costal', 'intercostal', 'thorax', 'respiration']::text[], 'adaptations', '- Personne âgée : côtes fragiles, techniques douces uniquement.', 'Pratique de terrain (ostéopathe pilote, 2026)', 104),
  (null, 'Hernie discale', array['hernie', 'discale', 'disque', 'protrusion']::text[], 'red_flags', '- Déficit moteur progressif, troubles sphinctériens : urgence chirurgicale possible.', 'Référentiel clinique général', 111),
  (null, 'Hernie discale', array['hernie', 'discale', 'disque', 'protrusion']::text[], 'approach', '- Pas de technique articulaire sur l''étage de la hernie ; travail tissulaire et musculaire autour pour soulager et favoriser la cicatrisation.', 'Pratique de terrain (ostéopathe pilote, 2026)', 113),
  (null, 'Hernie discale', array['hernie', 'discale', 'disque', 'protrusion']::text[], 'advice', '- La hernie se résorbe en 3 mois à quelques années : s''hydrater, bien s''échauffer, ne pas avoir peur de bouger.', 'Pratique de terrain (ostéopathe pilote, 2026)', 116),
  (null, 'Bilan sans douleur', array['bilan', 'prévention', 'entretien', 'sans douleur']::text[], 'key_questions', '- Chercher la gêne banalisée : moment de la journée inconfortable, courbatures récurrentes, maux de ventre ou de tête réguliers.', 'Pratique de terrain (ostéopathe pilote, 2026)', 120),
  (null, 'Bilan sans douleur', array['bilan', 'prévention', 'entretien', 'sans douleur']::text[], 'approach', '- Des courbatures trop fréquentes peuvent venir d''une dysfonction articulaire voisine (ex. hanche pour le quadriceps).', 'Pratique de terrain (ostéopathe pilote, 2026)', 123);
