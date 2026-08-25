-- ============================================================
-- Historique des audits France (module Dédouanement France) — additif pur,
-- aucune table existante modifiée.
--
-- lignes_snapshot capture, au moment de l'audit, la correspondance
-- num_source -> produit/colis exacte qui a été envoyée à Claude (dans
-- l'ordre), pour que les liens "Voir le colis" / "Retirer" sur chaque
-- alerte restent corrects même après coup, indépendamment des exclusions
-- faites entre-temps.
-- ============================================================

create table douane_audits_france (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references douane_expeditions_france(id) on delete cascade,
  version int not null default 1,
  audit_json jsonb not null,
  lignes_snapshot jsonb not null,
  nb_alertes_critiques int not null default 0,
  nb_alertes_reglementation int not null default 0,
  nb_alertes_ambigues int not null default 0,
  modele text,
  prompt_version text,
  tokens_entree int,
  tokens_sortie int,
  cout_estime_usd numeric(10,5),
  created_at timestamptz not null default now()
);

create index idx_douane_audits_france_expedition on douane_audits_france(expedition_id);

alter table douane_audits_france enable row level security;
create policy "authenticated_all" on douane_audits_france for all using (auth.role() = 'authenticated');
