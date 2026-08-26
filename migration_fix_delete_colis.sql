-- ============================================================
-- FIX : suppression d'un colis impossible si un module douane
-- a déjà traité la commande (violation de clé étrangère).
--
-- douane_extractions.commande_id et douane_logs.commande_id
-- référençaient commandes(id) sans ON DELETE CASCADE.
-- Ce script aligne le schéma de la base Supabase existante.
-- (Le code applicatif purge déjà ces lignes avant suppression,
-- ce script est un alignement de schéma, pas un correctif requis
-- pour que la suppression fonctionne.)
-- ============================================================

alter table douane_extractions
  drop constraint if exists douane_extractions_commande_id_fkey,
  add constraint douane_extractions_commande_id_fkey
    foreign key (commande_id) references commandes(id) on delete cascade;

alter table douane_logs
  drop constraint if exists douane_logs_commande_id_fkey,
  add constraint douane_logs_commande_id_fkey
    foreign key (commande_id) references commandes(id) on delete cascade;
