-- Module Paramètres :
--  * destinations : liste des villes de destination + tarif/kg par défaut
--    (remplace les constantes codées en dur Paris/Lyon/Marseille)
--  * parametres : réglages clé/valeur (infos de contact du site public)
-- Lecture réservée aux utilisateurs connectés ; l'écriture passe uniquement
-- par les actions serveur de l'appli (service role, après vérification du
-- rôle admin) — aucune policy d'écriture n'est donc ouverte via l'API.

create table if not exists destinations (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  tarif_par_kg numeric(10,2),
  actif boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);

alter table destinations enable row level security;

create policy "authenticated_read_destinations"
on destinations for select
using (auth.role() = 'authenticated');

create table if not exists parametres (
  cle text primary key,
  valeur text,
  updated_at timestamptz not null default now()
);

alter table parametres enable row level security;

create policy "authenticated_read_parametres"
on parametres for select
using (auth.role() = 'authenticated');
