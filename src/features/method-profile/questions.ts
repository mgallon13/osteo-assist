/**
 * Interview de méthode — version 2.
 * Construite à partir des deux entretiens avec un ostéopathe pilote (sept. 2026) :
 * trame d'anamnèse, registres d'intervention, logique de test, vocabulaire, ton.
 *
 * PÉRIMÈTRE : ces réponses servent UNIQUEMENT à rédiger les comptes rendus dans
 * la structure et le vocabulaire du praticien, et à préparer ses messages.
 * Elles ne servent jamais à suggérer un test, une technique ou une conduite à
 * tenir pour un patient donné (cf. docs/usage-prevu.md).
 *
 * Toute modification des questions doit incrémenter QUESTIONNAIRE_VERSION.
 */
export const QUESTIONNAIRE_VERSION = 2

export type Question =
  | { id: string; type: 'single'; label: string; help?: string; options: string[] }
  | { id: string; type: 'multi'; label: string; help?: string; options: string[] }
  | { id: string; type: 'text'; label: string; help?: string; placeholder?: string }

export interface Section {
  id: string
  title: string
  description: string
  questions: Question[]
}

export const sections: Section[] = [
  {
    id: 'practice',
    title: 'Votre pratique',
    description: 'Pour situer le vocabulaire et le contexte de vos comptes rendus.',
    questions: [
      {
        id: 'registers',
        type: 'multi',
        label: 'Sur quels registres intervenez-vous ?',
        options: ['Structurel', 'Musculaire', 'Fascial', 'Viscéral', 'Crânien', 'Tissulaire', 'Autre'],
      },
      {
        id: 'frequent_reasons',
        type: 'multi',
        label: 'Motifs les plus fréquents à votre cabinet',
        help: 'Les comptes rendus de ces motifs seront les premiers à être affinés.',
        options: [
          'Lombalgie', 'Cervicalgie', 'Dorsalgie', 'Épaule', 'Genou', 'Cheville', 'Sacro-iliaque',
          'Céphalées / migraines', 'Troubles digestifs', 'Douleur costale', 'Bilan sans douleur',
        ],
      },
      {
        id: 'patient_profiles',
        type: 'multi',
        label: 'Quels publics voyez-vous le plus souvent ?',
        options: ['Sédentaires', 'Sportifs', 'Métiers physiques', 'Femmes enceintes', 'Nourrissons et enfants', 'Personnes âgées'],
      },
    ],
  },
  {
    id: 'anamnesis',
    title: 'Votre anamnèse',
    description: 'Pour que la fiche suive l’ordre dans lequel vous posez vos questions.',
    questions: [
      {
        id: 'anamnesis_order',
        type: 'text',
        label: 'Dans quel ordre menez-vous votre anamnèse ?',
        help: 'Une étape par ligne.',
        placeholder:
          'Ex. :\nCivilité et coordonnées\nProfession\nSport et loisirs\nMotif (lieu, depuis quand, traitements, examens, évolution)\nAntécédents (traumas, chirurgies, traitements au long cours)\nBalayage par zone (crâne, cardio-pulmonaire, viscéral, uro, membre inférieur)',
      },
      {
        id: 'systematic_questions',
        type: 'text',
        label: 'Questions que vous posez à chaque patient, quel que soit le motif',
        help: 'Elles apparaîtront comme rappels dans la fiche, à cocher par vous.',
        placeholder: 'Ex. : Bruxisme ? Port de semelles ? Vitesse des repas ? Se lève la nuit pour uriner ?',
      },
      {
        id: 'reference_movement',
        type: 'single',
        label: 'Notez-vous un mouvement de référence à refaire avant / après séance ?',
        options: ['Oui, systématiquement', 'Parfois', 'Non'],
      },
    ],
  },
  {
    id: 'vocabulary',
    title: 'Votre vocabulaire',
    description: 'Pour que les comptes rendus utilisent vos mots, pas des formulations génériques.',
    questions: [
      {
        id: 'techniques_names',
        type: 'text',
        label: 'Comment nommez-vous les techniques que vous utilisez le plus ?',
        help: 'Telles que vous les écrivez ou les dites, une par ligne. Elles servent à les reconnaître dans vos notes et dictées.',
        placeholder: 'Ex. : Lumbar roll\nDog\nTrigger points\nPompage du sacrum\nTest d’inhibition',
      },
      {
        id: 'tests_names',
        type: 'text',
        label: 'Quels tests notez-vous habituellement ?',
        help: 'Tels que vous les nommez.',
        placeholder: 'Ex. : ROT\nSonnette\nDiapason\nFABER\nTest des 4 mouvements actif / passif',
      },
      {
        id: 'abbreviations',
        type: 'text',
        label: 'Abréviations personnelles',
        help: 'Une par ligne, au format « abréviation = signification ».',
        placeholder: 'Ex. : D = dysfonction\nSI = sacro-iliaque\nMS = membre supérieur',
      },
    ],
  },
  {
    id: 'report_style',
    title: 'Vos comptes rendus',
    description: 'Pour reproduire la structure et le niveau de détail que vous attendez.',
    questions: [
      {
        id: 'detail_level',
        type: 'single',
        label: 'Niveau de détail souhaité',
        options: ['Télégraphique (mots-clés)', 'Concis (phrases courtes)', 'Détaillé (rédigé)'],
      },
      {
        id: 'note_findings_as',
        type: 'multi',
        label: 'Ce que vous voulez retrouver dans vos observations',
        options: [
          'Paramètre le moins mobile', 'Distinction actif / passif', 'Plus grosse dysfonction retrouvée',
          'Zone traitée en premier', 'Résultat du re-test', 'Liens avec une autre zone (viscéral, thorax…)',
        ],
      },
      {
        id: 'advice_habits',
        type: 'text',
        label: 'Conseils que vous donnez souvent',
        help: 'Pour les reconnaître et les reformuler fidèlement quand vous les mentionnez.',
        placeholder: 'Ex. : Pause toutes les 30-45 min en position assise\nMouvements lombaires quotidiens\nManger plus lentement\nPorter avec les jambes',
      },
      {
        id: 'second_visit_summary',
        type: 'multi',
        label: 'À la 2e visite, que voulez-vous voir en premier ?',
        help: 'Pour la synthèse affichée en ouverture de consultation.',
        options: [
          'Motif et date de la dernière séance', 'Mouvement de référence', 'Ce qui a été traité',
          'Conseils donnés', 'Éléments d’hygiène de vie (alimentation, sport, travail)', 'Antécédents importants',
        ],
      },
    ],
  },
  {
    id: 'messages',
    title: 'Vos messages aux patients',
    description: 'Pour préparer des messages de suivi que vous relisez et validez avant envoi.',
    questions: [
      {
        id: 'address_form',
        type: 'single',
        label: 'Tutoiement ou vouvoiement ?',
        options: ['Vouvoiement', 'Tutoiement', 'Selon le patient'],
      },
      {
        id: 'message_tone',
        type: 'single',
        label: 'Ton des messages',
        options: ['Sobre et court', 'Chaleureux', 'Plus chaleureux pour les patients réguliers'],
      },
      {
        id: 'signature',
        type: 'text',
        label: 'Comment signez-vous vos messages ?',
        placeholder: 'Ex. : Nicolas Delattre, ostéopathe',
      },
    ],
  },
  {
    id: 'workflow',
    title: 'Votre organisation',
    description: 'Pour intégrer l’outil à votre routine sans double saisie.',
    questions: [
      {
        id: 'current_software',
        type: 'text',
        label: 'Qu’utilisez-vous aujourd’hui pour vos dossiers et factures ?',
        placeholder: 'Ex. : papier, Doctolib, tableur…',
      },
      {
        id: 'biggest_time_loss',
        type: 'single',
        label: 'Ce qui vous fait perdre le plus de temps',
        options: ['Rédiger les factures', 'Relire le dossier avant une séance', 'Écrire les comptes rendus', 'Relancer les patients'],
      },
      {
        id: 'note_timing',
        type: 'single',
        label: 'Quand rédigez-vous vos notes ?',
        options: ['Pendant la séance', 'Juste après', 'En fin de journée', 'Rarement'],
      },
    ],
  },
]

export const allQuestions = sections.flatMap((s) => s.questions)
