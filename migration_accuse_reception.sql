-- Accusé de réception colis — infos du livreur/déposant (peut être
-- différent du client si quelqu'un dépose le colis pour lui). Additif pur,
-- aucune donnée existante affectée.
alter table commandes
  add column if not exists livreur_nom text,
  add column if not exists livreur_telephone text,
  -- Souvent pas le temps de vérifier le contenu au moment du dépôt — coché
  -- par défaut à faux, peut être marqué vrai plus tard (formulaire
  -- d'édition ou bouton rapide sur l'accusé de réception lui-même).
  add column if not exists contenu_verifie boolean not null default false;
