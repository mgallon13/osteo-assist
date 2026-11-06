# OstéoAssist

Assistant de documentation pour ostéopathes : dossiers patients, comptes rendus rédigés dans la méthode du praticien, checklist drapeaux rouges, bibliothèque scientifique.

> ⚠️ **Version de développement — données fictives uniquement.** Aucune donnée réelle de patient tant que l'hébergement certifié HDS n'est pas en place. Voir [`docs/usage-prevu.md`](docs/usage-prevu.md) pour le périmètre réglementaire.

## Stack

- **Frontend** : React 19, TypeScript strict, Vite, Tailwind CSS 4, TanStack Query, React Router, React Hook Form + Zod, Lucide
- **Backend** : PostgreSQL (Supabase en développement), Row Level Security, pgvector

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner l'URL et la clé anon du projet Supabase
npm run dev
```

### Base de données

1. Créer un projet Supabase (région UE).
2. Appliquer les migrations dans l'ordre : `supabase/migrations/*.sql` (via `supabase db push` avec la CLI, ou l'éditeur SQL).
3. Charger les données de référence : `supabase/seed.sql`.

## Tests

```bash
npm run test:db    # isolation multi-tenant, rôles, validation, traçabilité (PostgreSQL embarqué)
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
  lib/  types/
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

## Feuille de route

1. ✅ Fondations, patients, consultations, checklist drapeaux rouges, interview de méthode
2. Génération IA du compte rendu à partir des notes, dans le style du praticien (modèle hébergé dans le périmètre HDS)
3. Enregistrement et transcription post-séance
4. Import PubMed (NCBI E-utilities) et recherche documentaire
5. Facturation simple
