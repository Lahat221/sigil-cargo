-- ============================================================
-- Valeurs estimées par section de la déclaration douanière
-- Additif pur, aucune table existante modifiée.
-- ============================================================

create table douane_declaration_valeurs (
  id uuid primary key default gen_random_uuid(),
  projet_id uuid not null references projets(id) on delete cascade,
  section text not null,
  montant_fcfa numeric(12,0),
  updated_at timestamptz not null default now(),
  unique (projet_id, section)
);

alter table douane_declaration_valeurs enable row level security;
create policy "authenticated_all" on douane_declaration_valeurs for all using (auth.role() = 'authenticated');
