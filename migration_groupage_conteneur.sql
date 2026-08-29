-- ============================================================
-- MODE DE TARIFICATION "GROUPAGE CONTENEUR" (au m³)
-- Additif pur, aucune donnée existante modifiée. Chaque projet/commande
-- garde son ancien mode de tarification par défaut ('aerien', au kg).
--
-- Le mode de fret est une propriété du PROJET (un départ/lot est soit un
-- lot fret aérien, soit un lot groupage conteneur — pas mélangé au sein
-- d'un même départ). Chaque commande copie ce mode au moment de sa
-- création (dénormalisé) : ça garde montant_total calculable localement
-- (colonne générée, ne peut pas lire une autre table) et préserve
-- l'historique exact même si le projet change de mode plus tard.
-- ============================================================

alter table projets
  add column if not exists mode_fret text not null default 'aerien'
    check (mode_fret in ('aerien', 'conteneur'));

alter table commandes
  add column if not exists mode_fret text not null default 'aerien'
    check (mode_fret in ('aerien', 'conteneur')),
  add column if not exists volume_m3 numeric(10, 3),
  add column if not exists prix_par_m3 numeric(10, 2);

-- prix_par_kg n'a de sens qu'en mode 'aerien' : une commande 'conteneur'
-- (tarifée au m³) n'a pas forcément de prix au kg.
alter table commandes alter column prix_par_kg drop not null;

-- poids_kg : en pratique, un lot groupage conteneur réel (ex. import du
-- 30/08/2026, 46 colis) n'a souvent pas de pesée individuelle — seul le CBM
-- (volume) est connu. Le poids reste utile/affiché quand il est renseigné,
-- mais n'est plus obligatoire à la création.
alter table commandes alter column poids_kg drop not null;

-- montant_total doit rester une colonne générée, mais avec une formule
-- conditionnelle selon le mode. Postgres ne permet pas d'ALTER une colonne
-- générée : on la supprime et on la recrée avec la nouvelle formule (la
-- valeur elle-même est recalculée automatiquement pour toutes les lignes
-- existantes, elles sont toutes en mode 'aerien' donc résultat identique).
alter table commandes drop column montant_total;
alter table commandes add column montant_total numeric(10, 2) generated always as (
  case
    when mode_fret = 'conteneur' then coalesce(volume_m3, 0) * coalesce(prix_par_m3, 0)
    else coalesce(poids_kg, 0) * coalesce(prix_par_kg, 0)
  end + case when enveloppe then 15 else 0 end
) stored;
