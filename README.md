# OstéoAssist

Assistant de documentation pour ostéopathes : dossiers patients, comptes rendus rédigés dans la méthode du praticien, checklist drapeaux rouges, bibliothèque scientifique.

> ⚠️ **Version de développement — données fictives uniquement.** Aucune donnée réelle de patient tant que l'hébergement certifié HDS n'est pas en place. Voir [`docs/usage-prevu.md`](docs/usage-prevu.md) pour le périmètre réglementaire.

## Stack

- **Frontend** : React 19, TypeScript strict, Vite, Tailwind CSS 4, TanStack Query, React Router, React Hook Form + Zod, Lucide
- **Backend** : PostgreSQL (Supabase en développement), Row Level Security, pgvector, Supabase Storage
- **IA** : Vercel AI SDK 7 + Vercel AI Gateway (une clé, modèles interchangeables par variables d'environnement), fonctions Vercel dans `api/`

## Démarrage

```bash
npm install
cp .env.example .env.local   # Supabase + AI_GATEWAY_API_KEY
npm run dev                  # interface + fonctions /api (exécutées par Vite en local)
```

En production, Vercel déploie `api/**` comme fonctions serverless sans configuration supplémentaire.

### Base de données

1. Créer un projet Supabase (région UE).
2. Appliquer les migrations dans l'ordre : `supabase/migrations/*.sql` (via `supabase db push` avec la CLI, ou l'éditeur SQL).
3. Charger les données de référence : `supabase/seed.sql` puis `supabase/seed_reference.sql`.

## Tests

```bash
npm run test:db    # isolation multi-tenant, rôles, validation, traçabilité (PostgreSQL embarqué)
npm test           # fonctions IA avec modèles simulés : pseudonymisation, droits, cache, erreurs
npm run build      # vérification des types + build
```

## Structure

```
src/
  components/ui/        composants de base
  components/layout/    layout + navigation
  features/
    auth/               connexion, création du cabinet, contexte
    dashboard/
    patients/           liste, fiche, formulaire
    consultations/      compte rendu structuré, validation
    red-flags/          checklist de référence
    method-profile/     interview « Ma méthode » (questions versionnées)
    session/            enregistrement, transcription, brouillon IA, synthèse avant séance
  lib/  types/
server/                 logique serveur : auth (jeton utilisateur + RLS), prompts, fonctions IA
api/ai/                 fonctions Vercel : transcribe, consultation-report, patient-brief
shared/                 schémas Zod partagés (sorties structurées du modèle)
supabase/
  migrations/           schéma, RLS
  seed.sql              checklist drapeaux rouges (à valider cliniquement)
tests/db/               tests de sécurité de la base
docs/                   usage prévu, décisions
```

## Décisions d'architecture

- **Portabilité HDS** : le schéma est du PostgreSQL standard. La seule dépendance à Supabase est `app.current_user_id()` (qui encapsule `auth.uid()`). Migrer vers un hébergeur HDS = remplacer cette fonction et l'authentification, sans réécrire le schéma.
- **Données cliniques séparées** (`patient_clinical_profiles`) : le rôle `staff` (secrétariat) gère les coordonnées sans jamais voir le médical.
- **Validation par le praticien uniquement** : passage en `validated` exclusivement via `validate_consultation()`, journalisé. Toute modification ultérieure archive la version précédente.
- **Profil de méthode privé** : visible uniquement par le praticien concerné, même au sein du cabinet.
- **Bibliothèque scientifique** : lecture pour tous les utilisateurs connectés, écriture réservée au service d'ingestion.

## Séance assistée par l'IA

1. **Consentement** du patient coché par le praticien (tracé : qui, quand), puis enregistrement dans le navigateur (pause, reprise) ou import d'une dictée.
2. **Transcription** (Voxtral par défaut). L'audio est **supprimé dès la transcription réussie** (`RECORDING_RETENTION`).
3. **Compte rendu** rédigé à partir de la transcription, des notes rapides et des 3 dernières séances validées, dans le vocabulaire du profil « Ma méthode ». Chaque section indique sa source ; les passages ambigus sont listés « à vérifier ». Rien n'est enregistré sans action du praticien.
4. **Synthèse avant séance** sur la fiche patient, mise en cache et régénérée seulement si les séances changent.
5. L'écart entre brouillon IA et version validée est conservé (`ai_draft_feedback`) pour affiner le style.

Garde-fous : les endpoints agissent avec le jeton de l'utilisateur (aucune clé service_role), **aucun nom ni coordonnée patient n'est envoyé au modèle**, le contenu transcrit est traité comme une donnée (protection contre l'injection de consignes), coûts journalisés dans `ai_usage`.

## Aide au praticien

Sur la page consultation, le panneau **Aide au praticien** analyse l'anamnèse enregistrée (champs, notes rapides, transcription) :

1. identifie le ou les motifs du référentiel concernés et construit une requête PubMed ;
2. récupère les sources : fiches du **référentiel de pratiques** (commun + fiches du cabinet), **cas similaires** validés du praticien, **publications PubMed** de haut niveau de preuve des 10 dernières années (NCBI E-utilities), **profil « Ma méthode »** ;
3. produit des pistes classées (drapeaux rouges, questions manquantes, tests, traitement, si pas d'amélioration, cas similaires, littérature), **chacune liée à ses sources** ; toute suggestion citant une source inexistante est retirée.

Chaque analyse est conservée (`practice_assist_runs`) avec ses sources. Le référentiel de départ (`supabase/reference/cards.py` → `seed_reference.sql`) est issu des entretiens terrain et de connaissances cliniques générales, **à faire valider** par un référent clinique.

Variables facultatives : `NCBI_EMAIL`, `NCBI_API_KEY` (quota PubMed plus élevé).

## Feuille de route

1. ✅ Fondations, patients, consultations, checklist drapeaux rouges, interview de méthode
2. ✅ Enregistrement, transcription, compte rendu IA dans le style du praticien, synthèse avant séance
3. ✅ Aide au praticien : référentiel de pratiques, cas similaires, PubMed, pistes sourcées
4. Factures PDF + relances automatisées
