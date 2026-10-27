-- Tarif spécial « produits alimentaires » par destination, et repère sur
-- chaque colis. tarif_par_kg reste le tarif « autres produits ».
alter table destinations
  add column if not exists tarif_alimentaire_par_kg numeric(8, 2);

alter table commandes
  add column if not exists alimentaire boolean not null default false;
