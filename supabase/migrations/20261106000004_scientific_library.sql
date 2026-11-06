-- =============================================================================
-- 0004 — Bibliothèque scientifique (PubMed)
-- Globale, distincte des dossiers patients. Consultation documentaire par thème,
-- jamais appliquée automatiquement à un patient.
-- Le schéma est prêt ; l'import (NCBI E-utilities) viendra dans une phase dédiée.
-- =============================================================================

create type public.ingestion_status as enum ('pending', 'processing', 'indexed', 'failed');

create type public.study_type as enum (
  'clinical_guideline',
  'systematic_review',
  'meta_analysis',
  'randomized_controlled_trial',
  'cohort_study',
  'case_control_study',
  'cross_sectional_study',
  'case_series',
  'case_report',
  'narrative_review',
  'other',
  'unknown'
);

create table public.scientific_articles (
  id                    uuid primary key default gen_random_uuid(),
  pmid                  text unique check (pmid is null or pmid ~ '^[0-9]+$'),
  pmcid                 text unique check (pmcid is null or pmcid ~ '^PMC[0-9]+$'),
  doi                   text,
  title                 text not null,
  abstract              text,
  authors               jsonb not null default '[]'::jsonb,
  journal               text,
  publication_date      date,
  publication_type      text[] not null default '{}',
  study_type            public.study_type not null default 'unknown',
  keywords              text[] not null default '{}',
  medical_topics        text[] not null default '{}',   -- termes MeSH
  -- Données méthodologiques : NULL = non renseigné. Ne jamais inventer.
  sample_size           int check (sample_size is null or sample_size > 0),
  population            text,
  intervention          text,
  comparator            text,
  outcomes              text,
  limitations           text,
  evidence_assessment   text,
  source_url            text,
  full_text_available   boolean not null default false,
  license               text,
  ingestion_status      public.ingestion_status not null default 'pending',
  ingestion_error       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index scientific_articles_doi_uidx
  on public.scientific_articles (lower(doi)) where doi is not null;
create index scientific_articles_topics_idx on public.scientific_articles using gin (medical_topics);
create index scientific_articles_keywords_idx on public.scientific_articles using gin (keywords);
create index scientific_articles_fts_idx on public.scientific_articles
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(abstract,'')));

create trigger scientific_articles_updated_at
  before update on public.scientific_articles
  for each row execute function app.set_updated_at();

-- Dimension 1536 : à ajuster selon le modèle d'embedding retenu (hébergé dans
-- le périmètre HDS). Changer de dimension implique une migration + réindexation.
create table public.scientific_article_chunks (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references public.scientific_articles(id) on delete cascade,
  content       text not null,
  section       text,            -- 'abstract', 'methods', 'results'...
  chunk_index   int not null,
  embedding     vector(1536),
  token_count   int,
  created_at    timestamptz not null default now(),
  unique (article_id, chunk_index)
);

create index scientific_article_chunks_embedding_idx
  on public.scientific_article_chunks using hnsw (embedding vector_cosine_ops);
create index scientific_article_chunks_fts_idx
  on public.scientific_article_chunks using gin (to_tsvector('english', content));
