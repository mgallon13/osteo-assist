-- =============================================================================
-- 0007 — Droits d'accès des rôles Supabase
-- Les politiques RLS appellent des fonctions du schéma `app` : le rôle
-- `authenticated` doit pouvoir utiliser ce schéma. Les droits sur les tables
-- sont donnés explicitement (la RLS reste le filtre réel, ligne par ligne).
-- Le rôle `anon` (non connecté) ne reçoit aucun droit.
-- =============================================================================
grant usage on schema app to authenticated;
grant execute on all functions in schema app to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

revoke all on all tables in schema public from anon;
