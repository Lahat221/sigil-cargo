-- ============================================================
-- MODULE GESTION DOUANIÈRE — extraction IA des colis
-- Additif pur, aucune table existante modifiée.
-- ============================================================

-- ---------- EXTRACTIONS (une par colis, commande_id unique = idempotence) ----------
create table douane_extractions (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes(id) on delete cascade unique,
  statut text not null default 'non_traite'
    check (statut in ('non_traite','en_cours','traite','a_verifier','valide','erreur')),
  version int not null default 1,
  raw_description text not null,
  poids_total numeric(10,3) not null,
  client_nom text,
  client_telephone text,
  anomalies jsonb not null default '[]',
  modele text,
  prompt_version text,
  erreur text,
  valide_par uuid references profiles(id),
  valide_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_douane_extractions_statut on douane_extractions(statut);

-- ---------- PRODUITS DÉTECTÉS (une ligne = une ligne du tableau douane) ----------
create table douane_produits (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references douane_extractions(id) on delete cascade,
  type_produit text not null,
  description_douane text not null,
  hs_code text,
  hs_status text not null default 'a_verifier' check (hs_status in ('confirme','propose','a_verifier')),
  hs_code_source text not null default 'ia' check (hs_code_source in ('referentiel','ia','utilisateur')),
  description_produit text not null,
  quantite numeric(10,2) not null default 1,
  unite text not null default 'pièce',
  confiance numeric(4,3),
  statut text not null default 'a_valider' check (statut in ('a_valider','valide')),
  ordre int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_douane_produits_extraction on douane_produits(extraction_id);

-- ---------- PRODUITS EXPLICITEMENT RETIRÉS DU COLIS (jamais déclarés) ----------
create table douane_produits_retires (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid not null references douane_extractions(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);

-- ---------- HISTORIQUE DES CORRECTIONS HUMAINES ----------
create table douane_historique (
  id uuid primary key default gen_random_uuid(),
  produit_id uuid references douane_produits(id) on delete set null,
  extraction_id uuid not null references douane_extractions(id) on delete cascade,
  champ text not null,
  ancienne_valeur text,
  nouvelle_valeur text,
  modifie_par uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_douane_historique_extraction on douane_historique(extraction_id);

-- ---------- RÉFÉRENTIEL PRODUITS (base de connaissance douanière SIGIL CARGO) ----------
create table douane_produits_referentiel (
  id uuid primary key default gen_random_uuid(),
  nom_local text not null,
  nom_normalise text not null,
  type_produit text not null,
  description_douane text not null,
  hs_code text,
  synonymes text[] not null default '{}',
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_douane_referentiel_synonymes on douane_produits_referentiel using gin (synonymes);

-- ---------- LOGS D'APPEL IA (traçabilité + suivi des coûts) ----------
create table douane_logs (
  id uuid primary key default gen_random_uuid(),
  extraction_id uuid references douane_extractions(id) on delete set null,
  commande_id uuid references commandes(id) on delete cascade,
  modele text not null,
  prompt_version text,
  duree_ms int,
  statut text not null,
  erreur text,
  tokens_entree int,
  tokens_sortie int,
  cout_estime_usd numeric(10,5),
  created_at timestamptz not null default now()
);

create index idx_douane_logs_commande on douane_logs(commande_id);

-- ---------- RLS : même politique mono-tenant que le reste de l'app ----------
alter table douane_extractions enable row level security;
alter table douane_produits enable row level security;
alter table douane_produits_retires enable row level security;
alter table douane_historique enable row level security;
alter table douane_produits_referentiel enable row level security;
alter table douane_logs enable row level security;

create policy "authenticated_all" on douane_extractions for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on douane_produits for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on douane_produits_retires for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on douane_historique for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on douane_produits_referentiel for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on douane_logs for all using (auth.role() = 'authenticated');

-- ---------- SEED : référentiel produits sénégalais récurrents ----------
-- hs_code volontairement laissé NULL : à faire vérifier/compléter par un professionnel
-- des douanes avant de considérer un code comme "confirme". Les descriptions ci-dessous
-- sont des points de départ raisonnables, pas une vérité officielle (voir section 25/39
-- du cahier des charges) — à corriger via l'écran Référentiel du module.
insert into douane_produits_referentiel (nom_local, nom_normalise, type_produit, description_douane, synonymes) values
  ('Bouye', 'bouye', 'Produit alimentaire', 'Pulpe de fruit de baobab séchée', array['bouye','bouy','buy']),
  ('Maad', 'maad', 'Produit alimentaire', 'Fruit séché (maad / Saba senegalensis)', array['maad','maade','made']),
  ('Thiakry', 'thiakry', 'Produit alimentaire', 'Préparation à base de mil et de lait en poudre', array['thiakry','thiakri','tiakry']),
  ('Thiéré', 'thiere', 'Produit alimentaire', 'Couscous de mil', array['thiere','thiéré','tiere']),
  ('Araw', 'araw', 'Produit alimentaire', 'Mil concassé', array['araw','arraw']),
  ('Sankal', 'sankal', 'Produit alimentaire', 'Semoule de mil', array['sankal','sankhal']),
  ('Bissap', 'bissap', 'Produit alimentaire', 'Fleurs séchées d''hibiscus (bissap)', array['bissap','bissap sec','fleurs de bissap']),
  ('Tangal', 'tangal', 'Épice / Condiment', 'Écorce/racine séchée traditionnelle', array['tangal']),
  ('Gowé', 'gowe', 'Produit alimentaire', 'Préparation à base de céréales fermentées', array['gowe','gowé']),
  ('Sidème', 'sideme', 'Épice / Condiment', 'Condiment traditionnel séché', array['sideme','sidème','sidem']),
  ('Ndir', 'ndir', 'Produit alimentaire', 'Produit alimentaire traditionnel séché — à préciser', array['ndir']),
  ('Gouro', 'gouro', 'Produit alimentaire', 'Noix de cola séchée', array['gouro','guro','cola']),
  ('Thiouraye', 'thiouraye', 'Encens', 'Encens traditionnel (thiouraye)', array['thiouraye','thouraye','tiouraye']),
  ('Mbouraké', 'mbourake', 'Encens', 'Encens traditionnel', array['mbourake','mbouraké','mbouraque']),
  ('Noflay', 'noflay', 'Produit alimentaire', 'Produit alimentaire traditionnel — à préciser', array['noflay','noflaye']),
  ('Soumpou', 'soumpou', 'Épice / Condiment', 'Fruit/graine séchée utilisée en cuisine', array['soumpou','soump','soumpu']),
  ('Oule', 'oule', 'Produit alimentaire', 'Produit alimentaire traditionnel — à préciser', array['oule','oulo']),
  ('Safara', 'safara', 'Produit cosmétique', 'Poudre cosmétique traditionnelle', array['safara']),
  ('Netétou', 'netetou', 'Épice / Condiment', 'Condiment fermenté à base de néré (netetou)', array['netetou','netétou','neteetou']),
  ('Kéthiakh', 'kethiakh', 'Produit alimentaire', 'Poisson séché/fumé (kéthiakh)', array['kethiakh','kéthiakh','ketiakh']),
  ('Yété', 'yete', 'Produit alimentaire', 'Produit alimentaire traditionnel séché — à préciser', array['yete','yété']);
