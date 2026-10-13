-- Agent IA WhatsApp : marquage des messages envoyes par l'IA et pause par
-- conversation (l'IA se tait quand un humain reprend la main). Les ecritures
-- passent par des actions serveur (service role) : seule la lecture est
-- ouverte aux utilisateurs connectes.
alter table whatsapp_messages
  add column if not exists source text;

create table if not exists whatsapp_ia_pause (
  telephone text primary key,
  pause_jusqu_a timestamptz not null,
  motif text,
  updated_at timestamptz not null default now()
);

alter table whatsapp_ia_pause enable row level security;

create policy "authenticated_read_whatsapp_ia_pause"
on whatsapp_ia_pause for select
using (auth.role() = 'authenticated');
