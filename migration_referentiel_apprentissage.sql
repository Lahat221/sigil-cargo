-- Référentiel produits : mémoire des corrections. Quand un agent corrige le
-- code HS (ou la description douane) d'un produit, l'entrée du référentiel est
-- créée / mise à jour automatiquement ; ces colonnes disent d'où vient
-- l'entrée et ce que l'IA proposait avant la correction.
alter table douane_produits_referentiel
  add column if not exists source text not null default 'manuel',
  add column if not exists nb_corrections integer not null default 0,
  add column if not exists derniere_correction_at timestamptz,
  add column if not exists ancien_hs_code text,
  add column if not exists ancienne_description_douane text;
