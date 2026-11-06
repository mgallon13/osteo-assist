/**
 * Interview de méthode — version 1 (à enrichir avec les notes d'entretiens terrain).
 *
 * PÉRIMÈTRE : ces réponses servent UNIQUEMENT à rédiger les comptes rendus dans
 * la structure et le vocabulaire du praticien. Elles ne servent jamais à suggérer
 * un test, une technique ou une conduite à tenir pour un patient donné
 * (cf. docs/usage-prevu.md).
 *
 * Toute modification des questions doit incrémenter QUESTIONNAIRE_VERSION.
 */
export const QUESTIONNAIRE_VERSION = 1

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
        id: 'approaches',
        type: 'multi',
        label: 'Quelles approches utilisez-vous le plus ?',
        options: ['Structurel', 'Fonctionnel', 'Viscéral', 'Crânien', 'Myofascial', 'Tissulaire', 'Autre'],
      },
      {
        id: 'patient_profiles',
        type: 'multi',
        label: 'Quels publics voyez-vous le plus souvent ?',
        options: ['Adultes actifs', 'Sportifs', 'Femmes enceintes', 'Nourrissons et enfants', 'Personnes âgées', 'Autre'],
      },
      {
        id: 'session_length',
        type: 'single',
        label: 'Durée habituelle d’une séance',
        options: ['30 min', '45 min', '1 h', 'Variable'],
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
        help: 'Listez-les comme vous les écrivez dans vos notes, une par ligne.',
        placeholder: 'Ex. : HVLA lombaire\nPompage du psoas\nTechnique de Jones…',
      },
      {
        id: 'tests_names',
        type: 'text',
        label: 'Quels tests notez-vous habituellement dans vos observations ?',
        help: 'Tels que vous les nommez. Ils servent à reconnaître ces termes dans vos notes et transcriptions.',
        placeholder: 'Ex. : Lasègue\nTest de flexion debout…',
      },
      {
        id: 'abbreviations',
        type: 'text',
        label: 'Abréviations personnelles',
        help: 'Une par ligne, au format « abréviation = signification ».',
        placeholder: 'Ex. : D = dysfonction\nSI = sacro-iliaque',
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
        id: 'writing_person',
        type: 'single',
        label: 'Formulation',
        options: ['Impersonnelle (« Patient rapporte… »)', 'À la première personne (« J’observe… »)'],
      },
      {
        id: 'must_have_sections',
        type: 'multi',
        label: 'Sections indispensables dans vos comptes rendus',
        options: [
          'Motif', 'Symptômes rapportés', 'Antécédents pertinents', 'Observations', 'Techniques réalisées',
          'Évolution', 'Conseils donnés',
        ],
      },
      {
        id: 'advice_habits',
        type: 'text',
        label: 'Conseils que vous donnez souvent',
        help: 'Pour les reconnaître et les reformuler fidèlement quand vous les mentionnez en séance.',
        placeholder: 'Ex. : Hydratation\nMarche quotidienne 20 min…',
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
        label: 'Quel logiciel utilisez-vous aujourd’hui pour vos dossiers patients ?',
        placeholder: 'Ex. : Doctolib, logiciel métier, papier…',
      },
      {
        id: 'note_timing',
        type: 'single',
        label: 'Quand rédigez-vous vos comptes rendus ?',
        options: ['Pendant la séance', 'Juste après', 'En fin de journée', 'Rarement'],
      },
      {
        id: 'time_spent',
        type: 'single',
        label: 'Temps passé à documenter par séance',
        options: ['Moins de 2 min', '2 à 5 min', '5 à 10 min', 'Plus de 10 min'],
      },
    ],
  },
]

export const allQuestions = sections.flatMap((s) => s.questions)
