-- Paiements par colis : acompte(s) à l'enregistrement, solde au retrait.
-- Chaque versement garde sa devise d'origine (EUR ou XOF/FCFA) ; montant_base
-- est sa conversion dans la devise de l'entreprise (parité fixe 1 EUR =
-- 655,957 XOF), ce qui permet de calculer le reste à payer sans ambiguïté.
create table if not exists paiements (
  id uuid primary key default gen_random_uuid(),
  commande_id uuid not null references commandes(id) on delete cascade,
  created_at timestamptz not null default now(),
  montant numeric(14, 2) not null check (montant > 0),
  devise text not null check (devise in ('EUR', 'XOF')),
  montant_base numeric(14, 2) not null check (montant_base > 0),
  mode text not null default 'especes',
  note text
);

create index if not exists paiements_commande_id_idx on paiements (commande_id);

alter table paiements enable row level security;

create policy "authenticated_all_paiements"
on paiements for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
