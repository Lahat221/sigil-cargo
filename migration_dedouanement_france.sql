-- ============================================================
-- MODULE DÉDOUANEMENT FRANCE — génération facture/packing/déclaration
-- Additif pur, aucune table existante modifiée (sauf 2 colonnes ajoutées
-- à douane_produits pour les exclusions).
-- ============================================================

create table douane_expeditions_france (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references projets(id) unique,
  mawb text,
  date_vol text, -- format JJ-MM-AAAA (celui utilisé partout dans les documents générés)
  poids_brut_lta_kg numeric(10,2),
  nombre_colis int not null default 1,
  dimensions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table douane_declarations_france (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references douane_expeditions_france(id) on delete cascade,
  version int not null default 1,
  statut text not null default 'genere' check (statut in ('genere', 'erreur')),
  reponse_json jsonb,
  modele text,
  prompt_version text,
  tokens_entree int,
  tokens_sortie int,
  cout_estime_usd numeric(10,5),
  erreur text,
  created_at timestamptz not null default now()
);

create index idx_douane_declarations_france_expedition on douane_declarations_france(expedition_id);

alter table douane_produits
  add column if not exists exclu_declaration_france boolean not null default false,
  add column if not exists raison_exclusion_france text;

alter table douane_expeditions_france enable row level security;
alter table douane_declarations_france enable row level security;

create policy "authenticated_all" on douane_expeditions_france for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on douane_declarations_france for all using (auth.role() = 'authenticated');
