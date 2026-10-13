-- Témoignages clients : nouveau type d'élément dans le module Publicités
-- (nom du client = titre, avis = texte). Affichés sur le site public.
alter table publicites
  add column if not exists texte text;

alter table publicites
  drop constraint if exists publicites_type_check;

alter table publicites
  add constraint publicites_type_check
  check (type in ('affiche_depart', 'publicite', 'reseau_social', 'temoignage'));
