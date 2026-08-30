-- La base M.N a été créée séparément de SIGIL et a dérivé du schéma
-- courant sur plusieurs points (tables/colonnes ajoutées à SIGIL au fil du
-- temps, jamais reportées sur M.N). Additif pur partout, aucune donnée
-- existante affectée.

-- 1) Déjà appliqué le 30/08/2026 (colis créer/modifier) — laissé ici pour
-- mémoire, "if not exists" le rend sûr à rejouer.
alter table commandes
  add column if not exists note_vocale_url text,
  add column if not exists video_urls text[];

-- 2) profiles : colonnes utilisées par le middleware d'autorisation
-- (role/modules_autorises) et l'affichage (nom). "role" avec défaut pour ne
-- pas casser les lignes existantes ; "nom"/"modules_autorises" nullable.
alter table profiles
  add column if not exists nom text,
  add column if not exists role text not null default 'agent',
  add column if not exists modules_autorises text[];

-- Les comptes M.N existants doivent garder un accès complet (comme avant
-- l'ajout de ces colonnes, où aucune restriction ne s'appliquait) : passés
-- en admin explicitement plutôt que de dépendre du défaut 'agent'.
update profiles set role = 'admin' where role = 'agent';

-- 3) whatsapp_messages : historique des messages (notifications colis,
-- chat) — absent de M.N, "Notif colis"/"Notif retrait" et le module Chat
-- échouent à l'écriture sans cette table.
create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  telephone text not null,
  direction text not null,
  body text,
  message_sid text,
  media_url text,
  media_type text,
  created_at timestamptz not null default now()
);
alter table whatsapp_messages enable row level security;
drop policy if exists "authenticated_all" on whatsapp_messages;
create policy "authenticated_all" on whatsapp_messages for all using (auth.role() = 'authenticated');

-- 4) whatsapp_relay_state : état du webhook Twilio (relais chat) — absent
-- de M.N, utilisé par /api/twilio/whatsapp-webhook.
create table if not exists whatsapp_relay_state (
  id integer primary key default 1,
  client_telephone text,
  updated_at timestamptz not null default now()
);
alter table whatsapp_relay_state enable row level security;
drop policy if exists "authenticated_all" on whatsapp_relay_state;
create policy "authenticated_all" on whatsapp_relay_state for all using (auth.role() = 'authenticated');

-- 5) Campagnes WhatsApp : colonnes ajoutées à SIGIL après la création de la
-- base M.N — nécessaires pour l'envoi (content_sid, modèle Twilio) et le
-- suivi d'erreur par destinataire.
alter table campagnes_whatsapp
  add column if not exists content_sid text;
alter table campagnes_whatsapp_destinataires
  add column if not exists erreur text;
