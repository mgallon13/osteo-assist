"""
Référentiel de pratiques de départ (global, tous cabinets).

Sources :
- FIELD : pratique de terrain recueillie lors de deux entretiens avec un ostéopathe
  pilote (sept. 2026), reformulée pour être utilisable par tout praticien.
- GENERAL : signes d'alerte et tests classiques de l'examen clinique, reformulés
  (connaissances générales, pas de reprise de supports de cours).

Toutes les fiches sont marquées validated = false : elles doivent être relues par
un référent clinique avant mise en production.

Génère supabase/seed_reference.sql :  python3 supabase/reference/cards.py
"""
from pathlib import Path

FIELD = 'Pratique de terrain (ostéopathe pilote, 2026)'
GENERAL = 'Référentiel clinique général'

# Sections : key_questions, red_flags, tests, approach, adaptations, if_no_improvement, advice
CARDS = {
    'Transversal': {
        'keywords': ['tous motifs', 'général'],
        'approach': (FIELD, [
            "Tester avant de traiter : repérer la plus grosse dysfonction, celle que l'on sent le plus sous les mains, et la traiter en priorité.",
            "Tester en actif puis en passif pour distinguer une limitation musculaire d'une limitation articulaire.",
            "Noter un mouvement de référence en début de séance et le refaire après chaque étape pour mesurer l'effet.",
            "Ne pas rester loco-régional : chercher à distance (viscéral, thorax, articulation voisine) ce qui verrouille la zone douloureuse.",
            "Commencer par le musculaire / tissulaire sur une zone très sensible, puis l'articulaire.",
        ]),
        'if_no_improvement': (FIELD, [
            "Relire l'anamnèse : un élément négligé (alimentation, stress, respiration, ancien traumatisme) oriente souvent vers une autre zone.",
            "Test d'inhibition : soulager manuellement une zone à distance (estomac, foie, thorax) puis refaire le mouvement limité ; s'il s'améliore, traiter cette zone d'abord.",
            "Élargir aux zones liées : thorax pour l'épaule et les cervicales, viscéral pour le rachis, cheville pour le genou.",
        ]),
        'red_flags': (GENERAL, [
            "Fièvre ou altération de l'état général (asthénie, anorexie, amaigrissement) : séance contre-indiquée, réorienter.",
            "Traumatisme récent avec suspicion de fracture (palpation très douloureuse, diapason positif) : réorienter pour imagerie.",
            "Déficit neurologique moteur et sensitif, ou d'aggravation rapide : réorienter.",
            "Douleur thoracique, du bras gauche ou de la mâchoire avec essoufflement ou malaise : urgence.",
            "Cadre légal : nourrisson de moins de 6 mois sans avis médical, manipulations cervicales structurelles sans certificat médical.",
        ]),
    },
    'Lombalgie': {
        'keywords': ['lombalgie', 'lombaire', 'lumbago', 'mal de dos', 'bas du dos', 'sciatique', 'cruralgie', 'lombo-sacré'],
        'key_questions': (FIELD, [
            "Y a-t-il un trajet électrique qui descend dans la jambe (piste neurologique), des fourmillements (piste vasculaire) ou une sensation de muscle tiré (piste musculaire) ?",
            "Trajet : face postérieure ou antérieure, jusqu'où, déclenché par un effort ou une flexion ?",
            "Perte de force, diminution du périmètre de marche ?",
            "Mouvement déclencheur précis (à reproduire avant / après séance).",
            "Antécédents dans la zone : hernie discale, fracture, déchirure du carré des lombes ; suivi rhumatologique ?",
            "Signes viscéraux associés : transit, ballonnements, rythme et qualité des repas ; signes urinaires.",
        ]),
        'red_flags': (GENERAL, [
            "Troubles sphinctériens récents, anesthésie en selle, déficit moteur des deux jambes : syndrome de la queue de cheval, urgence.",
            "Lombalgie unilatérale brutale avec fièvre, brûlures mictionnelles : pyélonéphrite, réorienter en urgence.",
            "Douleur nocturne inflammatoire, antécédent de cancer, amaigrissement : réorienter.",
            "Chute récente, sujet âgé ou ostéoporotique avec douleur vertébrale vive : suspicion de fracture.",
            "Masse abdominale pulsatile, douleur profonde : anévrisme de l'aorte abdominale, urgence.",
        ]),
        'tests': (GENERAL, [
            "Mobilité lombaire dans les 4 mouvements (flexion, extension, rotations, inclinaisons) : mouvement douloureux et vertèbre la moins mobile.",
            "Si trajet électrique : réflexes rotulien (L4) et achilléen (S1), force (flexion/extension hanche et genou, marche sur pointes et talons), sensibilité comparée gauche/droite, Lasègue.",
            "Si fourmillements : pouls fémoral, poplité, pédieux comparés.",
            "Si chute récente : sonnette et diapason sur l'épineuse douloureuse.",
            "Palpation du psoas, test du bassin, palpation abdominale ; FABER si douleur de hanche associée.",
        ]),
        'approach': (FIELD, [
            "Déduire du mouvement le plus douloureux le muscle qui le réalise mal ; palper ce muscle (psoas en priorité) et les zones autour (bassin).",
            "Zone aiguë et très sensible : détente musculaire d'abord (trigger points, massage), puis articulaire (lumbar roll sans forcer la posture), puis tissus contractés autour.",
            "Traiter la plus grosse dysfonction, relever le patient, refaire les mouvements qui n'allaient pas.",
        ]),
        'adaptations': (FIELD, [
            "Alimentation déséquilibrée, repas pris vite : orientation plus viscérale.",
            "Sédentaire sans effort particulier : cause moins souvent musculaire ; après un effort ponctuel (déménagement) : muscle tendu.",
            "Plus de 70 ans ou fragilité osseuse : prudence articulaire, ostéodensitométrie avant tout geste structurel.",
            "Hernie discale connue : pas de technique articulaire sur l'étage concerné, travail tissulaire et musculaire autour.",
        ]),
        'if_no_improvement': (FIELD, [
            "Explorer le viscéral (côlon, intestin grêle) et le bassin, même sans plainte digestive marquée.",
            "Vérifier la sacro-iliaque et la hanche ; une cheville ou un genou mal compensé peut entretenir la lombalgie.",
        ]),
        'advice': (FIELD, [
            "Se lever toutes les 30 à 45 minutes en position assise.",
            "Mobilisations lombaires quotidiennes : flexion, extension, rotations, inclinaisons.",
            "Porter les charges avec les jambes ; s'échauffer avant le sport si zone fragilisée.",
            "Prendre le temps de manger ; orienter vers un diététicien si surpoids.",
        ]),
    },
    'Cervicalgie': {
        'keywords': ['cervicalgie', 'cervical', 'cou', 'nuque', 'torticolis', 'cervicales'],
        'key_questions': (FIELD, [
            "Localisation, ancienneté, fréquence des épisodes, mouvement qui déclenche.",
            "Irradiation dans le bras ou la main (quel doigt ?), fourmillements, perte de force.",
            "Céphalées, migraines, serrage des dents ; vertiges, troubles visuels.",
            "Rythme et qualité des repas, ballonnements, reflux ; tabac, respiration.",
            "Traumatisme récent (chute, choc, accident de la route).",
        ]),
        'red_flags': (GENERAL, [
            "Traumatisme récent : fracture ou instabilité à éliminer avant tout geste.",
            "Vertiges, diplopie, troubles de la parole ou de la déglutition, chutes brutales : atteinte vasculaire, urgence.",
            "Troubles de la marche, maladresse des deux mains : myélopathie, réorienter.",
            "Fièvre avec raideur de nuque et céphalée : méningite, urgence.",
            "Douleur irradiant vers la mâchoire et le bras gauche : origine cardiaque possible, urgence.",
        ]),
        'tests': (GENERAL, [
            "Mobilité cervicale (rotations, inclinaisons, flexion, extension) en actif puis en passif ; noter le paramètre le moins mobile.",
            "Si irradiation : Jackson, compression / décompression, réflexes, force et sensibilité du membre supérieur.",
            "Tester le crâne et l'occiput, le complexe de l'épaule, la scapula, la dorsale haute et le thorax.",
        ]),
        'approach': (FIELD, [
            "Torticolis fréquent : détente musculaire d'abord, puis mobilisation progressive dans tous les sens en insistant sur le paramètre limité, sans brusquer.",
            "Si les cervicales ne cèdent pas : libérer la dorsale haute (technique articulaire de type « dog »).",
            "Signes viscéraux : test d'inhibition (soulager estomac ou foie, refaire la rotation) ; si amélioration, traiter le viscéral d'abord.",
        ]),
        'adaptations': (FIELD, [
            "Personne âgée : éviter les grands mouvements (ostéoporose).",
            "Mauvaise alimentation : commencer par le viscéral.",
            "Migraines : crâne souvent dense, commencer par le crâne.",
            "Hernie discale cervicale : éviter rotation et extension.",
        ]),
        'if_no_improvement': (FIELD, [
            "Relire l'anamnèse : alimentation rapide ou déséquilibrée oriente vers estomac, côlon, intestin grêle.",
            "Explorer thorax et respiration, notamment chez le fumeur ou le patient stressé.",
        ]),
        'advice': (FIELD, [
            "Mobilisations cervicales douces et régulières.",
            "Pauses écran, réglage du poste de travail.",
            "Manger plus lentement si signes digestifs.",
        ]),
    },
    'Dorsalgie': {
        'keywords': ['dorsalgie', 'dorsal', 'interscapulaire', 'omoplates', 'thoracique haut', 'haut du dos'],
        'key_questions': (GENERAL, [
            "Localisation précise, événement déclencheur, position qui soulage ou aggrave.",
            "Palpitations, essoufflement, douleur dans la poitrine, malaise.",
            "Brûlures d'estomac, reflux, difficulté à digérer les graisses.",
        ]),
        'red_flags': (GENERAL, [
            "Douleur brutale et intense, essoufflement, malaise : dissection aortique, embolie pulmonaire, pneumothorax, infarctus, urgence.",
            "Douleur transfixiante nocturne, raideur matinale, amaigrissement : réorienter.",
            "Éruption sur un trajet costal : zona.",
        ]),
        'tests': (GENERAL, [
            "Mobilité thoracique en actif puis passif, côtes associées, sonnette et diapason si chute.",
            "Palpation abdominale haute (estomac, foie, vésicule) si signes digestifs.",
        ]),
        'approach': (FIELD, [
            "Même logique que la cervicalgie : tester les mouvements, faire le tour de la zone, libérer les dorsales et les côtes associées.",
        ]),
        'if_no_improvement': (FIELD, [
            "Explorer le viscéral sus-mésocolique (estomac, foie, vésicule) et le diaphragme.",
        ]),
    },
    'Épaule': {
        'keywords': ['épaule', 'omalgie', 'tendinite', 'tendinopathie', 'coiffe', 'scapula', 'bras'],
        'key_questions': (FIELD, [
            "Mouvements limités, ancienneté, chute ou événement déclencheur.",
            "Diagnostic posé (tendinopathie, échographie) ? Suivi kiné en cours ?",
            "Stress, respiration, migraines, palpitations (lien thoracique).",
        ]),
        'red_flags': (GENERAL, [
            "Douleur d'épaule gauche avec essoufflement ou oppression : origine cardiaque, urgence.",
            "Chute avec impotence, déformation : fracture ou luxation, imagerie.",
            "Épaule chaude, rouge, fièvre : infection, réorienter.",
        ]),
        'tests': (GENERAL, [
            "Antéflexion, rétropulsion, abduction, adduction, rotations en passif puis actif, comparés au côté sain.",
            "Articulation par articulation : gléno-humérale, acromio-claviculaire, sterno-claviculaire, scapulo-thoracique.",
            "Mobilité thoracique et costale du même côté, cervicales.",
        ]),
        'approach': (FIELD, [
            "Tendinopathie (inflammation) : éviter le travail musculaire profond sur le tendon, privilégier la détente.",
            "Si suivi kiné : libérer tout le pourtour (thorax, clavicule, coude, poignet, cervicales) pour que la zone cicatrise et que le kiné travaille sur une zone libre.",
            "Regarder systématiquement le thorax : un thorax bloqué du même côté peut verrouiller l'épaule via le fascia endothoracique.",
        ]),
        'if_no_improvement': (FIELD, [
            "Après 15-20 minutes sans gain sur l'épaule : prendre du recul et travailler le thorax (respiration, côtes, vertèbres associées).",
        ]),
    },
    'Genou': {
        'keywords': ['genou', 'gonalgie', 'rotule', 'ménisque', 'ligament croisé'],
        'key_questions': (GENERAL, [
            "Traumatisme : mécanisme (choc direct, torsion), gonflement immédiat, blocage, instabilité, craquement.",
            "Chirurgie récente du genou ; antécédents de cheville.",
            "Genou chaud, rouge, douleur nocturne, varices.",
        ]),
        'red_flags': (GENERAL, [
            "Impossibilité d'appui, douleur osseuse localisée après traumatisme : fracture (règles d'Ottawa du genou).",
            "Mollet douloureux, chaud, gonflé : phlébite, réorienter en urgence.",
            "Genou chaud et rouge avec fièvre : arthrite septique, urgence.",
        ]),
        'tests': (GENERAL, [
            "Flexion / extension en actif puis passif.",
            "Après traumatisme : tests méniscaux (McMurray, Thessaly), ligamentaires (tiroirs, valgus/varus), rotule.",
            "Tibia et fibula en antéro-postérieur, rotations du tibia ; cheville des deux côtés.",
        ]),
        'approach': (FIELD, [
            "Genou gonflé post-traumatique : pompage au creux poplité pour drainer, puis accès aux articulations et traitement des dysfonctions.",
            "Traiter la cheville d'abord si elle est en dysfonction, puis refaire marcher le patient.",
        ]),
        'adaptations': (FIELD, [
            "Opération récente : grande prudence en flexion / extension, surtout détente tissulaire.",
        ]),
        'if_no_improvement': (GENERAL, [
            "Si les tests du genou sont négatifs : investiguer hanche, fibula, cheville, pied, bassin et lombaires.",
        ]),
    },
    'Cheville': {
        'keywords': ['cheville', 'entorse', 'pied', 'talon', 'achille'],
        'key_questions': (GENERAL, [
            "Mécanisme (inversion, éversion), gonflement, hématome, appui possible.",
            "Entorses à répétition, sport pratiqué, chaussage, semelles.",
        ]),
        'red_flags': (GENERAL, [
            "Appui impossible, douleur osseuse des malléoles ou du 5e métatarsien : fracture (règles d'Ottawa de la cheville).",
            "Mollet douloureux et gonflé : phlébite.",
        ]),
        'tests': (FIELD, [
            "Faire marcher le patient et observer.",
            "Flexion dorsale / plantaire, inversion / éversion, en actif puis passif : la perte de mobilité indique le mouvement et l'articulation à travailler.",
        ]),
        'adaptations': (FIELD, [
            "Antécédent d'entorse ou ligaments lésés : prudence en inversion / éversion.",
            "Sédentaire : récupérer la mobilité ; sportif soumis aux impacts : techniques de décompression.",
        ]),
    },
    'Sacro-iliaque': {
        'keywords': ['sacro-iliaque', 'bassin', 'sacrum', 'fessier', 'glutéal', 'iliaque'],
        'tests': (FIELD, [
            "Flexion / extension de hanche en actif puis passif (musculaire ou articulaire).",
            "Articulation par articulation : sacrum, iliaques en antérieur / postérieur, lombaires basses en remontant.",
        ]),
        'approach': (FIELD, [
            "Articulation qui se comprime : décompressions, mobilisations de l'iliaque, pompages du sacrum.",
        ]),
        'adaptations': (FIELD, [
            "Sédentaire : douleur liée à l'immobilité et aux mauvaises positions ; sportif : tension musculaire élevée.",
        ]),
        'if_no_improvement': (FIELD, [
            "Tension résiduelle : traiter intestin grêle et côlon, qui peuvent libérer la sacro-iliaque.",
        ]),
        'red_flags': (GENERAL, [
            "Douleur fessière nocturne avec raideur matinale prolongée chez l'adulte jeune : spondyloarthrite, réorienter.",
        ]),
    },
    'Céphalées': {
        'keywords': ['céphalée', 'migraine', 'mal de tête', 'tête', 'crâne', 'mâchoire', 'bruxisme'],
        'key_questions': (FIELD, [
            "Localisation, fréquence, déclencheurs, suivi médical, examens, traitement et effet.",
            "Serrage des dents, lunettes, écrans, sommeil, stress.",
        ]),
        'red_flags': (GENERAL, [
            "Céphalée brutale et intense inhabituelle (« coup de tonnerre ») : urgence.",
            "Fièvre avec raideur de nuque : méningite, urgence.",
            "Céphalée récente après 50 ans avec douleur au peigne ou à la mastication : maladie de Horton, réorienter.",
            "Déficit neurologique, troubles visuels persistants : réorienter.",
        ]),
        'tests': (FIELD, [
            "Tester le crâne (souvent dense et tendu) et la mâchoire ; cervicales hautes et occiput.",
        ]),
        'approach': (FIELD, [
            "Détendre l'ensemble des muscles et fascias du crâne, du front, des yeux et de la mâchoire.",
        ]),
    },
    'Troubles digestifs': {
        'keywords': ['digestif', 'ballonnement', 'constipation', 'reflux', 'estomac', 'ventre', 'abdominal', 'transit', 'viscéral'],
        'key_questions': (FIELD, [
            "Moment d'apparition (avant / après les repas), ancienneté, aliments déclencheurs.",
            "Diagnostic médical, examens réalisés (fibroscopie, coloscopie).",
        ]),
        'red_flags': (GENERAL, [
            "Sang dans les selles, vomissements de sang, amaigrissement, anémie : réorienter.",
            "Douleur abdominale aiguë avec fièvre ou défense : urgence chirurgicale possible.",
            "Changement récent du transit après 50 ans : réorienter pour bilan.",
        ]),
        'tests': (FIELD, [
            "Tester les viscères un par un et leurs attaches.",
        ]),
        'advice': (FIELD, [
            "Manger plus lentement ; tester l'éviction gluten ou lactose en l'absence de diagnostic ; automassages du ventre si soulagement.",
        ]),
    },
    'Douleur costale': {
        'keywords': ['côte', 'costal', 'intercostal', 'thorax', 'respiration'],
        'key_questions': (FIELD, [
            "Quand ça fait mal : port de charge, éternuement, toux ? À l'inspiration ou à l'expiration ?",
            "Chute ou choc récent.",
        ]),
        'red_flags': (GENERAL, [
            "Essoufflement, douleur thoracique brutale, crachats de sang : urgence pulmonaire.",
            "Choc avec douleur vive localisée : fracture de côte.",
            "Éruption sur le trajet : zona.",
        ]),
        'approach': (FIELD, [
            "Douleur à la compression sur le trajet de la côte : piste dorsale ; libérer la dorsale liée puis les intercostaux.",
        ]),
        'adaptations': (FIELD, [
            "Personne âgée : côtes fragiles, techniques douces uniquement.",
        ]),
    },
    'Hernie discale': {
        'keywords': ['hernie', 'discale', 'disque', 'protrusion'],
        'approach': (FIELD, [
            "Pas de technique articulaire sur l'étage de la hernie ; travail tissulaire et musculaire autour pour soulager et favoriser la cicatrisation.",
        ]),
        'advice': (FIELD, [
            "La hernie se résorbe en 3 mois à quelques années : s'hydrater, bien s'échauffer, ne pas avoir peur de bouger.",
        ]),
        'red_flags': (GENERAL, [
            "Déficit moteur progressif, troubles sphinctériens : urgence chirurgicale possible.",
        ]),
    },
    'Bilan sans douleur': {
        'keywords': ['bilan', 'prévention', 'entretien', 'sans douleur'],
        'key_questions': (FIELD, [
            "Chercher la gêne banalisée : moment de la journée inconfortable, courbatures récurrentes, maux de ventre ou de tête réguliers.",
        ]),
        'approach': (FIELD, [
            "Des courbatures trop fréquentes peuvent venir d'une dysfonction articulaire voisine (ex. hanche pour le quadriceps).",
        ]),
    },
}

