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

-- ---------- RLS (Row Level Security) - à activer et affiner selon l'auth ----------
alter table clients enable row level security;
alter table projets enable row level security;
alter table produits enable row level security;
alter table commandes enable row level security;
alter table commandes_historique enable row level security;
alter table notifications_a_envoyer enable row level security;

-- Politique simple (mono-utilisateur pour commencer) : tout utilisateur authentifié a accès complet.
create policy "authenticated_all" on clients for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on projets for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on produits for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on commandes for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on commandes_historique for all using (auth.role() = 'authenticated');
create policy "authenticated_all" on notifications_a_envoyer for all using (auth.role() = 'authenticated');
