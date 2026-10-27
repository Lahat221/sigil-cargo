-- Colis mixte : un même colis peut contenir des produits alimentaires ET d'autres
-- produits, chaque part étant facturée à son tarif (SIGIL CARGO uniquement,
-- M.N n'a pas de tarif alimentaire).
--
-- poids_kg reste le poids TOTAL du colis ; poids_alimentaire_kg en est la part
-- alimentaire (prix_alimentaire_par_kg), le reste est facturé à prix_par_kg.
-- Sans part alimentaire, le montant est inchangé (poids_kg * prix_par_kg).

alter table commandes add column if not exists poids_alimentaire_kg numeric(10, 2);
alter table commandes add column if not exists prix_alimentaire_par_kg numeric(10, 2);

-- montant_total est une colonne générée : il faut la recréer pour changer sa formule.
alter table commandes drop column montant_total;
alter table commandes add column montant_total numeric(10, 2) generated always as (
  case
    when mode_fret = 'conteneur' then coalesce(volume_m3, 0) * coalesce(prix_par_m3, 0)
    else (coalesce(poids_kg, 0) - coalesce(poids_alimentaire_kg, 0)) * coalesce(prix_par_kg, 0)
         + coalesce(poids_alimentaire_kg, 0) * coalesce(prix_alimentaire_par_kg, prix_par_kg, 0)
  end + case when enveloppe then 15 else 0 end
) stored;