SECTION_ORDER = ['key_questions', 'red_flags', 'tests', 'approach', 'adaptations', 'if_no_improvement', 'advice']


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def main():
    lines = [
        '-- Généré par supabase/reference/cards.py — ne pas modifier à la main.',
        '-- Référentiel de pratiques de départ (global). validated = false : à relire cliniquement.',
        'delete from public.reference_cards where organization_id is null;',
        'insert into public.reference_cards (organization_id, motif, keywords, section, content, source_label, sort_order) values',
    ]
    rows = []
    for m_i, (motif, card) in enumerate(CARDS.items()):
        kw = 'array[' + ', '.join(sql_str(k) for k in card['keywords']) + ']::text[]'
        for s_i, section in enumerate(SECTION_ORDER):
            if section not in card:
                continue
            source, items = card[section]
            content = '\n'.join(f'- {x}' for x in items)
            rows.append(f"  (null, {sql_str(motif)}, {kw}, '{section}', {sql_str(content)}, {sql_str(source)}, {m_i * 10 + s_i})")
    lines.append(',\n'.join(rows) + ';')
    out = Path(__file__).resolve().parents[1] / 'seed_reference.sql'
    out.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'{len(rows)} sections, {len(CARDS)} motifs -> {out}')


if __name__ == '__main__':
    main()
