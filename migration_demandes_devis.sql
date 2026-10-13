-- Demandes de devis (grands colis / professionnels) envoyées depuis le site
-- public. Les insertions passent par une action serveur (service role,
-- avec anti-spam) : aucune policy d'écriture publique n'est ouverte.
-- L'équipe connectée consulte et traite les demandes dans l'application.
create table if not exists demandes_devis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null default 'grand_colis' check (type in ('grand_colis', 'professionnel')),
  nom text not null,
  entreprise text,
  telephone text not null,
  email text,
  destination text,
  poids_estime text,
  description text not null,
  date_souhaitee date,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'en_cours', 'traitee')),
  note_interne text
);

alter table demandes_devis enable row level security;

create policy "authenticated_all_demandes_devis"
on demandes_devis for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
