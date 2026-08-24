-- ============================================================
-- SCHEMA SUPABASE - Module Commandes (V2 SIGIL CARGO)
-- Base commune : clients, projets (vols/campagnes), produits, commandes
-- ============================================================

-- Extension pour UUID
create extension if not exists "pgcrypto";

-- ---------- CLIENTS ----------
create table clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  telephone_pays text default '+33',
  adresse text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clients_telephone on clients(telephone);
create index idx_clients_nom on clients using gin (to_tsvector('french', nom));

-- ---------- PROJETS (vols / campagnes de groupage) ----------
create table projets (
  id uuid primary key default gen_random_uuid(),
  nom text not null,                    -- ex: "Fret Aérien du 28/08/2026"
  date_depart date,
  date_arrivee date,
  statut text default 'actif' check (statut in ('actif', 'clos', 'annule')),
  created_at timestamptz default now()
);

-- ---------- PRODUITS (tarifs) ----------
create table produits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prix_par_kg numeric(10,2) not null,
  sku text unique,
  code_barre text unique,
  actif boolean default true,
  created_at timestamptz default now()
);

-- ---------- COMMANDES ----------
-- Statuts pensés comme un vrai pipeline (le point faible identifié dans l'audit V1)
create type statut_commande as enum (
  'recue',
  'a_preparer',
  'en_preparation',
  'prete',
  'expediee',
  'livree',
  'annulee'
);

create table commandes (
  id uuid primary key default gen_random_uuid(),
  numero serial unique,                 -- numéro séquentiel lisible (0001, 0002...)
  client_id uuid references clients(id) not null,
  projet_id uuid references projets(id) not null,
  produit_id uuid references produits(id) not null,

  poids_kg numeric(10,2) not null,
  prix_par_kg numeric(10,2) not null,   -- copié depuis produit au moment de la commande (traçabilité si le tarif change)
  enveloppe boolean default false,      -- option +15€
  nombre_paquets int default 1,
  montant_total numeric(10,2) generated always as (
    poids_kg * prix_par_kg + case when enveloppe then 15 else 0 end
  ) stored,

  statut statut_commande default 'recue',
  paye boolean default false,

  adresse_livraison text,
  description text,
  remarque_interne text,

  -- Traçabilité de la préparation (le cœur du gain de temps demandé)
  code_barre_colis text unique,         -- généré à la création, imprimable sur étiquette
  pesee_faite boolean default false,
  emballage_fait boolean default false,
  etiquette_collee boolean default false,
  photo_urls text[],                    -- jusqu'à 5 photos (Supabase Storage)
  video_url text,

  -- Livraison
  date_livraison_prevue date,
  date_livraison_reelle timestamptz,
  preuve_livraison_url text,            -- photo ou signature capturée au moment de la remise

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_commandes_client on commandes(client_id);
create index idx_commandes_projet on commandes(projet_id);
create index idx_commandes_statut on commandes(statut);

-- ---------- HISTORIQUE DES STATUTS ----------
-- Pour tracer qui a changé quoi et quand (utile pour le suivi + déclenchement notifs)
create table commandes_historique (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references commandes(id) on delete cascade,
  ancien_statut statut_commande,
  nouveau_statut statut_commande not null,
  notif_envoyee boolean default false,
  created_at timestamptz default now()
);

-- Trigger : log automatique à chaque changement de statut
create or replace function log_changement_statut()
returns trigger as $$
begin
  if old.statut is distinct from new.statut then
    insert into commandes_historique (commande_id, ancien_statut, nouveau_statut)
    values (new.id, old.statut, new.statut);
  end if;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_log_statut
before update on commandes
for each row execute function log_changement_statut();

-- ---------- NOTIFICATIONS A ENVOYER ----------
-- Point d'accroche pour le futur module Notifications (WhatsApp/Twilio).
-- Alimentée automatiquement à chaque changement de statut ; pas de dispatch actif pour l'instant.
create table notifications_a_envoyer (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid references commandes(id) on delete cascade,
  canal text default 'whatsapp',
  statut_commande statut_commande not null,
  destinataire_telephone text,
  envoyee boolean default false,
  envoyee_at timestamptz,
  created_at timestamptz default now()
);

create index idx_notifications_envoyee on notifications_a_envoyer(envoyee);

create or replace function enqueue_notification_statut()
returns trigger as $$
begin
  if old.statut is distinct from new.statut then
    insert into notifications_a_envoyer (commande_id, statut_commande, destinataire_telephone)
    select new.id, new.statut, c.telephone_pays || c.telephone
    from clients c
    where c.id = new.client_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_enqueue_notification
after update on commandes
for each row execute function enqueue_notification_statut();

-- ---------- CAMPAGNES WHATSAPP ----------
create table campagnes_whatsapp (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  message text not null,
  image_url text,  -- affiche/visuel jointe, à télécharger et attacher manuellement dans WhatsApp
  created_at timestamptz default now()
);

create table campagnes_whatsapp_destinataires (
  id uuid primary key default gen_random_uuid(),
  campagne_id uuid references campagnes_whatsapp(id) on delete cascade not null,
  client_id uuid references clients(id) not null,
  envoyee boolean default false,
  envoyee_at timestamptz,
  created_at timestamptz default now()
);

-- ---------- CHARGES & DEPENSES ----------
create table charges (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid references projets(id) not null,  -- chaque charge est rattachée à un fret
  libelle text not null,
  montant numeric(10,2) not null,
  categorie text,
  date_charge date not null default current_date,
  facture_url text,
  remarque text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bucket de stockage "charges-factures" créé via l'API Storage (public: false).
-- Policies sur storage.objects pour ce bucket : voir bloc RLS ci-dessous.

-- ---------- RLS (Row Level Security) - à activer et affiner selon l'auth ----------
alter table clients enable row level security;
alter table projets enable row level security;
alter table produits enable row level security;
alter table commandes enable row level security;
alter table commandes_historique enable row level security;
alter table notifications_a_envoyer enable row level security;
alter table charges enable row level security;
alter table campagnes_whatsapp enable row level security;
alter table campagnes_whatsapp_destinataires enable row level security;

-- Politique simple (mono-utilisateur pour commencer) : tout utilisateur authentifié a accès complet.
create policy "authenticated_all" on clients for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on projets for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on produits for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on commandes for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on commandes_historique for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on notifications_a_envoyer for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on charges for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on campagnes_whatsapp for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on campagnes_whatsapp_destinataires for all using (auth.role() = 'authenticated');

create policy "authenticated_read_charges_factures"
on storage.objects for select
using (bucket_id = 'charges-factures' and auth.role() = 'authenticated');

create policy "authenticated_upload_charges_factures"
on storage.objects for insert
with check (bucket_id = 'charges-factures' and auth.role() = 'authenticated');

create policy "authenticated_delete_charges_factures"
on storage.objects for delete
using (bucket_id = 'charges-factures' and auth.role() = 'authenticated');

create policy "authenticated_read_campagnes_media"
on storage.objects for select
using (bucket_id = 'campagnes-media' and auth.role() = 'authenticated');

create policy "authenticated_upload_campagnes_media"
on storage.objects for insert
with check (bucket_id = 'campagnes-media' and auth.role() = 'authenticated');

create policy "authenticated_delete_campagnes_media"
on storage.objects for delete
using (bucket_id = 'campagnes-media' and auth.role() = 'authenticated');

-- ============================================================
-- MODULE GESTION DOUANIÈRE — extraction IA des colis
-- Additif pur, aucune table existante modifiée.
-- ============================================================

-- ---------- EXTRACTIONS (une par colis, commande_id unique = idempotence) ----------
create table douane_extractions (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes(id) unique,
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
  commande_id uuid references commandes(id),
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
